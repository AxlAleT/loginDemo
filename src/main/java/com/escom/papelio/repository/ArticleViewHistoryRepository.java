package com.escom.papelio.repository;

import com.escom.papelio.model.ArticleViewHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleViewHistoryRepository extends JpaRepository<ArticleViewHistory, Long> {
    List<ArticleViewHistory> findByUserEmailOrderByViewDateDesc(String userEmail);

    @Query("SELECT avh.articleId, COUNT(avh) as count FROM ArticleViewHistory avh " +
            "GROUP BY avh.articleId ORDER BY count DESC LIMIT 10")
    List<Object[]> findMostViewedArticles();
}
