package com.escom.loginDemo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @Email(message = "Debe ser un email válido")
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    @NotEmpty(message = "El nombre no puede estar vacío")
    private String nombre;

    private String rol;
}