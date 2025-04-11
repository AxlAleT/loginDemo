package com.escom.papelio.repository;

import com.escom.papelio.model.SearchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    List<SearchHistory> findByUserEmailOrderBySearchDateDesc(String userEmail);

    @Query("SELECT sh.searchQuery, COUNT(sh) as count FROM SearchHistory sh " +
            "GROUP BY sh.searchQuery ORDER BY count DESC LIMIT 10")
    List<Object[]> findTopSearchQueries();
}