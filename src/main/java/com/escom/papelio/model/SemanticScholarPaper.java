package com.escom.papelio.model;

import lombok.Data;
import java.util.List;

@Data
public class SemanticScholarPaper {
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
