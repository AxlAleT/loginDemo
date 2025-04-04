package com.escom.papelio.controller;
import com.escom.papelio.dto.UserDTO;
import com.escom.papelio.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminRESTController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> listarUsuarios() {
        return ResponseEntity.ok(adminService.listarUsuarios());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDTO> obtenerUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.obtenerUsuarioPorId(id));
    }

    @PostMapping("/users")
    public ResponseEntity<UserDTO> crearUsuario(@RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(adminService.crearUsuario(userDTO));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserDTO> actualizarUsuario(@PathVariable Long id, @RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(adminService.actualizarUsuario(id, userDTO));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id) {
        adminService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }
}