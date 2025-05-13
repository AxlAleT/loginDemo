const csrfToken = $("meta[name='_csrf']").attr("content");
const csrfHeader = $("meta[name='_csrf_header']").attr("content");

$(document).ready(function () {
   
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (csrfHeader && csrfToken) {
                xhr.setRequestHeader(csrfHeader, csrfToken);
            }
        }
    });

   
    const searchApp = new SearchStateMachine();
    searchApp.init();

   
    $('#basic-tab').on('shown.bs.tab', function() {
        $('#searchHistoryContainer').hide();
        $('#searchResultsContainer').show();
    });

    $('#history-tab').on('shown.bs.tab', function() {
        $('#searchResultsContainer').hide();
        $('#searchHistoryContainer').show();
    });
});

/**
 * Search State Machine
 * Manages the different states of the search application
 */
class SearchStateMachine {
    constructor() {
       
        this.state = 'initial';

       
        this.allResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 10;
        this.activeFilters = {
            sortBy: 'relevance'
        };

       
        this.historyType = 'search';

       
        this.currentArticle = null;
        this.isFavorite = false;

       
        this.states = {
            initial: {
                enter: () => this.handleInitialState(), exit: () => {
                }
            }, searching: {
                enter: (query) => this.handleSearchingState(query), exit: () => $('#loader').hide()
            }, results: {
                enter: () => this.handleResultsState(), exit: () => {
                   
                    $('#searchResultsContainer').hide();
                }
            }, noResults: {
                enter: () => this.handleNoResultsState(), exit: () => {
                   
                    $('#searchResultsContainer').hide();
                }
            }, error: {
                enter: (errorMsg) => this.handleErrorState(errorMsg), exit: () => {
                   
                    $('#searchResultsContainer').hide();
                }
            }, viewingArticle: {
                enter: (articleId, title) => this.handleViewingArticleState(articleId, title),
                exit: () => this.exitArticle()
            }, viewingHistory: {
                enter: (historyType) => this.handleViewingHistoryState(historyType), exit: () => {
                   
                    $('#searchHistoryContainer').hide();
                    $('#searchResultsContainer').hide();
                }
            }
        };
    }

    exitArticle(){
        $('#articleModal').modal('hide');
        $('#searchResultsContainer').show();
    }
   
