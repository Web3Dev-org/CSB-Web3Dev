package com.usv.app.controller;

import com.usv.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.NotificationsApi;
import ro.usv.sport.dto.Notification;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class NotificationController implements NotificationsApi {

    private final NotificationService notificationService;

    @Override
    public ResponseEntity<List<Notification>> listMyNotifications(Boolean unreadOnly) {
        return ResponseEntity.ok(notificationService.listMine(unreadOnly));
    }

    @Override
    public ResponseEntity<Void> markNotificationAsRead(Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }
}
