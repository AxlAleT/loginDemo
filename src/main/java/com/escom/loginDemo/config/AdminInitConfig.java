package com.escom.loginDemo.config;

import com.escom.loginDemo.service.UsuarioService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminInitConfig {

    @Bean
    public CommandLineRunner initAdmin(UsuarioService usuarioService) {
        return args -> {
            // Crea un usuario administrador predeterminado si no existe
            usuarioService.crearAdministrador(
                    "admin@example.com",
                    "admin123",
                    "Administrador"
            );
        };
    }
}