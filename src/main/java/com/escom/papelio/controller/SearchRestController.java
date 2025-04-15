package com.escom.papelio.controller;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.RecommendationRequestDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.service.ArticleService;
import com.escom.papelio.service.ArticleViewHistoryService;
import com.escom.papelio.service.SearchHistoryService;
import com.escom.papelio.service.SemanticScholarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
public class SearchRestController {

    private final ArticleService articleService;
    private final SearchHistoryService searchHistoryService;
    private final ArticleViewHistoryService articleViewHistoryService;
    private final SemanticScholarService semanticScholarService;

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

    @PostMapping("/advanced")
    public ResponseEntity<SearchResponseDTO> advancedSearch(
            @Valid @RequestBody SearchRequestDTO searchRequest,
            Authentication authentication) {

        log.info("Received advanced search request with filters");

        // Perform advanced search
        SearchResponseDTO response = articleService.advancedSearch(searchRequest);

        // Log search history if user is authenticated
        if (authentication != null) {
            searchHistoryService.saveSearchQuery(authentication.getName(),
                    "Advanced: " + searchRequest.getQuery());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/article/{id}")
    public ResponseEntity<ArticleDTO> getArticleById(@PathVariable String id, Authentication authentication) {
        log.info("Fetching article with id: {}", id);

        // Track article view if user is authenticated
        if (authentication != null) {
            articleViewHistoryService.saveArticleView(authentication.getName(), id);
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
    public ResponseEntity<?> getPopularArticles() {
        return ResponseEntity.ok(articleViewHistoryService.getMostViewedArticles());
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
}
