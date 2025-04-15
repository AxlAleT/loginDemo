const csrfToken = $("meta[name='_csrf']").attr("content");
const csrfHeader = $("meta[name='_csrf_header']").attr("content");

$(document).ready(function () {
    // Configure CSRF header for all AJAX requests
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (csrfHeader && csrfToken) {
                xhr.setRequestHeader(csrfHeader, csrfToken);
            }
        }
    });

    // Initialize the search state machine
    const searchApp = new SearchStateMachine();
    searchApp.init();
});

/**
 * Search State Machine
 * Manages the different states of the search application
 */
class SearchStateMachine {
    constructor() {
        // Application state
        this.state = 'initial';
        
        // Data state
        this.allResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 10;
        this.activeFilters = {
            sortBy: 'relevance'
        };
        
        // State definitions
        this.states = {
            initial: {
                enter: () => this.handleInitialState(),
                exit: () => {}
            },
            searching: {
                enter: (query) => this.handleSearchingState(query),
                exit: () => $('#loader').hide()
            },
            results: {
                enter: () => this.handleResultsState(),
                exit: () => {
                    // Hide results content when exiting this state
                    $('#searchResultsContainer').hide();
                }
            },
            noResults: {
                enter: () => this.handleNoResultsState(),
                exit: () => {
                    // Hide no results message when exiting this state
                    $('#searchResultsContainer').hide();
                }
            },
            error: {
                enter: (errorMsg) => this.handleErrorState(errorMsg),
                exit: () => {
                    // Hide error message when exiting this state
                    $('#searchResultsContainer').hide();
                }
            },
            viewingArticle: {
                enter: (articleId) => this.handleViewingArticleState(articleId),
                exit: () => $('#articleModal').modal('hide')
            },
            viewingHistory: {
                enter: () => this.handleViewingHistoryState(),
                exit: () => {
                    // Hide history content when exiting this state
                    $('#searchHistoryContainer').hide();
                    $('#searchResultsContainer').hide();
                }
            }
        };
    }

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.transition('initial');
    }

    // Set up event listeners
    setupEventListeners() {
        // Search events
        $('#basicSearchBtn').click(() => {
            const query = $('#basicQuery').val().trim();
            if (query) {
                this.resetPagination();
                this.transition('searching', query);
            }
        });

        // Search on Enter key
        $('#basicQuery').keypress((e) => {
            if (e.which === 13) {
                $('#basicSearchBtn').click();
            }
        });

        // Load history when switching to the tab
        $('#history-tab').on('shown.bs.tab', () => {
            this.transition('viewingHistory');
        });

        // Sort options
        $(document).on('click', '.sort-option', (e) => {
            this.activeFilters.sortBy = $(e.currentTarget).data('sort');

            // Update the dropdown button text
            $('#sortOptionsDropdown').text('Sort by: ' + $(e.currentTarget).text());

            // Reset to first page and refresh results
            this.currentPage = 1;
            this.transition('results');
        });

        // Pagination clicks
        $(document).on('click', '.page-link', (e) => {
            e.preventDefault();
            const page = $(e.currentTarget).data('page');
            if (page && page !== this.currentPage) {
                this.currentPage = page;
                this.transition('results');
                // Scroll back to top of results
                $('html, body').animate({
                    scrollTop: $("#searchResults").offset().top - 20
                }, 200);
            }
        });

        // View article details
        $(document).on('click', '.view-details', (e) => {
            const articleId = $(e.currentTarget).data('id');
            this.transition('viewingArticle', articleId);
        });

        // Repeat search from history
        $(document).on('click', '.repeat-search', (e) => {
            const query = $(e.currentTarget).data('query');
            $('#basic-tab').tab('show');
            $('#basicQuery').val(query);
            setTimeout(() => $('#basicSearchBtn').click(), 300);
        });
    }

    // State transition
    transition(newState, ...args) {
        // Execute exit action for current state
        this.states[this.state].exit();

        // Update state
        this.state = newState;

        // Execute enter action for new state with arguments
        this.states[this.state].enter(...args);
    }

    // Reset pagination when starting a new search
    resetPagination() {
        this.allResults = [];
        this.currentPage = 1;
        // Keep the current sort option
    }

    // STATE HANDLERS

    // Initial state handler
    handleInitialState() {
        $('#searchResults').empty();
        $('#resultsPagination').empty();
        // Make sure search tab content is visible initially
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();
    }

    // Searching state handler
    handleSearchingState(query) {
        // Show loading indicator
        $('#loader').show();
        $('#searchResults').empty();
        $('#resultsPagination').empty();

        // Make sure search tab content is visible
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
                // Store all results for pagination
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

    // Results state handler
    handleResultsState() {
        // Make sure search tab content is visible
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        const filteredResults = this.getFilteredResults();
        const totalResults = filteredResults.length;
        const totalPages = Math.ceil(totalResults / this.resultsPerPage);

        // Calculate range for current page
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = Math.min(startIndex + this.resultsPerPage, totalResults);
        const currentResults = filteredResults.slice(startIndex, endIndex);

        // Display results
        this.displayResults(currentResults, startIndex + 1, endIndex, totalResults);

        // Generate pagination
        this.generatePagination(totalPages);
    }

    // No results state handler
    handleNoResultsState() {
        // Make sure search tab content is visible
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        $('#searchResults').html(`
            <div class="alert panel-alert-danger">
                No results found for your search.
            </div>
        `);
        $('#resultsPagination').empty();
    }

    // Error state handler
    handleErrorState(errorMsg) {
        // Make sure search tab content is visible
        $('#searchResultsContainer').show();
        $('#searchHistoryContainer').hide();

        $('#searchResults').html(`
            <div class="alert panel-alert-danger">
                ${errorMsg}
            </div>
        `);
        $('#resultsPagination').empty();
    }

    // Viewing article state handler
    handleViewingArticleState(articleId) {
        $('#loader').show();

        $.ajax({
            url: `/api/search/article/${articleId}`,
            method: 'GET',
            success: (article) => {
                // Build HTML for article details
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

                // Display details in the modal
                $('#articleDetails').html(detailsHtml);

                // Set link to view full article
                if (article.url) {
                    $('#viewFullArticle').attr('href', article.url).show();
                } else {
                    $('#viewFullArticle').hide();
                }

                // Show modal
                $('#articleModal').modal('show');
                $('#loader').hide();
            },
            error: (error) => {
                console.error('Error loading article details:', error);
                alert('Could not load article details.');
                $('#loader').hide();
                this.transition('results');
            }
        });
    }

    // History state handler
    handleViewingHistoryState() {
        // Show history container and hide search results
        $('#searchHistoryContainer').show();
        $('#searchResultsContainer').hide();

        $.ajax({
            url: '/api/search/history',
            method: 'GET',
            success: (history) => {
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
            },
            error: (err) => {
                $('#searchHistoryContent').html(`
                    <div class="alert panel-alert-danger">Error loading search history.</div>
                `);
                console.error('Error loading history:', err);
            }
        });
    }

    // UTILITY METHODS

    // Filter and sort results based on active filters
    getFilteredResults() {
        let filtered = [...this.allResults];

        // Apply sorting
        if (this.activeFilters.sortBy) {
            switch (this.activeFilters.sortBy) {
                case 'citations':
                    filtered.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
                    break;
                case 'year':
                    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
                    break;
                // 'relevance' is default, already sorted from API
            }
        }

        return filtered;
    }

    // Display results
    displayResults(articles, startCount, endCount, totalCount) {
        let resultsHtml = `
            <div class="results-header mb-3">
                <h4>Showing ${startCount} to ${endCount} of ${totalCount} results</h4>
            </div>
            <div class="row" id="resultsContainer">
        `;

        articles.forEach(article => {
            // Prepare author list for display
            let authorsHtml = '';
            if (article.authors && article.authors.length > 0) {
                article.authors.slice(0, 3).forEach(author => {
                    authorsHtml += `<span class="author-chip">${author}</span>`;
                });

                if (article.authors.length > 3) {
                    authorsHtml += `<span class="author-chip">+${article.authors.length - 3} more</span>`;
                }
            }

            // Build article card
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
                            <button class="btn panel-btn btn-sm view-details" data-id="${article.id}">View Details</button>
                        </div>
                    </div>
                </div>
            `;
        });

        resultsHtml += '</div>';
        $('#searchResults').html(resultsHtml);
    }

    // Generate pagination controls
    generatePagination(totalPages) {
        if (totalPages <= 1) {
            $('#resultsPagination').empty();
            return;
        }

        let paginationHtml = '<nav aria-label="Search results pagination"><ul class="pagination justify-content-center">';

        // Previous button
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Generate page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust if we're at the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page and ellipsis if needed
        if (startPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationHtml += '</ul></nav>';
        $('#resultsPagination').html(paginationHtml);
    }
}
