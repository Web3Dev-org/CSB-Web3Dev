package com.usv.app.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "ENUM('user','admin')")
    @Builder.Default
    private Role role = Role.user;

    @Column(name = "status_code", length = 20, nullable = false)
    @Builder.Default
    private String statusCode = "student";

    @Column(name = "status_verified", nullable = false, columnDefinition = "TINYINT(1)")
    @Builder.Default
    private Boolean statusVerified = false; // <-- Boolean cu B mare

    @Column(name = "notify_in_app", nullable = false, columnDefinition = "TINYINT(1)")
    @Builder.Default
    private Boolean notifyInApp = true; // <-- Boolean cu B mare

    @Column(name = "notify_email", nullable = false, columnDefinition = "TINYINT(1)")
    @Builder.Default
    private Boolean notifyEmail = true; // <-- Boolean cu B mare

    @Column(name = "reminder_minutes", nullable = false)
    @Builder.Default
    private int reminderMinutes = 60;

    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1)")
    @Builder.Default
    private Boolean isActive = true; // <-- Boolean cu B mare

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    public enum Role {
        user, admin
    }
}