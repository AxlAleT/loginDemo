const csrfToken = $("meta[name='_csrf']").attr("content");
const csrfHeader = $("meta[name='_csrf_header']").attr("content");

$(document).ready(function () {
    // Configurar el encabezado CSRF para todas las solicitudes AJAX
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (csrfHeader && csrfToken) {
                xhr.setRequestHeader(csrfHeader, csrfToken);
            }
        }
    });

    // Eventos de búsqueda
    $('#basicSearchBtn').click(function () {
        const query = $('#basicQuery').val().trim();
        if (query) {
            performSearch(query, false);
        }
    });

    $('#advancedSearchBtn').click(function () {
        performAdvancedSearch();
    });

    // También buscar al presionar Enter en los campos de búsqueda
    $('#basicQuery').keypress(function (e) {
        if (e.which === 13) {
            $('#basicSearchBtn').click();
        }
    });

    // Cargar historial cuando se cambia a la pestaña
    $('#history-tab').on('shown.bs.tab', function () {
        loadSearchHistory();
    });

    // Función para realizar búsqueda básica
    function performSearch(query, isAdvanced = false) {
        // Mostrar indicador de carga
        $('#loader').show();
        $('#searchResults').empty();

        const endpoint = isAdvanced ? '/api/search/advanced' : '/api/search';
        const payload = {query: query};

        // Para búsquedas avanzadas, añadir filtros adicionales
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
                            Ha ocurrido un error al realizar la búsqueda. Por favor, intenta de nuevo.
                        </div>
                    `);
                console.error('Error en la búsqueda:', error);
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }

    // Función para realizar búsqueda avanzada
    function performAdvancedSearch() {
        const query = $('#advancedQuery').val().trim();
        if (query) {
            performSearch(query, true);
        }
    }

    // Función para mostrar resultados
    function displayResults(response) {
        if (!response || !response.articles || response.articles.length === 0) {
            $('#searchResults').html(`
                    <div class="alert panel-alert-danger">
                        No se encontraron resultados para tu búsqueda.
                    </div>
                `);
            return;
        }

        let resultsHtml = `
                <h4 class="mb-3">Se encontraron ${response.total} resultados</h4>
                <div class="row">
            `;

        response.articles.forEach(article => {
            // Preparar lista de autores para mostrar
            let authorsHtml = '';
            if (article.authors && article.authors.length > 0) {
                article.authors.slice(0, 3).forEach(author => {
                    authorsHtml += `<span class="author-chip">${author}</span>`;
                });

                if (article.authors.length > 3) {
                    authorsHtml += `<span class="author-chip">+${article.authors.length - 3} más</span>`;
                }
            }

            // Construir tarjeta de artículo
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
                                    <span class="badge badge-citations">${article.citationCount || 0} citaciones</span>
                                </div>
                                <p class="article-abstract">${article.abstract || 'No hay resumen disponible para este artículo.'}</p>
                                <button class="btn panel-btn btn-sm view-details" data-id="${article.id}">Ver Detalles</button>
                            </div>
                        </div>
                    </div>
                `;
        });

        resultsHtml += '</div>';
        $('#searchResults').html(resultsHtml);

        // Añadir evento para ver detalles
        $('.view-details').click(function () {
            const articleId = $(this).data('id');
            loadArticleDetails(articleId);
        });
    }

    // Función para cargar detalles de un artículo
    function loadArticleDetails(articleId) {
        $('#loader').show();

        $.ajax({
            url: `/api/search/article/${articleId}`,
            method: 'GET',
            success: function (article) {
                // Construir HTML para detalles del artículo
                let detailsHtml = `
                        <h4>${article.title}</h4>
                        <div class="my-3">
                            <strong>Autores:</strong><br>
                    `;

                if (article.authors && article.authors.length > 0) {
                    article.authors.forEach(author => {
                        detailsHtml += `<span class="author-chip">${author}</span>`;
                    });
                } else {
                    detailsHtml += '<span>No disponible</span>';
                }

                detailsHtml += `
                        </div>
                        <div class="my-3">
                            <strong>Año:</strong> ${article.year || 'No disponible'}<br>
                            <strong>Citaciones:</strong> ${article.citationCount || 0}<br>
                            <strong>DOI:</strong> ${article.doi || 'No disponible'}<br>
                            <strong>Revista:</strong> ${article.venue || 'No disponible'}
                        </div>
                        <div class="my-3">
                            <strong>Resumen:</strong>
                            <p>${article.abstract || 'No hay resumen disponible para este artículo.'}</p>
                        </div>
                    `;

                if (article.keywords && article.keywords.length > 0) {
                    detailsHtml += `
                            <div class="my-3">
                                <strong>Palabras clave:</strong><br>
                        `;

                    article.keywords.forEach(keyword => {
                        detailsHtml += `<span class="author-chip">${keyword}</span>`;
                    });

                    detailsHtml += '</div>';
                }

                // Mostrar detalles en el modal
                $('#articleDetails').html(detailsHtml);

                // Configurar enlace para ver artículo completo
                if (article.url) {
                    $('#viewFullArticle').attr('href', article.url).show();
                } else {
                    $('#viewFullArticle').hide();
                }

                // Mostrar modal
                $('#articleModal').modal('show');
            },
            error: function (error) {
                console.error('Error al cargar detalles del artículo:', error);
                alert('No se pudieron cargar los detalles del artículo.');
            },
            complete: function () {
                $('#loader').hide();
            }
        });
    }

    // Función para cargar historial de búsqueda
    function loadSearchHistory() {
        $.ajax({
            url: '/api/search/history',
            method: 'GET',
            success: function (history) {
                if (!history || history.length === 0) {
                    $('#searchHistoryContent').html(`
                            <div class="alert panel-alert-secondary">
                                No hay búsquedas recientes en tu historial.
                            </div>
                        `);
                    return;
                }

                let historyHtml = `
                        <table class="panel-table">
                            <thead>
                                <tr>
                                    <th>Consulta</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
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
                                        Repetir
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

                // Añadir evento para repetir búsqueda
                $('.repeat-search').click(function () {
                    const query = $(this).data('query');
                    const isAdvanced = $(this).data('advanced') === true;

                    // Limpiar el prefijo "Advanced:" si existe
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
                            Error al cargar el historial de búsqueda.
                        </div>
                    `);
                console.error('Error al cargar historial:', error);
            }
        });
    }
});

