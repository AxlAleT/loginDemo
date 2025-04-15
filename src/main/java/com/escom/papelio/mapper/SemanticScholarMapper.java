package com.escom.papelio.mapper;

import com.escom.papelio.dto.ArticleDTO;
import com.escom.papelio.model.Author;
import com.escom.papelio.model.SemanticScholarPaper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.stream.Collectors;

@Component
@Slf4j
public class SemanticScholarMapper {

    public ArticleDTO mapToArticleDTO(SemanticScholarPaper paper) {
        log.debug("Mapping paper to ArticleDTO: {}", paper.getPaperId());

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
                    .map(Author::getName)
                    .collect(Collectors.toList()));
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
    
    public boolean filterByDocumentType(ArticleDTO article, String documentType) {
        if (documentType == null || documentType.isEmpty()) {
            return true;
        }
        // Simple implementation - in real world would need proper logic
        return documentType.equalsIgnoreCase(article.getDocumentType());
    }

    public boolean filterByLanguage(ArticleDTO article, String language) {
        if (language == null || language.isEmpty()) {
            return true;
        }
        // Simple implementation - in real world would need proper logic
        return language.equalsIgnoreCase(article.getLanguage());
    }
}
