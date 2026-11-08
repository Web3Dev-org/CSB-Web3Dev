package com.usv.app.controller;

import com.usv.app.entity.User;
import com.usv.app.dto.UserResponse;
import com.usv.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    // GET: http://localhost:8080/api/users
    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserResponse::fromEntity)
                .toList();
    }

    // GET: http://localhost:8080/api/users/1
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(UserResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

   @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody User user) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        if (user.getFullName() != null) {
            existingUser.setFullName(user.getFullName());
        }
        if (user.getPhone() != null) {
            existingUser.setPhone(user.getPhone());
        }
        if (user.getNotifyInApp() != null) {
            existingUser.setNotifyInApp(user.getNotifyInApp());
        }
        if (user.getNotifyEmail() != null) {
            existingUser.setNotifyEmail(user.getNotifyEmail());
        }
        if (user.getReminderMinutes() != 0) {
            existingUser.setReminderMinutes(user.getReminderMinutes());
        }

        User savedUser = userRepository.save(existingUser);
        return ResponseEntity.ok(UserResponse.fromEntity(savedUser));
    }
    // DELETE: http://localhost:8080/api/users/1
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found with id: " + id);
        }
        
        userRepository.deleteById(id);
        
        return ResponseEntity.noContent().build();
    }
}