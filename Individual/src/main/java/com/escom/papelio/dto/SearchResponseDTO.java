package com.escom.papelio.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponseDTO {
    private List<ArticleDTO> articles;
    private long totalResults;
    private int currentPage;
    private int totalPages;
    private String query;
}