package com.escom.papelio.service;

import com.escom.papelio.dto.RegistroDTO;
import com.escom.papelio.model.Usuario;
import com.escom.papelio.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioService {
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public void registrarUsuario(RegistroDTO registroDTO) {
        if (usuarioRepository.existsByEmail(registroDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(registroDTO.getEmail());
        usuario.setPassword(passwordEncoder.encode(registroDTO.getPassword()));
        usuario.setNombre(registroDTO.getNombre());
        usuario.setRol("ROLE_USER");

        usuarioRepository.save(usuario);
    }

    // Método para crear un usuario administrador (para uso inicial)
    public void crearAdministrador(String email, String password, String nombre) {
        if (usuarioRepository.existsByEmail(email)) {
            return; // Si ya existe, no hacemos nada
        }

        Usuario admin = new Usuario();
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setNombre(nombre);
        admin.setRol("ROLE_ADMIN");

        usuarioRepository.save(admin);
    }
}