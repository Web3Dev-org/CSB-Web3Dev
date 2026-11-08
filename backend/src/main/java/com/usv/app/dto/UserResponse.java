package com.usv.app.dto;

import com.usv.app.entity.User;
import java.time.LocalDateTime;

public record UserResponse(
    Long id,
    String email,
    String fullName,
    String phone,
    User.Role role,
    String statusCode,
    boolean statusVerified,
    boolean notifyInApp,
    boolean notifyEmail,
    int reminderMinutes,
    boolean isActive,
    LocalDateTime createdAt,
    LocalDateTime lastLoginAt
) {
    // Metodă ajutătoare pentru a converti o Entitate în DTO
   public static UserResponse fromEntity(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getFullName(),
        user.getPhone(),
        user.getRole(),
        user.getStatusCode(),
        user.getStatusVerified(), 
        user.getNotifyInApp(),     
        user.getNotifyEmail(),
        user.getReminderMinutes(),
        user.getIsActive(),
        user.getCreatedAt(),
        user.getLastLoginAt()
    );
}
}