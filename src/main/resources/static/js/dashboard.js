document.addEventListener('DOMContentLoaded', function() {
    // Fetch both recommendations and popular articles when page loads
    fetchRecommendations();
    fetchPopularArticles();
    
    // Add event listeners for refresh buttons
    document.getElementById('refresh-recommendations').addEventListener('click', fetchRecommendations);
    document.getElementById('refresh-popular').addEventListener('click', fetchPopularArticles);
    
    // Add event listener for favorite button
    document.getElementById('favoriteButton').addEventListener('click', handleFavoriteAction);
    
    // Setup CSRF for AJAX requests
    const csrfToken = document.querySelector("meta[name='_csrf']").getAttribute("content");
    const csrfHeader = document.querySelector("meta[name='_csrf_header']").getAttribute("content");
    
    // Add CSRF headers to all AJAX requests
    $.ajaxSetup({
        beforeSend: function(xhr) {
            if (csrfHeader && csrfToken) {
                xhr.setRequestHeader(csrfHeader, csrfToken);
            }
        }
    });
});

// Current article being viewed
let currentArticle = null;
let isFavorite = false;

// Fetch user-specific recommendations
function fetchRecommendations() {
    const recommendationsContainer = document.getElementById('recommendations-container');
    recommendationsContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
    
    fetch('/api/search/recommendations')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayArticles(data.articles, recommendationsContainer, 'No recommendations available. Try viewing more articles!');
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
            recommendationsContainer.innerHTML = '<div class="panel-alert panel-alert-danger">Failed to load recommendations. Please try again later.</div>';
        });
}

// Fetch popular articles across all users
function fetchPopularArticles() {
    const popularContainer = document.getElementById('popular-container');
    popularContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
    
    fetch('/api/search/popular-articles')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayArticles(data.articles, popularContainer, 'No popular articles available yet.');
        })
        .catch(error => {
            console.error('Error fetching popular articles:', error);
            popularContainer.innerHTML = '<div class="panel-alert panel-alert-danger">Failed to load popular articles. Please try again later.</div>';
        });
}

// Display articles in the specified container
function displayArticles(articles, container, emptyMessage) {
    container.innerHTML = '';
    
    if (!articles || articles.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">${emptyMessage}</p>`;
        return;
    }
    
    const articleList = document.createElement('div');
    articleList.className = 'article-list';
    
    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        
        // Format authors (limit to first 3)
        let authorText = '';
        if (article.authors && article.authors.length > 0) {
            const authorNames = article.authors.slice(0, 3).map(author => author.name || author);
            authorText = authorNames.join(', ');
            if (article.authors.length > 3) {
                authorText += ' et al.';
            }
        }
        
        // Create year text if available
        const yearText = article.year ? `(${article.year})` : '';
        
        articleCard.innerHTML = `
            <h4 class="article-title">${article.title}</h4>
            <p class="article-authors">${authorText} ${yearText}</p>
            <p class="article-abstract">${article.abstract ? truncateText(article.abstract, 150) : 'No abstract available'}</p>
            <div class="article-actions">
                <button class="btn panel-action-primary view-article-details" 
                  data-article-id="${article.paperId || article.id}" 
                  data-article-title="${article.title}">
                  View Details
                </button>
            </div>
        `;
        
        articleList.appendChild(articleCard);
    });
    
    container.appendChild(articleList);
    
    // Add event listeners to view details buttons
    container.querySelectorAll('.view-article-details').forEach(button => {
        button.addEventListener('click', function() {
            const articleId = this.getAttribute('data-article-id');
            const articleTitle = this.getAttribute('data-article-title');
            viewArticleDetails(articleId, articleTitle);
        });
    });
}

// Load article details and show in modal
function viewArticleDetails(articleId, title) {
    // Show the modal with loading indicator
    $('#articleModal').modal('show');
    $('#articleDetails').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>');
    
    // Clear current article
    currentArticle = null;
    isFavorite = false;
    updateFavoriteButtonUI();
    
    // Fetch article details
    $.ajax({
        url: `/api/search/article/${articleId}?title=${encodeURIComponent(title)}`,
        method: 'GET',
        success: (article) => {
            currentArticle = article;
            renderArticleDetails(article);
            checkFavoriteStatus(articleId);
        },
        error: (error) => {
            console.error('Error loading article details:', error);
            $('#articleDetails').html('<div class="alert panel-alert-danger">Failed to load article details. Please try again later.</div>');
        }
    });
}

// Render article details in the modal
function renderArticleDetails(article) {
    let detailsHtml = `
        <h4>${article.title}</h4>
        <div class="my-3">
            <strong>Authors:</strong><br>
    `;

    if (article.authors && article.authors.length > 0) {
        article.authors.forEach(author => {
            detailsHtml += `<span class="author-chip">${typeof author === 'string' ? author : author.name}</span>`;
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

    // Update modal content
    $('#articleDetails').html(detailsHtml);

    // Set the "View Full Article" button URL if available
    if (article.url) {
        $('#viewFullArticle').attr('href', article.url).show();
    } else {
        $('#viewFullArticle').hide();
    }
}

// Check if the article is in user's favorites
function checkFavoriteStatus(articleId) {
    $.ajax({
        url: `/api/search/favorite/check/${articleId}`,
        method: 'GET',
        success: (response) => {
            isFavorite = response.isFavorite;
            updateFavoriteButtonUI();
        },
        error: (error) => {
            console.error('Error checking favorite status:', error);
            isFavorite = false;
            updateFavoriteButtonUI();
        }
    });
}

// Update favorite button appearance
function updateFavoriteButtonUI() {
    const $button = $('#favoriteButton');

    if (isFavorite) {
        $button.html('<i class="mdi mdi-heart"></i> Remove from Favorites');
        $button.removeClass('panel-action-secondary').addClass('panel-action-danger');
    } else {
        $button.html('<i class="mdi mdi-heart-outline"></i> Add to Favorites');
        $button.removeClass('panel-action-danger').addClass('panel-action-secondary');
    }
}

// Handle favorite/unfavorite button click
function handleFavoriteAction() {
    if (!currentArticle) return;
    
    if (isFavorite) {
        removeFromFavorites();
    } else {
        addToFavorites();
    }
}

// Add current article to favorites
function addToFavorites() {
    if (!currentArticle) return;

    const payload = {
        articleId: currentArticle.id,
        title: currentArticle.title
    };

    $.ajax({
        url: '/api/search/favorite',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: (response) => {
            isFavorite = true;
            updateFavoriteButtonUI();
        },
        error: (error) => {
            console.error('Error adding to favorites:', error);
            alert('Failed to add article to favorites. Please try again.');
        }
    });
}

// Remove current article from favorites
function removeFromFavorites() {
    if (!currentArticle) return;

    $.ajax({
        url: `/api/search/favorite/${currentArticle.id}`,
        method: 'DELETE',
        success: (response) => {
            isFavorite = false;
            updateFavoriteButtonUI();
        },
        error: (error) => {
            console.error('Error removing from favorites:', error);
            alert('Failed to remove article from favorites. Please try again.');
        }
    });
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}
