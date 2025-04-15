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
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticScholarService implements ArticleService {

    private final SemanticScholarApiClient apiClient;
    private final SemanticScholarMapper mapper;
    
    private static final int TARGET_RECOMMENDATIONS = 20;
    private static final String RECOMMENDATION_FIELDS = "title,abstract,authors,venue,year,citationCount,url,externalIds";

    private static void getInfo(SemanticScholarResponse response) {
        log.info("Received {} results out of total {}", 
                response.getData() != null ? response.getData().size() : 0, 
                response.getTotal());
    }

    @Override
    @Cacheable(value = "basicSearchCache", key = "#searchRequest.query + '_' + #searchRequest.page + '_' + #searchRequest.size")
    public SearchResponseDTO searchArticles(SearchRequestDTO searchRequest) {
        log.info("Performing basic search with query: {}", searchRequest.getQuery());

        try {
            var response = apiClient.searchPapers(
                    searchRequest.getQuery(),
                    searchRequest.getPage() * searchRequest.getSize(),
                    searchRequest.getSize(),
                    "title,abstract,authors,venue,year,citationCount,url,externalIds"
            );

            if (response == null) {
                log.warn("Received null response from Semantic Scholar API");
                return createEmptyResponse(searchRequest);
            }

            log.debug("API Response: {}", response);
            getInfo(response);

            List<ArticleDTO> articles = new ArrayList<>();
            if (response.getData() != null) {
                articles = response.getData().stream()
                        .map(mapper::mapToArticleDTO)
                        .collect(Collectors.toList());
            }

            return new SearchResponseDTO(
                    articles,
                    response.getTotal() != null ? response.getTotal() : 0,
                    searchRequest.getPage(),
                    calculateTotalPages(response.getTotal(), searchRequest.getSize()),
                    searchRequest.getQuery()
            );
        } catch (Exception e) {
            log.error("Error searching articles: {}", e.getMessage(), e);
            return createEmptyResponse(searchRequest);
        }
    }

    @Override
    @Cacheable(value = "advancedSearchCache", key = "#searchRequest.toString()")
    public SearchResponseDTO advancedSearch(SearchRequestDTO searchRequest) {
        log.info("Performing advanced search with filters: {}", searchRequest);

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString("/paper/search")
                .queryParam("query", searchRequest.getQuery())
                .queryParam("offset", searchRequest.getPage() * searchRequest.getSize())
                .queryParam("limit", searchRequest.getSize())
                .queryParam("fields", "title,abstract,authors,venue,year,citationCount,url,externalIds");

        // Add date range filter if provided
        if (searchRequest.getFromDate() != null) {
            uriBuilder.queryParam("year", ">=" + searchRequest.getFromDate().getYear());
        }

        if (searchRequest.getToDate() != null) {
            uriBuilder.queryParam("year", "<=" + searchRequest.getToDate().getYear());
        }

        // Add journal filter if provided
        if (searchRequest.getJournal() != null && !searchRequest.getJournal().isEmpty()) {
            uriBuilder.queryParam("venue", searchRequest.getJournal());
        }

        try {
            var response = apiClient.advancedSearch(uriBuilder);

            if (response == null) {
                log.warn("Received null response from Semantic Scholar API");
                return createEmptyResponse(searchRequest);
            }

            log.debug("API Response: {}", response);
            getInfo(response);

            List<ArticleDTO> articles = new ArrayList<>();
            if (response.getData() != null) {
                articles = response.getData().stream()
                        .map(mapper::mapToArticleDTO)
                        // Apply client-side filtering for more specific filters not supported by API
                        .filter(article -> mapper.filterByDocumentType(article, searchRequest.getDocumentType()))
                        .filter(article -> mapper.filterByLanguage(article, searchRequest.getLanguage()))
                        .collect(Collectors.toList());
            }

            return new SearchResponseDTO(
                    articles,
                    response.getTotal() != null ? response.getTotal() : 0,
                    searchRequest.getPage(),
                    calculateTotalPages(response.getTotal(), searchRequest.getSize()),
                    searchRequest.getQuery()
            );
        } catch (Exception e) {
            log.error("Error performing advanced search: {}", e.getMessage(), e);
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
        
        // Calculate how many recommendations to request per paper
        int paperCount = request.getPaperIds().size();
        int limitPerPaper = calculateLimitPerPaper(paperCount);
        
        log.info("Requesting {} recommendations per paper", limitPerPaper);
        
        // Use a map to track unique recommendations by ID
        Map<String, ArticleDTO> uniqueRecommendations = new ConcurrentHashMap<>();
        
        // Process each paper ID to get recommendations
        for (String paperId : request.getPaperIds()) {
            try {
                var response = apiClient.getRecommendationsForPaper(
                        paperId, 
                        limitPerPaper, 
                        RECOMMENDATION_FIELDS
                );
                
                if (response == null || response.getData() == null) {
                    log.warn("No recommendations found for paper ID: {}", paperId);
                    continue;
                }
                
                // Add all recommendations to the unique map
                response.getData().stream()
                        .map(mapper::mapToArticleDTO)
                        .forEach(article -> uniqueRecommendations.put(article.getId(), article));
                
                // If we already have enough recommendations, break early
                if (uniqueRecommendations.size() >= TARGET_RECOMMENDATIONS) {
                    break;
                }
            } catch (Exception e) {
                log.error("Error fetching recommendations for paper {}: {}", paperId, e.getMessage(), e);
            }
        }
        
        // Convert the map to a list, limiting to target count
        List<ArticleDTO> recommendations = new ArrayList<>(uniqueRecommendations.values());
        if (recommendations.size() > TARGET_RECOMMENDATIONS) {
            recommendations = recommendations.subList(0, TARGET_RECOMMENDATIONS);
        }
        
        log.info("Returning {} recommendations", recommendations.size());
        
        return new SearchResponseDTO(
                recommendations,
                recommendations.size(),
                0,
                1,
                "recommendations"
        );
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
