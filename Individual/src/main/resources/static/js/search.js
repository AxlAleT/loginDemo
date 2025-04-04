const csrfToken = $("meta[name='_csrf']").attr("content");
const csrfHeader = $("meta[name='_csrf_header']").attr("content");

$(document).ready(function () {
    // Global variables for pagination
    let allResults = [];
    let currentPage = 1;
    const resultsPerPage = 10;
    let activeFilters = {};

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
            performSearch(query, false);
        }
    });

    $('#advancedSearchBtn').click(function () {
        resetPagination();
        performAdvancedSearch();
    });

    // Reset pagination when starting a new search
    function resetPagination() {
        allResults = [];
        currentPage = 1;
        activeFilters = {};
    }

    // Also search when pressing Enter in search fields
    $('#basicQuery').keypress(function (e) {
        if (e.which === 13) {
            $('#basicSearchBtn').click();
        }
    });

    // Add event listener for advanced search fields
    $('#advancedQuery').keypress(function (e) {
        if (e.which === 13) {
            $('#advancedSearchBtn').click();
        }
    });

    // Load history when switching to the tab
    $('#history-tab').on('shown.bs.tab', function () {
        loadSearchHistory();
    });

    // Function to perform basic search
    function performSearch(query, isAdvanced = false) {
        // Show loading indicator
        $('#loader').show();
        $('#searchResults').empty();
        $('#resultsPagination').empty();
        $('#resultsFilterOptions').hide();

        const endpoint = isAdvanced ? '/api/search/advanced' : '/api/search';
        const payload = {query: query};

        // For advanced searches, add additional filters
        if (isAdvanced) {
            const authors = $('#authors').val();
            const yearFrom = $('#yearFrom').val();
            const yearTo = $('#yearTo').val();
            const sort = $('#sort').val();

            if (authors) payload.authors = authors;
            if (yearFrom) payload.yearFrom = parseInt(yearFrom);
            if (yearTo) payload.yearTo = parseInt(yearTo);
            if (sort) payload.sort = sort;
        }

        $.ajax({
            url: endpoint,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                // Store all results for pagination
                allResults = response.articles || [];
                displayResultsWithPagination();

                // Show filters if we have results
                if (allResults.length > 0) {
                    generateFilterOptions();
                    $('#resultsFilterOptions').show();
                }
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

    // Function to perform advanced search
    function performAdvancedSearch() {
        const query = $('#advancedQuery').val().trim();
        if (query) {
            performSearch(query, true);
        }
    }

    // Function to generate filter options based on current results
    function generateFilterOptions() {
        // Extract years and top authors from results
        const years = new Set();
        const authorsCount = {};

        allResults.forEach(article => {
            if (article.year) years.add(article.year);

            if (article.authors && article.authors.length > 0) {
                article.authors.forEach(author => {
                    authorsCount[author] = (authorsCount[author] || 0) + 1;
                });
            }
        });

        // Sort years
        const sortedYears = [...years].sort((a, b) => b - a);

        // Get top authors (max 10)
        const topAuthors = Object.entries(authorsCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(entry => entry[0]);

        // Build filter UI
        let filterHtml = `
            <div class="filter-section mb-4">
                <h5>Filter Results</h5>
                <div class="row">
                    <div class="col-md-4">
                        <label for="filterYear">Year:</label>
                        <select id="filterYear" class="form-control">
                            <option value="">All Years</option>
        `;

        sortedYears.forEach(year => {
            filterHtml += `<option value="${year}">${year}</option>`;
        });

        filterHtml += `
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="filterAuthor">Author:</label>
                        <select id="filterAuthor" class="form-control">
                            <option value="">All Authors</option>
        `;

        topAuthors.forEach(author => {
            filterHtml += `<option value="${author}">${author}</option>`;
        });

        filterHtml += `
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="resultsSort">Sort by:</label>
                        <select id="resultsSort" class="form-control">
                            <option value="relevance">Relevance</option>
                            <option value="citations">Citations (High to Low)</option>
                            <option value="year">Year (Newest First)</option>
                        </select>
                    </div>
                </div>
                <button id="applyFilters" class="btn panel-btn btn-sm mt-2">Apply Filters</button>
                <button id="resetFilters" class="btn panel-action-secondary btn-sm mt-2 ml-2">Reset</button>
            </div>
        `;

        $('#resultsFilterOptions').html(filterHtml);

        // Add event listeners for filters
        $('#applyFilters').click(function() {
            activeFilters = {
                year: $('#filterYear').val(),
                author: $('#filterAuthor').val(),
                sortBy: $('#resultsSort').val()
            };
            currentPage = 1;
            displayResultsWithPagination();
        });

        $('#resetFilters').click(function() {
            $('#filterYear').val('');
            $('#filterAuthor').val('');
            $('#resultsSort').val('relevance');
            activeFilters = {};
            currentPage = 1;
            displayResultsWithPagination();
        });
    }

    // Function to filter and sort results based on active filters
    function getFilteredResults() {
        let filtered = [...allResults];

        // Apply year filter
        if (activeFilters.year) {
            filtered = filtered.filter(article => article.year == activeFilters.year);
        }

        // Apply author filter
        if (activeFilters.author) {
            filtered = filtered.filter(article =>
                article.authors && article.authors.includes(activeFilters.author)
            );
        }

        // Apply sorting
        if (activeFilters.sortBy) {
            switch(activeFilters.sortBy) {
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
        $('.page-link').click(function(e) {
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
            url: `/api/search/article/${articleId}`,
            method: 'GET',
            success: function (article) {
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
            },
            error: function (error) {
                console.error('Error loading article details:', error);
                alert('Could not load article details.');
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }

    // Function to load search history
    function loadSearchHistory() {
        $.ajax({
            url: '/api/search/history',
            method: 'GET',
            success: function (history) {
                if (!history || history.length === 0) {
                    $('#searchHistoryContent').html(`
                        <div class="alert panel-alert-secondary">
                            No recent searches in your history.
                        </div>
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
                    const query = item.query;
                    const isAdvanced = query.startsWith('Advanced:');

                    historyHtml += `
                        <tr>
                            <td>${query}</td>
                            <td>${date}</td>
                            <td>
                                <button class="btn panel-action-btn panel-action-primary repeat-search"
                                        data-query="${query}"
                                        data-advanced="${isAdvanced}">
                                    Repeat
                                </button>
                            </td>
                        </tr>
                    `;
                });

                historyHtml += `
                        </tbody>
                    </table>
                `;

                $('#searchHistoryContent').html(historyHtml);

                // Add event to repeat search
                $('.repeat-search').click(function () {
                    const query = $(this).data('query');
                    const isAdvanced = $(this).data('advanced') === true;

                    // Clean the "Advanced:" prefix if it exists
                    const cleanQuery = isAdvanced && query.startsWith('Advanced:')
                        ? query.substring(9).trim()
                        : query;

                    if (isAdvanced) {
                        $('#advanced-tab').tab('show');
                        $('#advancedQuery').val(cleanQuery);
                        setTimeout(() => {
                            performAdvancedSearch();
                        }, 300);
                    } else {
                        $('#basic-tab').tab('show');
                        $('#basicQuery').val(cleanQuery);
                        setTimeout(() => {
                            $('#basicSearchBtn').click();
                        }, 300);
                    }
                });
            },
            error: function (error) {
                $('#searchHistoryContent').html(`
                    <div class="alert panel-alert-danger">
                        Error loading search history.
                    </div>
                `);
                console.error('Error loading history:', error);
            }
        });
    }
});