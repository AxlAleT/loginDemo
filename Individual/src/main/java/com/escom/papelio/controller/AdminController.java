package com.escom.papelio.controller;
import com.escom.papelio.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
@PreAuthorize("hasRole('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping
    public String adminPanel(Model model) {
        model.addAttribute("usuarios", adminService.listarUsuarios());
        return "admin/panel";
    }

    @GetMapping("/users")
    public String gestionUsuarios(Model model) {
        model.addAttribute("usuarios", adminService.listarUsuarios());
        return "admin/users";
    }
}