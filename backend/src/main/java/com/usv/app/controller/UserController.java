package com.usv.app.controller;

import com.usv.app.entity.User;
import com.usv.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.BeanUtils;
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
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // GET: http://localhost:8080/api/users/1
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST: http://localhost:8080/api/users
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }

    // POST: http://localhost:8080/api/1
    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        final User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        BeanUtils.copyProperties(user, existingUser, "id", "createdAt");

        return userRepository.save(existingUser);
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