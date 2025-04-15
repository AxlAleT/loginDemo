package com.escom.papelio.client;

import com.escom.papelio.model.SemanticScholarPaper;
import com.escom.papelio.model.SemanticScholarResponse;
import com.escom.papelio.util.ApiRetryUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
@Slf4j
public class SemanticScholarApiClient {
    private final WebClient webClient;
    private final ApiRetryUtil apiRetryUtil;
    
    @Value("${api.semantic-scholar.base-url:https://api.semanticscholar.org/graph/v1}")
    private String apiBaseUrl;

    @Value("${api.semantic-scholar.key:#{null}}")
    private String apiKey;
    
    public SemanticScholarResponse searchPapers(String query, int offset, int limit, String fields) {
        String uri = UriComponentsBuilder.fromUriString(apiBaseUrl + "/paper/search/bulk")
                .queryParam("query", query)
                .queryParam("offset", offset)
                .queryParam("limit", limit)
                .queryParam("fields", fields)
                .build().toUriString();
                
        log.debug("Calling Semantic Scholar API with URL: {}", uri);
        
        return apiRetryUtil.executeWithRetry(() -> 
            webClient.get()
                .uri(uri)
                .headers(this::setHeaders)
                .retrieve()
                .bodyToMono(SemanticScholarResponse.class)
                .block()
        );
    }
    
    public SemanticScholarResponse advancedSearch(UriComponentsBuilder uriBuilder) {
        String uri = uriBuilder.build().toUriString();
        log.debug("Calling Semantic Scholar API with URL: {}", uri);
        
        return apiRetryUtil.executeWithRetry(() -> 
            webClient.get()
                .uri(uri)
                .headers(this::setHeaders)
                .retrieve()
                .bodyToMono(SemanticScholarResponse.class)
                .block()
        );
    }
    
    public SemanticScholarPaper getPaperById(String id, String fields) {
        String uri = UriComponentsBuilder.fromUriString(apiBaseUrl + "/paper/" + id)
                .queryParam("fields", fields)
                .build().toUriString();
                
        log.debug("Calling Semantic Scholar API with URL: {}", uri);
        
        return apiRetryUtil.executeWithRetry(() -> 
            webClient.get()
                .uri(uri)
                .headers(this::setHeaders)
                .retrieve()
                .bodyToMono(SemanticScholarPaper.class)
                .block()
        );
    }
    
    public SemanticScholarResponse getRecommendationsForPaper(String paperId, int limit, String fields) {
        String uri = UriComponentsBuilder.fromUriString(apiBaseUrl + "/paper/" + paperId + "/recommendations")
                .queryParam("limit", limit)
                .queryParam("fields", fields)
                .build().toUriString();

        log.debug("Calling Semantic Scholar API for recommendations with URL: {}", uri);

        return apiRetryUtil.executeWithRetry(() ->
            webClient.get()
                .uri(uri)
                .headers(this::setHeaders)
                .retrieve()
                .bodyToMono(SemanticScholarResponse.class)
                .block()
        );
    }

    private void setHeaders(HttpHeaders headers) {
        if (apiKey != null && !apiKey.isEmpty()) {
            headers.set("x-api-key", apiKey);
        }
    }
};