package com.usv.app.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fereastra în care se poate rezerva (ora locală Europe/Bucharest):
 * de mâine până la a {@code horizonDays}-a zi calendaristică după azi, inclusiv.
 * Ziua curentă nu se poate rezerva.
 */
final class BookingWindow {

    private BookingWindow() {
    }

    static void validate(LocalDateTime startLocal, LocalDateTime nowLocal, int horizonDays) {
        LocalDate today = nowLocal.toLocalDate();
        LocalDate startDate = startLocal.toLocalDate();

        if (!startDate.isAfter(today)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rezervările se pot face începând cu ziua următoare."
            );
        }
        if (startDate.isAfter(today.plusDays(horizonDays))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rezervările pot fi făcute cu cel mult " + horizonDays + " zile în avans."
            );
        }
    }
}
