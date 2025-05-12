package com.escom.papelio.controller;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.ArticleFavoriteRequestDTO;
import com.escom.papelio.dto.RecommendationRequestDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.service.ArticleFavoriteService;
import com.escom.papelio.service.ArticleService;
import com.escom.papelio.service.ArticleViewHistoryService;
import com.escom.papelio.service.SearchHistoryService;
import com.escom.papelio.service.SemanticScholarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
public class SearchRestController {

    private final ArticleService articleService;
    private final SearchHistoryService searchHistoryService;
    private final ArticleViewHistoryService articleViewHistoryService;
    private final SemanticScholarService semanticScholarService;
    private final ArticleFavoriteService articleFavoriteService;

    @PostMapping
    public ResponseEntity<SearchResponseDTO> basicSearch(
            @Valid @RequestBody SearchRequestDTO searchRequest,
            Authentication authentication) {

        log.info("Received basic search request: {}", searchRequest.getQuery());

        // Perform the search
        SearchResponseDTO response = articleService.searchArticles(searchRequest);

        // Log search history if user is authenticated
        if (authentication != null) {
            searchHistoryService.saveSearchQuery(authentication.getName(), searchRequest.getQuery());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/article/{id}")
    public ResponseEntity<ArticleDTO> getArticleById(
            @PathVariable String id,
            @RequestParam String title,
            Authentication authentication) {
        // Track article view if user is authenticated
        if (authentication != null) {
            articleViewHistoryService.saveArticleView(authentication.getName(), id, title);
        }

        return articleService.getArticleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/history")
    public ResponseEntity<?> getSearchHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(searchHistoryService.getUserSearchHistory(authentication.getName()));
    }

    @GetMapping("/article-history")
    public ResponseEntity<?> getArticleViewHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(articleViewHistoryService.getUserArticleViewHistory(authentication.getName()));
    }

    @GetMapping("/popular-articles")
    public ResponseEntity<SearchResponseDTO> getPopularArticles() {
        return ResponseEntity.ok(articleViewHistoryService.getMostViewedArticlesAsDTO());
    }

    @GetMapping("/recommendations")
    public ResponseEntity<SearchResponseDTO> getRecommendations(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        
        String userEmail = authentication.getName();
        log.info("Generating recommendations for user: {}", userEmail);
        
        // Get article IDs the user has viewed (up to 20)
        List<String> viewedArticleIds = articleViewHistoryService.getUserViewedArticleIds(userEmail, 20);
        
        if (viewedArticleIds.isEmpty()) {
            log.info("No view history found for user {}, unable to generate recommendations", userEmail);
            return ResponseEntity.ok(new SearchResponseDTO(List.of(), 0, 0, 0, "recommendations"));
        }
        
        // Create a request with the viewed article IDs
        RecommendationRequestDTO request = new RecommendationRequestDTO(viewedArticleIds, 20);
        
        // Get recommendations based on viewed articles
        SearchResponseDTO recommendations = semanticScholarService.getRecommendations(request);
        log.info("Generated {} recommendations for user {}", 
            recommendations.getArticles().size(), userEmail);
        
        return ResponseEntity.ok(recommendations);
    }

    @PostMapping("/favorite")
    public ResponseEntity<?> addArticleToFavorites(
            @Valid @RequestBody ArticleFavoriteRequestDTO favoriteRequest,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        
        boolean added = articleFavoriteService.saveArticleFavorite(
            authentication.getName(), 
            favoriteRequest.getArticleId(), 
            favoriteRequest.getTitle()
        );
        
        if (added) {
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Article added to favorites"));
        } else {
            return ResponseEntity.status(HttpStatus.OK)
                .body(Map.of("message", "Article was already in favorites"));
        }
    }
    
    @DeleteMapping("/favorite/{articleId}")
    public ResponseEntity<?> removeArticleFromFavorites(
            @PathVariable String articleId,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        
        boolean removed = articleFavoriteService.removeArticleFavorite(
            authentication.getName(), 
            articleId
        );
        
        if (removed) {
            return ResponseEntity.ok(Map.of("message", "Article removed from favorites"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Article was not in favorites"));
        }
    }
    
    @GetMapping("/favorite")
    public ResponseEntity<SearchResponseDTO> getUserFavorites(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        
        SearchResponseDTO favorites = articleFavoriteService.getUserFavoritesAsDTO(
            authentication.getName()
        );
        
        return ResponseEntity.ok(favorites);
    }
    
    @GetMapping("/favorite/check/{articleId}")
    public ResponseEntity<Map<String, Boolean>> checkIfFavorite(
            @PathVariable String articleId,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }
        
        boolean isFavorite = articleFavoriteService.isArticleFavorite(
            authentication.getName(), 
            articleId
        );
        
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }
}