    init() {
        this.setupEventListeners();
        this.transition('initial');
    }

   
    setupEventListeners() {
       
        $('#basicSearchBtn').click(() => {
            const query = $('#basicQuery').val().trim();
            if (query) {
                this.resetPagination();
                this.transition('searching', query);
            }
        });

       
        $('#basicQuery').keypress((e) => {
            if (e.which === 13) {
                $('#basicSearchBtn').click();
            }
        });

       
        $('#history-tab').on('shown.bs.tab', () => {
            $('#searchResultsContainer').hide();
            $('#searchHistoryContainer').show();
            this.transition('viewingHistory', 'search');
        });

       
        $('#search-history-tab').on('shown.bs.tab', () => {
            this.loadSearchHistory();
        });

        $('#article-history-tab').on('shown.bs.tab', () => {
            this.loadArticleHistory();
        });

        $('#favorites-tab').on('shown.bs.tab', () => {
            this.loadFavorites();
        });

        // Add event handler for modal close to ensure results are shown again
        $('#articleModal').on('hidden.bs.modal', () => {
            if (this.state === 'viewingArticle') {
                this.transition('results');
            }
        });
       
        $(document).on('click', '.sort-option', (e) => {
            this.activeFilters.sortBy = $(e.currentTarget).data('sort');

           
            $('#sortOptionsDropdown').text('Sort by: ' + $(e.currentTarget).text());

           
            this.currentPage = 1;
            this.transition('results');
        });

       
        $(document).on('click', '.page-link', (e) => {
            e.preventDefault();
            const page = $(e.currentTarget).data('page');
            if (page && page !== this.currentPage) {
                this.currentPage = page;
                this.transition('results');
               
                $('html, body').animate({
                    scrollTop: $("#searchResults").offset().top - 20
                }, 200);
            }
        });

       
        $(document).on('click', '.view-details', (e) => {
            const articleId = $(e.currentTarget).data('id');
            const title = $(e.currentTarget).data('title');
            this.transition('viewingArticle', articleId, title);
        });

       
        $(document).on('click', '.repeat-search', (e) => {
            const query = $(e.currentTarget).data('query');
            $('#basic-tab').tab('show');
            $('#basicQuery').val(query);
            setTimeout(() => $('#basicSearchBtn').click(), 300);
        });

       
        $('#favoriteButton').on('click', () => {
            if (!this.currentArticle) return;

            if (this.isFavorite) {
                this.removeFromFavorites();
            } else {
                this.addToFavorites();
            }
        });
    }

   
    checkFavoriteStatus(articleId) {
        $('#loader').show();

        $.ajax({
            url: `/api/search/favorite/check/${articleId}`,
            method: 'GET',
            success: (response) => {
                this.isFavorite = response.isFavorite;
                this.updateFavoriteButtonUI();
                $('#loader').hide();
            },
            error: (error) => {
                console.error('Error checking favorite status:', error);
               
                this.isFavorite = false;
                this.updateFavoriteButtonUI();
                $('#loader').hide();
            }
        });
    }

   
    updateFavoriteButtonUI() {
        const $button = $('#favoriteButton');

        if (this.isFavorite) {
            $button.html('<i class="mdi mdi-heart"></i> Remove from Favorites');
            $button.removeClass('panel-action-secondary').addClass('panel-action-danger');
        } else {
            $button.html('<i class="mdi mdi-heart-outline"></i> Add to Favorites');
            $button.removeClass('panel-action-danger').addClass('panel-action-secondary');
        }
    }

   
    addToFavorites() {
        if (!this.currentArticle) return;

        $('#loader').show();

        const payload = {
            articleId: this.currentArticle.id,
            title: this.currentArticle.title
        };

        $.ajax({
            url: '/api/search/favorite',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: (response) => {
                this.isFavorite = true;
                this.updateFavoriteButtonUI();
                $('#loader').hide();
            },
            error: (error) => {
                console.error('Error adding to favorites:', error);
                $('#loader').hide();
                alert('Failed to add article to favorites. Please try again.');
            }
        });
    }

   
    removeFromFavorites() {
        if (!this.currentArticle) return;

        $('#loader').show();

        $.ajax({
            url: `/api/search/favorite/${this.currentArticle.id}`,
            method: 'DELETE',
            success: (response) => {
                this.isFavorite = false;
                this.updateFavoriteButtonUI();
                $('#loader').hide();
            },
            error: (error) => {
                console.error('Error removing from favorites:', error);
                $('#loader').hide();
                alert('Failed to remove article from favorites. Please try again.');
            }
        });
    }

   
    removeFromFavoritesList(articleId) {
        if (!articleId) return;

        $('#loader').show();

        $.ajax({
            url: `/api/search/favorite/${articleId}`,
            method: 'DELETE',
            success: (response) => {
                $('#loader').hide();
               
                this.loadFavorites();
            },
            error: (error) => {
                console.error('Error removing from favorites:', error);
                $('#loader').hide();
                alert('Failed to remove article from favorites. Please try again.');
            }
        });
    }

   
    transition(newState, ...args) {
       
        this.states[this.state].exit();

       
        this.state = newState;

       
        this.states[this.state].enter(...args);
    }

   
    resetPagination() {
        this.allResults = [];
        this.currentPage = 1;
       
    }

   

   
    handleInitialState() {
        $('#searchResults').empty();
        $('#resultsPagination').empty();
       
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();
    }

   
    handleSearchingState(query) {
       
        $('#loader').show();
        $('#searchResults').empty();
        $('#resultsPagination').empty();

       
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        const endpoint = '/api/search';
        const payload = {query: query};

        $.ajax({
            url: endpoint,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: (response) => {
               
                this.allResults = response.articles || [];

                if (this.allResults.length > 0) {
                    this.transition('results');
                } else {
                    this.transition('noResults');
                }
            },
            error: (error) => {
                this.transition('error', 'An error occurred while performing the search. Please try again.');
                console.error('Search error:', error);
            }
        });
    }

   
    handleResultsState() {
       
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        const filteredResults = this.getFilteredResults();
        const totalResults = filteredResults.length;
        const totalPages = Math.ceil(totalResults / this.resultsPerPage);

       
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = Math.min(startIndex + this.resultsPerPage, totalResults);
        const currentResults = filteredResults.slice(startIndex, endIndex);

       
        this.displayResults(currentResults, startIndex + 1, endIndex, totalResults);

       
        this.generatePagination(totalPages);
    }

   
    handleNoResultsState() {
       
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        $('#searchResults').html(`
            <div class="alert panel-alert-danger">
                No results found for your search.
            </div>
        `);
        $('#resultsPagination').empty();
    }

   
    handleErrorState(errorMsg) {
       
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        $('#searchResults').html(`
            <div class="alert panel-alert-danger">
                ${errorMsg}
            </div>
        `);
        $('#resultsPagination').empty();
    }

   
    handleViewingArticleState(articleId, title) {
        $('#loader').show();

        $.ajax({
            url: `/api/search/article/${articleId}?title=${encodeURIComponent(title)}`,
            method: 'GET',
            success: (article) => {
               
                this.currentArticle = article;

               
                this.checkFavoriteStatus(articleId);

               
                let detailsHtml = `
                    <h4>${article.title}</h4>
                    <div class="my-3">
                        <strong>Authors:</strong><br>
                `;

                if (article.authors && article.authors.length > 0) {
                    article.authors.forEach(author => {
                        detailsHtml += `<span class="author-chip">${author}</span>`;
                    });
                } else {
                    detailsHtml += '<span>Not available</span>';
                }

                detailsHtml += `
                    </div>
                    <div class="my-3">
                        <strong>Year:</strong> ${article.year || 'Not available'}<br>
                        <strong>Citations:</strong> ${article.citationCount || 0}<br>
                        <strong>DOI:</strong> ${article.doi || 'Not available'}<br>
                        <strong>Journal:</strong> ${article.venue || 'Not available'}
                    </div>
                    <div class="my-3">
                        <strong>Abstract:</strong>
                        <p>${article.abstract || 'No abstract available for this article.'}</p>
                    </div>
                `;

                if (article.keywords && article.keywords.length > 0) {
                    detailsHtml += `
                        <div class="my-3">
                            <strong>Keywords:</strong><br>
                    `;

                    article.keywords.forEach(keyword => {
                        detailsHtml += `<span class="author-chip">${keyword}</span>`;
                    });

                    detailsHtml += '</div>';
                }

               
                $('#articleDetails').html(detailsHtml);

               
                if (article.url) {
                    $('#viewFullArticle').attr('href', article.url).show();
                } else {
                    $('#viewFullArticle').hide();
                }

               
                $('#articleModal').modal('show');
                $('#loader').hide();
            }, error: (error) => {
                console.error('Error loading article details:', error);
                alert('Could not load article details.');
                $('#loader').hide();
                this.transition('results');
            }
        });
    }

   
    handleViewingHistoryState(historyType = 'search') {
       
        $('#searchHistoryContainer').show();
        $('#searchResultsContainer').hide();

       
        if (historyType === 'article') {
            $('#article-history-tab').tab('show');
        } else if (historyType === 'favorites') {
            $('#favorites-tab').tab('show');
        } else {
            $('#search-history-tab').tab('show');
        }

       
        if (historyType === 'article') {
            this.loadArticleHistory();
        } else if (historyType === 'favorites') {
            this.loadFavorites();
        } else {
            this.loadSearchHistory();
        }
    }

   
    loadSearchHistory() {
        $.ajax({
            url: '/api/search/history', method: 'GET', success: (history) => {
                if (!history || history.length === 0) {
                    $('#searchHistoryContent').html(`
                        <div class="alert panel-alert-secondary">No recent searches in your history.</div>
                    `);
                    return;
                }

                let historyHtml = `
                    <table class="panel-table">
                        <thead>
                            <tr>
                                <th>Query</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                history.forEach(item => {
                    const date = new Date(item.searchDate).toLocaleString();
                    const query = item.searchQuery;
                    historyHtml += `
                        <tr>
                            <td>${query}</td>
                            <td>${date}</td>
                            <td>
                                <button class="btn panel-action-btn panel-action-primary repeat-search" data-query="${query}">
                                    Repeat
                                </button>
                            </td>
                        </tr>
                    `;
                });

                historyHtml += `</tbody></table>`;
                $('#searchHistoryContent').html(historyHtml);
            }, error: (err) => {
                $('#searchHistoryContent').html(`
                    <div class="alert panel-alert-danger">Error loading search history.</div>
                `);
                console.error('Error loading history:', err);
            }
        });
    }

   
    loadArticleHistory() {
        $.ajax({
            url: '/api/search/article-history', method: 'GET', success: (history) => {
                if (!history || history.length === 0) {
                    $('#articleHistoryContent').html(`
                        <div class="alert panel-alert-secondary">No recent article views in your history.</div>
                    `);
                    return;
                }

                let historyHtml = `
                    <table class="panel-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Viewed On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                history.forEach(item => {
                    const date = new Date(item.viewDate).toLocaleString();
                    const articleId = item.articleId;
                    const articleTitle = item.title;
                    historyHtml += `
                        <tr>
                            <td>${articleTitle}</td>
                            <td>${date}</td>
                            <td>
                                <button class="btn panel-action-btn panel-action-primary view-details" data-id="${articleId}" data-title="${articleTitle}">
                                    View Again
                                </button>
                            </td>
                        </tr>
                    `;
                });

                historyHtml += `</tbody></table>`;
                $('#articleHistoryContent').html(historyHtml);
            }, error: (err) => {
                $('#articleHistoryContent').html(`
                    <div class="alert panel-alert-danger">Error loading article view history.</div>
                `);
                console.error('Error loading article history:', err);
            }
        });
    }

   
    loadFavorites() {
        $.ajax({
            url: '/api/search/favorite',
            method: 'GET',
            success: (response) => {
                const favorites = response.articles || [];

                if (favorites.length === 0) {
                    $('#favoritesContent').html(`
                        <div class="alert panel-alert-secondary">You haven't added any articles to your favorites yet.</div>
                    `);
                    return;
                }

                let favoritesHtml = `
                    <table class="panel-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                favorites.forEach(article => {
                    favoritesHtml += `
                        <tr>
                            <td>${article.title}</td>
                            <td>
                                <button class="btn panel-action-btn panel-action-primary view-details" 
                                    data-id="${article.id}" data-title="${article.title}">
                                    View Details
                                </button>
                                <button class="btn panel-action-btn panel-action-danger remove-favorite" 
                                    data-id="${article.id}">
                                    <i class="mdi mdi-heart-off"></i> Remove
                                </button>
                            </td>
                        </tr>
                    `;
                });

                favoritesHtml += `</tbody></table>`;
                $('#favoritesContent').html(favoritesHtml);

               
                $('.remove-favorite').on('click', (e) => {
                    const articleId = $(e.currentTarget).data('id');
                    this.removeFromFavoritesList(articleId);
                });
            },
            error: (err) => {
                $('#favoritesContent').html(`
                    <div class="alert panel-alert-danger">Error loading favorites.</div>
                `);
                console.error('Error loading favorites:', err);
            }
        });
    }

   

   
    getFilteredResults() {
        let filtered = [...this.allResults];

       
        if (this.activeFilters.sortBy) {
            switch (this.activeFilters.sortBy) {
                case 'citations':
                    filtered.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
                    break;
                case 'year':
                    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
                    break;
               
            }
        }

        return filtered;
    }

   
    displayResults(articles, startCount, endCount, totalCount) {
        let resultsHtml = `
            <div class="results-header mb-3">
                <h4>Showing ${startCount} to ${endCount} of ${totalCount} results</h4>
            </div>
            <div class="row" id="resultsContainer">
        `;

        articles.forEach(article => {
           
            let authorsHtml = '';
            if (article.authors && article.authors.length > 0) {
                article.authors.slice(0, 3).forEach(author => {
                    authorsHtml += `<span class="author-chip">${author}</span>`;
                });

                if (article.authors.length > 3) {
                    authorsHtml += `<span class="author-chip">+${article.authors.length - 3} more</span>`;
                }
            }

           
            resultsHtml += `
                <div class="col-md-6 mb-4">
                    <div class="panel-card article-card" data-id="${article.id}">
                        <div class="card-body">
                            <h5 class="card-title">${article.title}</h5>
                            <div class="mb-2">
                                ${authorsHtml}
                            </div>
                            <div class="mb-2">
                                <span class="badge badge-year">${article.year || 'N/A'}</span>
                                <span class="badge badge-citations">${article.citationCount || 0} citations</span>
                            </div>
                            <p class="article-abstract">${article.abstract || 'No abstract available for this article.'}</p>
                            <button class="btn panel-btn btn-sm view-details" data-id="${article.id}" data-title="${article.title}">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        resultsHtml += '</div>';
        $('#searchResults').html(resultsHtml);
    }

   
    generatePagination(totalPages) {
        if (totalPages <= 1) {
            $('#resultsPagination').empty();
            return;
        }

        let paginationHtml = '<nav aria-label="Search results pagination"><ul class="pagination justify-content-center">';

       
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

       
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

       
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

       
        if (startPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

       
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

       
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

       
        paginationHtml += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a aria-label="Next" class="page-link" data-page="${this.currentPage + 1}" href="#">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationHtml += '</ul></nav>';
        $('#resultsPagination').html(paginationHtml);
    }
}

