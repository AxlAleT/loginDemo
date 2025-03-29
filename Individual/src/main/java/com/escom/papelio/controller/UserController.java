package com.escom.papelio.controller;

import com.escom.papelio.model.Usuario;
import com.escom.papelio.repository.UsuarioRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import lombok.RequiredArgsConstructor;

import java.security.Principal;

@Controller
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UsuarioRepository usuarioRepository;

    @GetMapping
    public String dashboard() {
        return "user/dashboard";
    }

    @GetMapping("/perfil")
    public String mostrarPerfil(Model model, Principal principal) {
        String email = principal.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        model.addAttribute("usuario", usuario);
        return "user/profile";
    }
}