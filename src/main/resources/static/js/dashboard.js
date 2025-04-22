document.addEventListener('DOMContentLoaded', function() {
    // Fetch both recommendations and popular articles when page loads
    fetchRecommendations();
    fetchPopularArticles();
    
    // Add event listeners for refresh buttons
    document.getElementById('refresh-recommendations').addEventListener('click', fetchRecommendations);
    document.getElementById('refresh-popular').addEventListener('click', fetchPopularArticles);
});

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
            displayArticles(data, popularContainer, 'No popular articles available yet.');
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
            const authorNames = article.authors.slice(0, 3).map(author => author.name);
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
                <a href="/user/search/article/${article.paperId}" class="btn panel-action-primary">View Details</a>
            </div>
        `;
        
        articleList.appendChild(articleCard);
    });
    
    container.appendChild(articleList);
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}
