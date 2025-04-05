package com.escom.papelio.service;

import com.escom.papelio.dto.RegisterDTO;
import com.escom.papelio.dto.UserDTO;
import com.escom.papelio.model.User;
import com.escom.papelio.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void registrarUsuario(RegisterDTO registerDTO) {
        if (userRepository.existsByEmail(registerDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        User user = new User();
        user.setEmail(registerDTO.getEmail());
        user.setPassword(passwordEncoder.encode(registerDTO.getPassword()));
        user.setName(registerDTO.getName());
        user.setRole("ROLE_USER");

        userRepository.save(user);
    }

    // Método para crear un usuario administrador (para uso inicial)
    public void crearAdministrador(String email, String password, String nombre) {
        if (userRepository.existsByEmail(email)) {
            return; // Si ya existe, no hacemos nada
        }

        User admin = new User();
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setName(nombre);
        admin.setRole("ROLE_ADMIN");

        userRepository.save(admin);
    }

    // New methods for profile management
    public UserDTO getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User no encontrado"));

        return convertToDTO(user);
    }

    public UserDTO updateUserProfile(String currentEmail, UserDTO userDTO) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("User no encontrado"));

        // Update user details
        user.setName(userDTO.getName());

        // Optional: update email (requires additional validation)
        if (!currentEmail.equals(userDTO.getEmail()) &&
                userRepository.existsByEmail(userDTO.getEmail())) {
            throw new RuntimeException("El email ya está registrado por otro user");
        }

        // If email is changing, update it
        if (!currentEmail.equals(userDTO.getEmail())) {
            user.setEmail(userDTO.getEmail());
        }

        // Update password if provided
        if (userDTO.getPassword() != null && !userDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }

        // Save the updated user
        User updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }

    // Helper method to convert User to UserDTO
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setRole(user.getRole());
        // Don't set password in DTO for security
        return dto;
    }
}