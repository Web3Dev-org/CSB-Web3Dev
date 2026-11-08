package com.usv.app.controller;

import com.usv.app.dto.LoginRequest;
import com.usv.app.dto.SignUpRequest;
import com.usv.app.dto.UserResponse;
import com.usv.app.entity.User;
import com.usv.app.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body("Email-ul este deja folosit!");
        }
        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .passwordHash(request.password())
                .build();

        User savedUser = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.fromEntity(savedUser));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElse(null);

        // Verificare simplă (vei înlocui cu Spring Security mai târziu)
        if (user == null || !user.getPasswordHash().equals(request.password())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Email sau parolă incorectă!");
        }

        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }
}