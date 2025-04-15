package com.escom.papelio.model;

import lombok.Data;
import java.util.List;

@Data
public class SemanticScholarResponse {
    private Long total;
    private List<SemanticScholarPaper> data;
}
