package com.usv.app.controller;

import com.usv.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.UsersApi;
import ro.usv.sport.dto.UpdateUserRequest;
import ro.usv.sport.dto.User;

@RestController
@RequiredArgsConstructor
public class UserController implements UsersApi {

    private final UserService userService;

    @Override
    public ResponseEntity<User> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    @Override
    public ResponseEntity<User> updateCurrentUser(UpdateUserRequest updateUserRequest) {
        return ResponseEntity.ok(userService.updateCurrentUserProfile(updateUserRequest));
    }
}