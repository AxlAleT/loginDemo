package com.escom.papelio.model;

import lombok.Data;
import java.util.List;

@Data
public class SemanticScholarRecommendedPapers {
    private List<SemanticScholarPaper> recommendedPapers;
}