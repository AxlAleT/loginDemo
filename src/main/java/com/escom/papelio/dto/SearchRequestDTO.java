package com.escom.papelio.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequestDTO {
    @NotBlank(message = "Query cannot be empty")
    private String query;

    // Advanced search filters
    private LocalDate fromDate;
    private LocalDate toDate;
    private String journal;
    private String documentType;
    private String language;
    private Integer page = 0;
    private Integer size = 10;
}