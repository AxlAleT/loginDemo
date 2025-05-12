package com.escom.papelio.service;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.model.ArticleFavorite;
import com.escom.papelio.repository.ArticleFavoriteRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleFavoriteService {
    
    private final ArticleFavoriteRepository articleFavoriteRepository;
    
    /**
     * Saves an article as favorite for a user
     * @return true if added, false if it already existed
     */
    public boolean saveArticleFavorite(String userEmail, String articleId, String title) {
        if (articleFavoriteRepository.existsByUserEmailAndArticleId(userEmail, articleId)) {
            log.info("Article {} is already a favorite for user {}", articleId, userEmail);
            return false;
        }
        
        ArticleFavorite favorite = new ArticleFavorite();
        favorite.setUserEmail(userEmail);
        favorite.setArticleId(articleId);
        favorite.setTitle(title);
        
        articleFavoriteRepository.save(favorite);
        log.info("Added article {} to favorites for user {}", articleId, userEmail);
        return true;
    }
    
    /**
     * Removes an article from user's favorites
     * @return true if removed, false if it wasn't found
     */
    @Transactional
    public boolean removeArticleFavorite(String userEmail, String articleId) {
        if (!articleFavoriteRepository.existsByUserEmailAndArticleId(userEmail, articleId)) {
            log.info("Article {} is not in favorites for user {}", articleId, userEmail);
            return false;
        }
        
        articleFavoriteRepository.deleteByUserEmailAndArticleId(userEmail, articleId);
        log.info("Removed article {} from favorites for user {}", articleId, userEmail);
        return true;
    }
    
    /**
     * Checks if an article is in the user's favorites
     */
    public boolean isArticleFavorite(String userEmail, String articleId) {
        return articleFavoriteRepository.existsByUserEmailAndArticleId(userEmail, articleId);
    }
    
    /**
     * Returns all favorite articles for a user as a SearchResponseDTO
     */
    public SearchResponseDTO getUserFavoritesAsDTO(String userEmail) {
        List<ArticleFavorite> favorites = articleFavoriteRepository.findByUserEmailOrderByFavoriteDateDesc(userEmail);
        
        List<ArticleDTO> articleDTOs = favorites.stream()
            .map(favorite -> {
                ArticleDTO dto = new ArticleDTO();
                dto.setId(favorite.getArticleId());
                dto.setTitle(favorite.getTitle());
                // Default values for other properties
                return dto;
            })
            .collect(Collectors.toList());
        
        log.info("Retrieved {} favorites for user {}", articleDTOs.size(), userEmail);
        return new SearchResponseDTO(articleDTOs, articleDTOs.size(), 1, 1, "favorites");
    }
}
