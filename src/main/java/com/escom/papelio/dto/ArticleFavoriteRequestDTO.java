package com.escom.papelio.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleFavoriteRequestDTO {
    
    @NotBlank(message = "Article ID is required")
    private String articleId;
    
    @NotBlank(message = "Title is required")
    private String title;
}
