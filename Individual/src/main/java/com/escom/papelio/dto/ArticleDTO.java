package com.escom.papelio.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDTO {
    private String id;
    private String title;
    private String abstract_;
    private String doi;
    private List<String> authors;
    private String journal;
    private LocalDate publicationDate;
    private String documentType;
    private String language;
    private Integer citationCount;
    private String url;
}