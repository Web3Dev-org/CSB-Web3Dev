package com.usv.app.config;

import com.usv.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/**
 * Verifică periodic rezervările care încep curând și trimite memento-urile in-app.
 * Se poate dezactiva cu {@code app.notifications.reminders.enabled=false}.
 */
@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.notifications.reminders.enabled", havingValue = "true", matchIfMissing = true)
public class ReminderScheduler {

    private final NotificationService notificationService;

    @Scheduled(
            initialDelayString = "${app.notifications.reminders.initial-delay-ms:30000}",
            fixedDelayString = "${app.notifications.reminders.interval-ms:60000}")
    public void sendDueReminders() {
        try {
            notificationService.sendDueReminders();
        } catch (RuntimeException e) {
            // Nu oprim planificatorul: următoarea rulare reîncearcă.
            log.error("Trimiterea memento-urilor a eșuat", e);
        }
    }
}
