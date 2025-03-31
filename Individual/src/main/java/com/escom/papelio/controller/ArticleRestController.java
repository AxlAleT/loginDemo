package com.escom.papelio.controller;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.service.ArticleService;
import com.escom.papelio.service.SearchHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
public class ArticleRestController {

    private final ArticleService articleService;
    private final SearchHistoryService searchHistoryService;

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
    public ResponseEntity<ArticleDTO> getArticleById(@PathVariable String id) {
        log.info("Fetching article with id: {}", id);

        return articleService.getArticleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}