package com.escom.papelio.service;

import com.escom.papelio.model.SearchHistory;
import com.escom.papelio.repository.SearchHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchHistoryService {

    private final SearchHistoryRepository searchHistoryRepository;

    /**
     * Save a user's search query to history
     * @param userEmail the user's email
     * @param query the search query
     */
    public void saveSearchQuery(String userEmail, String query) {
        SearchHistory history = new SearchHistory();
        history.setUserEmail(userEmail);
        history.setSearchQuery(query);
        history.setSearchDate(LocalDateTime.now());

        searchHistoryRepository.save(history);
        log.info("Saved search history for user {}: {}", userEmail, query);
    }

    /**
     * Get search history for a specific user
     * @param userEmail the user's email
     * @return list of search history entries
     */
    public List<SearchHistory> getUserSearchHistory(String userEmail) {
        return searchHistoryRepository.findByUserEmailOrderBySearchDateDesc(userEmail);
    }

    /**
     * Get top searched queries across all users
     * @return list of top search queries with counts
     */
    public List<Object[]> getTopSearchQueries() {
        return searchHistoryRepository.findTopSearchQueries();
    }
}