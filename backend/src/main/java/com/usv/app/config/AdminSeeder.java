package com.usv.app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.usv.app.entity.User;
import com.usv.app.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@usv.ro}")
    private String adminEmail;

    @Value("${app.admin.password:AdminUSV2026!}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setFullName("Administrator Sport USV");
            admin.setRole(User.Role.admin); // Verifică cum ai definit enum-ul Role în entitatea User
            admin.setStatusVerified(true);
            userRepository.save(admin);
        }
    }
}