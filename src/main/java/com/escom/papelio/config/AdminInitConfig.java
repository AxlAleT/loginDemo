package com.escom.papelio.config;

import com.escom.papelio.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminInitConfig {

    @Bean
    public CommandLineRunner initAdmin(UserService userService) {
        return args -> {
            userService.crearAdministrador("admin@example.com", "admin123", "Administrador");
        };
    }
}