package com.usv.app.controller;

import com.usv.app.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.BookingsApi;
import ro.usv.sport.dto.BookingDetail;
import ro.usv.sport.dto.BookingPage;
import ro.usv.sport.dto.BookingRequest;
import ro.usv.sport.dto.BookingStatus;
import ro.usv.sport.dto.CancelBookingRequest;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class BookingController implements BookingsApi {

    private final BookingService bookingService;

    @Override
    public ResponseEntity<BookingPage> listMyBookings(
            Boolean activeOnly,
            BookingStatus status,
            OffsetDateTime from,
            OffsetDateTime to,
            String sort,
            Integer page,
            Integer size) {
        return ResponseEntity.ok(
                bookingService.listMyBookings(activeOnly, status, from, to, sort, page, size)
        );
    }

    @Override
    public ResponseEntity<BookingDetail> createBooking(
            BookingRequest bookingRequest,
            UUID idempotencyKey) {
        BookingDetail created = bookingService.createBooking(bookingRequest, idempotencyKey);
        return ResponseEntity
                .created(URI.create("/api/bookings/" + created.getId()))
                .body(created);
    }

    @Override
    public ResponseEntity<BookingDetail> getBookingById(Long id) {
        return ResponseEntity.ok(bookingService.getMyBookingById(id));
    }

    @Override
    public ResponseEntity<BookingDetail> cancelBooking(
            Long id,
            CancelBookingRequest cancelBookingRequest) {
        String reason = cancelBookingRequest != null ? cancelBookingRequest.getReason() : null;
        return ResponseEntity.ok(bookingService.cancelMyBooking(id, reason));
    }
}