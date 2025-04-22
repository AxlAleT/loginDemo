package com.escom.papelio.service;

import com.escom.papelio.client.SemanticScholarApiClient;
import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.RecommendationRequestDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.mapper.SemanticScholarMapper;
import com.escom.papelio.model.SemanticScholarResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticScholarService implements ArticleService {

    private static final int TARGET_RECOMMENDATIONS = 10;
    private static final int TARGET_RETRIVED_ARTICLES = 100;
    private static final String TARGET_FIELDS = "title,abstract,authors,venue,year,citationCount,url,externalIds";
    private final SemanticScholarApiClient apiClient;
    private final SemanticScholarMapper mapper;

    private static void getInfo(SemanticScholarResponse response) {
        log.info("Received {} results out of total {}", response.getData() != null ? response.getData().size() : 0, response.getTotal());
    }

    @Override
    @Cacheable(value = "basicSearchCache", key = "#searchRequest.query + '_' + #searchRequest.page + '_' + #searchRequest.size")
    public SearchResponseDTO searchArticles(SearchRequestDTO searchRequest) {
        log.info("Performing basic search with query: {}", searchRequest.getQuery());

        try {
            var response = apiClient.searchPapers(searchRequest.getQuery(), searchRequest.getPage() * searchRequest.getSize(), TARGET_RETRIVED_ARTICLES, TARGET_FIELDS);

            if (response == null) {
                log.warn("Received null response from Semantic Scholar API");
                return createEmptyResponse(searchRequest);
            }

            log.debug("API Response: {}", response);
            getInfo(response);

            List<ArticleDTO> articles = new ArrayList<>();
            if (response.getData() != null) {
                articles = response.getData().stream().map(mapper::mapToArticleDTO).collect(Collectors.toList());
            }

            return new SearchResponseDTO(articles, response.getTotal() != null ? response.getTotal() : 0, searchRequest.getPage(), calculateTotalPages(response.getTotal(), searchRequest.getSize()), searchRequest.getQuery());
        } catch (Exception e) {
            log.error("Error searching articles: {}", e.getMessage(), e);
            return createEmptyResponse(searchRequest);
        }
    }

    @Override
    @Cacheable(value = "articleDetails", key = "#id")
    public Optional<ArticleDTO> getArticleById(String id) {
        log.info("Fetching article details for ID: {}", id);

        try {
            var paper = apiClient.getPaperById(id, "title,abstract,authors,venue,year,citationCount,url,externalIds,references");

            if (paper == null) {
                log.warn("Received null response from Semantic Scholar API for ID: {}", id);
                return Optional.empty();
            }

            log.debug("API Response for article {}: {}", id, paper);
            return Optional.of(mapper.mapToArticleDTO(paper));
        } catch (Exception e) {
            log.error("Error fetching article details: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    @Cacheable(value = "recommendationsCache", key = "#request.paperIds.toString()")
    public SearchResponseDTO getRecommendations(RecommendationRequestDTO request) {
        log.info("Getting recommendations for {} paper(s)", request.getPaperIds().size());

        if (request.getPaperIds() == null || request.getPaperIds().isEmpty()) {
            log.warn("Empty paper IDs list provided for recommendations");
            return new SearchResponseDTO(new ArrayList<>(), 0, 0, 0, "recommendations");
        }

        try {
            // Use the new POST endpoint for recommendations
            var response = apiClient.getRecommendations(request.getPaperIds(), TARGET_RECOMMENDATIONS, TARGET_FIELDS);

            log.debug("API Response for recommendations: {}", response.toString());

            if (response.getRecommendedPapers() == null) {
                log.warn("No recommendations found for the provided paper IDs");
                return new SearchResponseDTO(new ArrayList<>(), 0, 0, 0, "recommendations");
            }

            // Map the recommendations to DTOs
            List<ArticleDTO> recommendations = response.getRecommendedPapers().stream().map(mapper::mapToArticleDTO).collect(Collectors.toList());

            // Limit to target count if necessary
            if (recommendations.size() > TARGET_RECOMMENDATIONS) {
                recommendations = recommendations.subList(0, TARGET_RECOMMENDATIONS);
            }

            log.info("Returning {} recommendations", recommendations.size());

            return new SearchResponseDTO(recommendations, recommendations.size(), 0, 1, "recommendations");
        } catch (Exception e) {
            log.error("Error fetching recommendations: {}", e.getMessage(), e);
            return new SearchResponseDTO(new ArrayList<>(), 0, 0, 0, "recommendations");
        }
    }

    private int calculateLimitPerPaper(int paperCount) {
        // Adjust the limit per paper based on the count
        if (paperCount <= 3) {
            // Few papers, get more recommendations per paper
            return TARGET_RECOMMENDATIONS / paperCount;
        } else if (paperCount <= 10) {
            // Medium number of papers
            return Math.max(3, TARGET_RECOMMENDATIONS / paperCount);
        } else {
            // Many papers, get fewer recommendations per paper
            return Math.max(1, Math.min(3, TARGET_RECOMMENDATIONS / paperCount));
        }
    }

    private int calculateTotalPages(Long total, int size) {
        if (total == null || total == 0 || size == 0) {
            return 0;
        }
        return (int) Math.ceil((double) total / size);
    }

    private SearchResponseDTO createEmptyResponse(SearchRequestDTO request) {
        return new SearchResponseDTO(new ArrayList<>(), 0, request.getPage(), 0, request.getQuery());
    }
}
