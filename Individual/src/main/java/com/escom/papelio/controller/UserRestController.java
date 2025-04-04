package com.escom.papelio.controller;

import com.escom.papelio.dto.UserDTO;
import com.escom.papelio.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserRestController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<UserDTO> getUserProfile(Authentication authentication) {
        String email = authentication.getName();
        UserDTO userDTO = userService.getUserProfile(email);
        return ResponseEntity.ok(userDTO);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateUserProfile(
            @RequestBody UserDTO userDTO,
            Authentication authentication) {
        String email = authentication.getName();
        UserDTO updatedUser = userService.updateUserProfile(email, userDTO);
        return ResponseEntity.ok(updatedUser);
    }
}