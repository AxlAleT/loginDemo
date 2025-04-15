const csrfToken = $("meta[name='_csrf']").attr("content");
const csrfHeader = $("meta[name='_csrf_header']").attr("content");

$(document).ready(function () {
    // Global variables for pagination
    let allResults = [];
    let currentPage = 1;
    const resultsPerPage = 10;
    let activeFilters = {
        sortBy: 'relevance' // Default sort option
    };

    // Configure CSRF header for all AJAX requests
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (csrfHeader && csrfToken) {
                xhr.setRequestHeader(csrfHeader, csrfToken);
            }
        }
    });

    // Search events
    $('#basicSearchBtn').click(function () {
        const query = $('#basicQuery').val().trim();
        if (query) {
            resetPagination();
            performSearch(query);
        }
    });

    // Reset pagination when starting a new search
    function resetPagination() {
        allResults = [];
        currentPage = 1;
        // Keep the current sort option when resetting pagination
    }

    // Also search when pressing Enter in search fields
    $('#basicQuery').keypress(function (e) {
        if (e.which === 13) {
            $('#basicSearchBtn').click();
        }
    });

    // Load history when switching to the tab
    $('#history-tab').on('shown.bs.tab', function () {
        loadSearchHistory();
    });

    // Add sort event listeners for dropdown options
    $('.sort-option').click(function () {
        activeFilters.sortBy = $(this).data('sort');

        // Update the dropdown button text to show selected sort
        $('#sortOptionsDropdown').text('Sort by: ' + $(this).text());

        // Re-display results with new sorting
        currentPage = 1;
        displayResultsWithPagination();
    });

    // Function to perform search
    function performSearch(query) {
        // Show loading indicator
        $('#loader').show();
        $('#searchResults').empty();
        $('#resultsPagination').empty();

        const endpoint = '/api/search';
        const payload = {query: query};

        $.ajax({
            url: endpoint,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                // Store all results for pagination
                allResults = response.articles || [];
                displayResultsWithPagination();
            },
            error: function (error) {
                $('#searchResults').html(`
                    <div class="alert panel-alert-danger">
                        An error occurred while performing the search. Please try again.
                    </div>
                `);
                console.error('Search error:', error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }

    // Function to filter and sort results based on active filters
    function getFilteredResults() {
        let filtered = [...allResults];

        // Apply sorting
        if (activeFilters.sortBy) {
            switch (activeFilters.sortBy) {
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

    // Function to display results with pagination
    function displayResultsWithPagination() {
        const filteredResults = getFilteredResults();
        const totalResults = filteredResults.length;
        const totalPages = Math.ceil(totalResults / resultsPerPage);

        // Calculate range for current page
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, totalResults);
        const currentResults = filteredResults.slice(startIndex, endIndex);

        // Display results
        displayResults(currentResults, startIndex + 1, endIndex, totalResults);

        // Generate pagination
        generatePagination(totalPages);
    }

    // Function to generate pagination controls
    function generatePagination(totalPages) {
        if (totalPages <= 1) {
            $('#resultsPagination').empty();
            return;
        }

        let paginationHtml = '<nav aria-label="Search results pagination"><ul class="pagination justify-content-center">';

        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Generate page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
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
                <li class="page-item ${i === currentPage ? 'active' : ''}">
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
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationHtml += '</ul></nav>';

        $('#resultsPagination').html(paginationHtml);

        // Add event listeners for pagination links
        $('.page-link').click(function (e) {
            e.preventDefault();
            const page = $(this).data('page');
            if (page && page !== currentPage) {
                currentPage = page;
                displayResultsWithPagination();
                // Scroll back to top of results
                $('html, body').animate({
                    scrollTop: $("#searchResults").offset().top - 20
                }, 200);
            }
        });
    }

    // Function to display results
    function displayResults(articles, startCount, endCount, totalCount) {
        if (!articles || articles.length === 0) {
            $('#searchResults').html(`
                <div class="alert panel-alert-danger">
                    No results found for your search.
                </div>
            `);
            return;
        }

        let resultsHtml = `
            <div class="results-header mb-3">
                <h4>Showing ${startCount} to ${endCount} of ${totalCount} results</h4>
            </div>
            <div class="row" id="resultsContainer">
        `;

        // Use efficient DOM manipulation by creating fewer elements
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

            // Build article card with lazy-loading for abstracts
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

        // Add event to view details
        $('.view-details').click(function () {
            const articleId = $(this).data('id');
            loadArticleDetails(articleId);
        });
    }

    // Function to load article details
    function loadArticleDetails(articleId) {
        $('#loader').show();

        $.ajax({
            url: `/api/search/article/${articleId}`, method: 'GET', success: function (article) {
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
            }, error: function (error) {
                console.error('Error loading article details:', error);
                alert('Could not load article details.');
            }, complete: function () {
                $('#loader').hide();
            }
        });
    }

    function loadSearchHistory() {
        $.ajax({
            url: '/api/search/history',
            method: 'GET',
            success: function (history) {
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
                    const query = item.searchQuery; // changed from item.query
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
                $('.repeat-search').click(function () {
                    const query = $(this).data('query');
                    $('#basic-tab').tab('show');
                    $('#basicQuery').val(query);
                    setTimeout(() => $('#basicSearchBtn').click(), 300);
                });
            },
            error: function (err) {
                $('#searchHistoryContent').html(`
                <div class="alert panel-alert-danger">Error loading search history.</div>
            `);
                console.error('Error loading history:', err);
            }
        });
    }

});