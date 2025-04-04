package com.escom.papelio.service;

import com.escom.papelio.dto.UserDTO;
import com.escom.papelio.model.User;
import com.escom.papelio.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDTO> listarUsuarios() {
        return userRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public UserDTO obtenerUsuarioPorId(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User no encontrado"));
        return mapToDTO(user);
    }

    public UserDTO crearUsuario(UserDTO userDTO) {
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        User user = new User();
        user.setEmail(userDTO.getEmail());
        user.setNombre(userDTO.getNombre());

        // Codificar contraseña solo si se proporciona
        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        } else {
            throw new RuntimeException("La contraseña es obligatoria");
        }

        // Validar rol
        if (userDTO.getRol() != null && (userDTO.getRol().equals("ROLE_ADMIN") || userDTO.getRol().equals("ROLE_USER"))) {
            user.setRol(userDTO.getRol());
        } else {
            user.setRol("ROLE_USER"); // Rol predeterminado
        }

        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }

    public UserDTO actualizarUsuario(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User no encontrado"));

        // Verificar si el email ya existe y no es del mismo user
        if (!user.getEmail().equals(userDTO.getEmail()) && userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        user.setEmail(userDTO.getEmail());
        user.setNombre(userDTO.getNombre());

        // Actualizar contraseña solo si se proporciona
        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Validar rol
        if (userDTO.getRol() != null && (userDTO.getRol().equals("ROLE_ADMIN") || userDTO.getRol().equals("ROLE_USER"))) {
            user.setRol(userDTO.getRol());
        }

        User saved = userRepository.save(user);
        return mapToDTO(saved);
    }

    public void eliminarUsuario(Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User no encontrado");
        }
        userRepository.deleteById(id);
    }

    private UserDTO mapToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setNombre(user.getNombre());
        dto.setRol(user.getRol());
        // No incluir contraseña en la respuesta
        return dto;
    }
}