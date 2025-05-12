package com.escom.papelio.repository;

import com.escom.papelio.model.ArticleFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleFavoriteRepository extends JpaRepository<ArticleFavorite, Long> {
    
    List<ArticleFavorite> findByUserEmailOrderByFavoriteDateDesc(String userEmail);
    
    Optional<ArticleFavorite> findByUserEmailAndArticleId(String userEmail, String articleId);
    
    boolean existsByUserEmailAndArticleId(String userEmail, String articleId);
    
    void deleteByUserEmailAndArticleId(String userEmail, String articleId);
}
