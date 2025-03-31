package com.escom.papelio.service;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;

import java.util.Optional;

public interface ArticleService {
    /**
     * Perform a basic search for articles based on keywords/title
     * @param searchRequest the search request containing query and pagination
     * @return search results
     */
    SearchResponseDTO searchArticles(SearchRequestDTO searchRequest);

    /**
     * Perform an advanced search with filters
     * @param searchRequest the search request with filters
     * @return filtered search results
     */
    SearchResponseDTO advancedSearch(SearchRequestDTO searchRequest);

    /**
     * Get article details by ID
     * @param id article identifier
     * @return article details if found
     */
    Optional<ArticleDTO> getArticleById(String id);
}