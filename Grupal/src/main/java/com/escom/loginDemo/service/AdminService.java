package com.escom.loginDemo.service;

import com.escom.loginDemo.dto.UsuarioDTO;
import com.escom.loginDemo.model.Usuario;
import com.escom.loginDemo.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UsuarioDTO> listarUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public UsuarioDTO obtenerUsuarioPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return mapToDTO(usuario);
    }

    public UsuarioDTO crearUsuario(UsuarioDTO usuarioDTO) {
        if (usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        Usuario usuario = new Usuario();
        usuario.setEmail(usuarioDTO.getEmail());
        usuario.setNombre(usuarioDTO.getNombre());

        // Codificar contraseña solo si se proporciona
        if (usuarioDTO.getPassword() != null && !usuarioDTO.getPassword().isEmpty()) {
            usuario.setPassword(passwordEncoder.encode(usuarioDTO.getPassword()));
        } else {
            throw new RuntimeException("La contraseña es obligatoria");
        }

        // Validar rol
        if (usuarioDTO.getRol() != null && (usuarioDTO.getRol().equals("ROLE_ADMIN") || usuarioDTO.getRol().equals("ROLE_USER"))) {
            usuario.setRol(usuarioDTO.getRol());
        } else {
            usuario.setRol("ROLE_USER"); // Rol predeterminado
        }

        Usuario saved = usuarioRepository.save(usuario);
        return mapToDTO(saved);
    }

    public UsuarioDTO actualizarUsuario(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Verificar si el email ya existe y no es del mismo usuario
        if (!usuario.getEmail().equals(usuarioDTO.getEmail()) && usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        usuario.setEmail(usuarioDTO.getEmail());
        usuario.setNombre(usuarioDTO.getNombre());

        // Actualizar contraseña solo si se proporciona
        if (usuarioDTO.getPassword() != null && !usuarioDTO.getPassword().isEmpty()) {
            usuario.setPassword(passwordEncoder.encode(usuarioDTO.getPassword()));
        }

        // Validar rol
        if (usuarioDTO.getRol() != null && (usuarioDTO.getRol().equals("ROLE_ADMIN") || usuarioDTO.getRol().equals("ROLE_USER"))) {
            usuario.setRol(usuarioDTO.getRol());
        }

        Usuario saved = usuarioRepository.save(usuario);
        return mapToDTO(saved);
    }

    public void eliminarUsuario(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new RuntimeException("Usuario no encontrado");
        }
        usuarioRepository.deleteById(id);
    }

    private UsuarioDTO mapToDTO(Usuario usuario) {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(usuario.getId());
        dto.setEmail(usuario.getEmail());
        dto.setNombre(usuario.getNombre());
        dto.setRol(usuario.getRol());
        // No incluir contraseña en la respuesta
        return dto;
    }
}