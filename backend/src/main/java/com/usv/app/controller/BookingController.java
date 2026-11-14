
package com.usv.app.controller;

import com.usv.app.repository.BookingRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "http://localhost:5173")
public class BookingController {

    private final BookingRepository bookingRepository;

    public BookingController(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserBookings(
            @PathVariable Long userId) {

        List<Map<String, Object>> bookings =
                bookingRepository.findBookingsByUserId(userId);

        return ResponseEntity.ok(bookings);
    }

    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestBody Map<String, Object> payload) {

        try {
            if (payload.get("facilityId") == null) {
                return ResponseEntity.badRequest()
                        .body("ID-ul facilității lipsește.");
            }

            if (payload.get("startAt") == null) {
                return ResponseEntity.badRequest()
                        .body("Data rezervării lipsește.");
            }

            if (payload.get("hoursCount") == null) {
                return ResponseEntity.badRequest()
                        .body("Numărul de ore lipsește.");
            }

            if (payload.get("totalAmount") == null) {
                return ResponseEntity.badRequest()
                        .body("Suma rezervării lipsește.");
            }

            Long facilityId = Long.valueOf(
                    payload.get("facilityId").toString()
            );

            Long userId = payload.get("userId") != null
                    ? Long.valueOf(payload.get("userId").toString())
                    : 1L;

            String startAt = payload.get("startAt").toString();

            Integer hoursCount = Integer.valueOf(
                    payload.get("hoursCount").toString()
            );

            String type = payload.get("type") != null
                    ? payload.get("type").toString()
                    : "ora";

            List<String> equipment = payload.get("equipment")
                    instanceof List
                    ? (List<String>) payload.get("equipment")
                    : List.of();

            Double totalAmount = Double.valueOf(
                    payload.get("totalAmount").toString()
            );

            if (hoursCount <= 0) {
                return ResponseEntity.badRequest()
                        .body("Numărul de ore trebuie să fie pozitiv.");
            }

            if (totalAmount < 0) {
                return ResponseEntity.badRequest()
                        .body("Suma nu poate fi negativă.");
            }

            if (!type.equalsIgnoreCase("ora")
                    && !type.equalsIgnoreCase("joc")) {
                return ResponseEntity.badRequest()
                        .body("Tipul rezervării este invalid.");
            }

            Long newId = bookingRepository.insertBooking(
                    userId,
                    facilityId,
                    startAt,
                    hoursCount,
                    type,
                    equipment,
                    totalAmount
            );

            Map<String, Object> response = new HashMap<>();

            response.put("id", newId);
            response.put("facilityId", facilityId);
            response.put("message",
                    "Rezervarea a fost salvată în baza de date.");

            return ResponseEntity.ok(response);

        } catch (DataIntegrityViolationException e) {

            return ResponseEntity.badRequest()
                    .body("Acest interval orar este deja ocupat "
                            + "sau datele sunt invalide.");

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body("Eroare la salvarea rezervării: "
                            + e.getMessage());
        }
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long id) {

        int updated =
                bookingRepository.cancelBookingById(id);

        if (updated == 0) {
            return ResponseEntity.badRequest()
                    .body("Rezervarea nu poate fi anulată "
                            + "(fie a fost deja anulată, "
                            + "fie mai sunt sub 12 ore).");
        }

        return ResponseEntity.ok(
                "Rezervare anulată cu succes."
        );
    }
}
