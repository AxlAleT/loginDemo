package com.escom.papelio.service;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.RecommendationRequestDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;

import java.util.Optional;

public interface ArticleService {
    SearchResponseDTO searchArticles(SearchRequestDTO searchRequest);
    Optional<ArticleDTO> getArticleById(String id);
    SearchResponseDTO getRecommendations(RecommendationRequestDTO request);
}
