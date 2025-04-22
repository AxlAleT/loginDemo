package com.escom.papelio.service;

import com.escom.papelio.model.ArticleViewHistory;
import com.escom.papelio.repository.ArticleViewHistoryRepository;
import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleViewHistoryService {

    private final ArticleViewHistoryRepository articleViewHistoryRepository;

    /**
     * Save a user's article view to history
     * @param userEmail the user's email
     * @param articleId the article ID
     */
    public void saveArticleView(String userEmail, String articleId, String title) {
        ArticleViewHistory history = new ArticleViewHistory();
        history.setUserEmail(userEmail);
        history.setArticleId(articleId);
        history.setViewDate(LocalDateTime.now());
        history.setTitle(title);

        articleViewHistoryRepository.save(history);
        log.info("Saved article view history for user {}: article {}", userEmail, articleId);
    }

    /**
     * Get article view history for a specific user
     * @param userEmail the user's email
     * @return list of article view history entries
     */
    public List<ArticleViewHistory> getUserArticleViewHistory(String userEmail) {
        return articleViewHistoryRepository.findByUserEmailOrderByViewDateDesc(userEmail);
    }

    /**
     * Get most viewed articles
     * @return list of most viewed articles with counts
     */
    public List<Object[]> getMostViewedArticles() {
        return articleViewHistoryRepository.findMostViewedArticles();
    }

    /**
     * Get most viewed articles formatted as a SearchResponseDTO
     * @return SearchResponseDTO containing the most viewed articles
     */
    public SearchResponseDTO getMostViewedArticlesAsDTO() {
        List<Object[]> rawResults = articleViewHistoryRepository.findMostViewedArticles();
        
        List<ArticleDTO> articles = rawResults.stream()
                .map(result -> {
                    ArticleDTO article = new ArticleDTO();
                    article.setTitle((String) result[0]);  // title
                    article.setId((String) result[1]);     // articleId
                    return article;
                })
                .collect(Collectors.toList());
        
        return new SearchResponseDTO(articles, articles.size(), 1, 1, "popular-articles");
    }

    /**
     * Get the IDs of articles viewed by a user, limited to the most recent ones
     * @param userEmail the user's email
     * @param limit maximum number of article IDs to return
     * @return list of article IDs
     */
    public List<String> getUserViewedArticleIds(String userEmail, int limit) {
        return articleViewHistoryRepository.findByUserEmailOrderByViewDateDesc(userEmail)
                .stream()
                .map(ArticleViewHistory::getArticleId)
                .distinct()
                .limit(limit)
                .collect(Collectors.toList());
    }
}
