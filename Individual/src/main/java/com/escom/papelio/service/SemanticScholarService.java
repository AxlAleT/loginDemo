package com.escom.papelio.service;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.service.ArticleService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.Callable;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemanticScholarService implements ArticleService {

    private final WebClient webClient;
    private final Random random = new Random();
    private static final int MAX_RETRIES = 10;

    @Value("${api.semantic-scholar.base-url:https://api.semanticscholar.org/graph/v1}")
    private String apiBaseUrl;

    @Value("${api.semantic-scholar.key:#{null}}")
    private String apiKey;

    @Override
    @Cacheable(value = "basicSearchCache", key = "#searchRequest.query + '_' + #searchRequest.page + '_' + #searchRequest.size")
    public SearchResponseDTO searchArticles(SearchRequestDTO searchRequest) {
        log.info("Performing basic search with query: {}", searchRequest.getQuery());

        String uri = UriComponentsBuilder.fromHttpUrl(apiBaseUrl + "/paper/search")
                .queryParam("query", searchRequest.getQuery())
                .queryParam("offset", searchRequest.getPage() * searchRequest.getSize())
                .queryParam("limit", searchRequest.getSize())
                .queryParam("fields", "title,abstract,authors,venue,year,citationCount,url,externalIds")
                .build()
                .toUriString();

        try {
            var response = executeWithRetry(() -> webClient.get()
                    .uri(uri)
                    .headers(this::setHeaders)
                    .retrieve()
                    .bodyToMono(SemanticScholarResponse.class)
                    .block());

            if (response == null) {
                return createEmptyResponse(searchRequest);
            }

            List<ArticleDTO> articles = new ArrayList<>();
            if (response.getData() != null) {
                articles = response.getData().stream()
                        .map(this::mapToArticleDTO)
                        .toList();
            }

            return new SearchResponseDTO(
                    articles,
                    response.getTotal() != null ? response.getTotal() : 0,
                    searchRequest.getPage(),
                    calculateTotalPages(response.getTotal(), searchRequest.getSize()),
                    searchRequest.getQuery()
            );
        } catch (Exception e) {
            log.error("Error searching articles after retries: {}", e.getMessage(), e);
            return createEmptyResponse(searchRequest);
        }
    }

    @Override
    @Cacheable(value = "advancedSearchCache", key = "#searchRequest.toString()")
    public SearchResponseDTO advancedSearch(SearchRequestDTO searchRequest) {
        log.info("Performing advanced search with filters: {}", searchRequest);

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromHttpUrl(apiBaseUrl + "/paper/search")
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

        String uri = uriBuilder.build().toUriString();

        try {
            var response = executeWithRetry(() -> webClient.get()
                    .uri(uri)
                    .headers(this::setHeaders)
                    .retrieve()
                    .bodyToMono(SemanticScholarResponse.class)
                    .block());

            if (response == null) {
                return createEmptyResponse(searchRequest);
            }

            List<ArticleDTO> articles = new ArrayList<>();
            if (response.getData() != null) {
                articles = response.getData().stream()
                        .map(this::mapToArticleDTO)
                        // Apply client-side filtering for more specific filters not supported by API
                        .filter(article -> filterByDocumentType(article, searchRequest.getDocumentType()))
                        .filter(article -> filterByLanguage(article, searchRequest.getLanguage()))
                        .toList();
            }

            return new SearchResponseDTO(
                    articles,
                    response.getTotal() != null ? response.getTotal() : 0,
                    searchRequest.getPage(),
                    calculateTotalPages(response.getTotal(), searchRequest.getSize()),
                    searchRequest.getQuery()
            );
        } catch (Exception e) {
            log.error("Error performing advanced search after retries: {}", e.getMessage(), e);
            return createEmptyResponse(searchRequest);
        }
    }

    @Override
    @Cacheable(value = "articleDetails", key = "#id")
    public Optional<ArticleDTO> getArticleById(String id) {
        log.info("Fetching article details for ID: {}", id);

        String uri = UriComponentsBuilder.fromHttpUrl(apiBaseUrl + "/paper/" + id)
                .queryParam("fields", "title,abstract,authors,venue,year,citationCount,url,externalIds,references")
                .build()
                .toUriString();

        try {
            var response = executeWithRetry(() -> webClient.get()
                    .uri(uri)
                    .headers(this::setHeaders)
                    .retrieve()
                    .bodyToMono(SemanticScholarPaper.class)
                    .block());

            if (response == null) {
                return Optional.empty();
            }

            return Optional.of(mapToArticleDTO(response));
        } catch (Exception e) {
            log.error("Error fetching article details after retries: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    /**
     * Executes a function with retry logic for handling 429 Too Many Requests errors
     * Will retry up to MAX_RETRIES times with a random delay between 0-1 second
     * @param supplier The function to execute that might throw a 429 exception
     * @return The result of the function execution
     * @param <T> The return type of the function
     * @throws Exception If the function still fails after all retries
     */
    private <T> T executeWithRetry(Supplier<T> supplier) throws Exception {
        int attempts = 0;
        Exception lastException = null;
        
        while (attempts < MAX_RETRIES) {
            try {
                return supplier.get();
            } catch (WebClientResponseException e) {
                if (e.getStatusCode().value() == 429) {
                    attempts++;
                    lastException = e;
                    
                    // Calculate random delay between 0-1000ms
                    long delayMillis = random.nextInt(1000);
                    log.warn("Received 429 Too Many Requests, retry attempt {}/{} after {}ms delay", 
                            attempts, MAX_RETRIES, delayMillis);
                    
                    try {
                        Thread.sleep(delayMillis);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Interrupted during retry delay", ie);
                    }
                } else {
                    throw e;
                }
            } catch (Exception e) {
                throw e;
            }
        }
        
        log.error("Failed after {} retry attempts", MAX_RETRIES);
        if (lastException != null) {
            throw lastException;
        }
        throw new RuntimeException("Failed after maximum retries");
    }

    private void setHeaders(HttpHeaders headers) {
        if (apiKey != null && !apiKey.isEmpty()) {
            headers.set("x-api-key", apiKey);
        }
    }

    private ArticleDTO mapToArticleDTO(SemanticScholarPaper paper) {
        ArticleDTO dto = new ArticleDTO();
        dto.setId(paper.getPaperId());
        dto.setTitle(paper.getTitle());
        dto.setAbstract_(paper.getAbstract_());

        // Set DOI if available
        if (paper.getExternalIds() != null && paper.getExternalIds().getDoi() != null) {
            dto.setDoi(paper.getExternalIds().getDoi());
        }

        // Extract authors
        if (paper.getAuthors() != null) {
            dto.setAuthors(paper.getAuthors().stream()
                    .map(author -> author.getName())
                    .toList());
        } else {
            dto.setAuthors(new ArrayList<>());
        }

        dto.setJournal(paper.getVenue());

        // Set publication date if year is available
        if (paper.getYear() != null) {
            // Default to January 1st of the publication year
            dto.setPublicationDate(java.time.LocalDate.of(paper.getYear(), 1, 1));
        }

        dto.setCitationCount(paper.getCitationCount());
        dto.setUrl(paper.getUrl());

        return dto;
    }

    private boolean filterByDocumentType(ArticleDTO article, String documentType) {
        if (documentType == null || documentType.isEmpty()) {
            return true;
        }
        // Simple implementation - in real world would need proper logic
        return documentType.equalsIgnoreCase(article.getDocumentType());
    }

    private boolean filterByLanguage(ArticleDTO article, String language) {
        if (language == null || language.isEmpty()) {
            return true;
        }
        // Simple implementation - in real world would need proper logic
        return language.equalsIgnoreCase(article.getLanguage());
    }

    private int calculateTotalPages(Long total, int size) {
        if (total == null || total == 0 || size == 0) {
            return 0;
        }
        return (int) Math.ceil((double) total / size);
    }

    private SearchResponseDTO createEmptyResponse(SearchRequestDTO request) {
        return new SearchResponseDTO(
                new ArrayList<>(),
                0,
                request.getPage(),
                0,
                request.getQuery()
        );
    }

    // Inner classes for API responses

    @Data
    private static class SemanticScholarResponse {
        private Long total;
        private List<SemanticScholarPaper> data;
    }

    @Data
    private static class SemanticScholarPaper {
        private String paperId;
        private String title;
        private String abstract_;
        private List<Author> authors;
        private String venue;
        private Integer year;
        private Integer citationCount;
        private String url;
        private ExternalIds externalIds;
    }

    @Data
    private static class Author {
        private String authorId;
        private String name;
    }

    @Data
    private static class ExternalIds {
        private String doi;
        private String arxiv;
        private String pubmed;
    }
}
