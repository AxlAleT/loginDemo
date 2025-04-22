package com.escom.papelio.controller;

import com.escom.papelio.dto.SearchRequestDTO;
import com.escom.papelio.dto.SearchResponseDTO;
import com.escom.papelio.service.ArticleService;
import com.escom.papelio.service.SearchHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Controller
@RequestMapping("/search")
@RequiredArgsConstructor
public class SearchController {

    private final ArticleService articleService;
    private final SearchHistoryService searchHistoryService;

    @GetMapping
    public String showSearchPage(Model model) {
        model.addAttribute("searchRequest", new SearchRequestDTO());
        return "user/search";
    }

    @GetMapping("/advanced")
    public String showAdvancedSearchPage(Model model) {
        model.addAttribute("searchRequest", new SearchRequestDTO());
        return "search/advanced";
    }

    @PostMapping("/results")
    public String performSearch(@ModelAttribute SearchRequestDTO searchRequest,
                                Model model,
                                Authentication authentication) {

        SearchResponseDTO results = articleService.searchArticles(searchRequest);
        model.addAttribute("results", results);

        // Log search history if user is authenticated
        if (authentication != null) {
            searchHistoryService.saveSearchQuery(authentication.getName(), searchRequest.getQuery());
        }

        return "search/results";
    }

    @GetMapping("/history")
    public String viewSearchHistory(Model model, Principal principal) {
        if (principal != null) {
            model.addAttribute("searchHistory",
                    searchHistoryService.getUserSearchHistory(principal.getName()));
        }
        return "search/history";
    }

    @GetMapping("/article/{id}")
    public String viewArticleDetails(@PathVariable String id, Model model) {
        var article = articleService.getArticleById(id);

        if (article.isEmpty()) {
            return "redirect:/search?error=Article+not+found";
        }

        model.addAttribute("article", article.get());
        return "search/article-details";
    }
}