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

    // Search events
    $('#basicSearchBtn').click(function () {
        const query = $('#basicQuery').val().trim();
        if (query) {
            performSearch(query, false);
        }
    });

    $('#advancedSearchBtn').click(function () {
        performAdvancedSearch();
    });

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

    // Function to perform basic search
    function performSearch(query, isAdvanced = false) {
        // Show loading indicator
        $('#loader').show();
        $('#searchResults').empty();

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
                displayResults(response);
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

    // Function to display results
    function displayResults(response) {
        if (!response || !response.articles || response.articles.length === 0) {
            $('#searchResults').html(`
                    <div class="alert panel-alert-danger">
                        No results found for your search.
                    </div>
                `);
            return;
        }

        let resultsHtml = `
                <h4 class="mb-3">${response.articles.length} results found</h4>
                <div class="row">
            `;

        response.articles.forEach(article => {
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

