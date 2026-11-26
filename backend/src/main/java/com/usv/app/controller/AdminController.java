package com.usv.app.controller;

import com.usv.app.service.BookingService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.AdminApi;
import ro.usv.sport.dto.AdminBookingRequest;
import ro.usv.sport.dto.BookingDetail;
import ro.usv.sport.dto.BookingStatus;
import ro.usv.sport.dto.CancelBookingRequest;
import ro.usv.sport.dto.FacilityBlock;
import ro.usv.sport.dto.FacilityBlockRequest;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AdminController implements AdminApi {

    private final BookingService bookingService;

    @Override
    public ResponseEntity<List<AdminBookingRequest>> listAdminBookings(BookingStatus status) {
        return ResponseEntity.ok(bookingService.listAdminBookings(status));
    }

    @Override
    public ResponseEntity<BookingDetail> approveBooking(Long id) {
        return ResponseEntity.ok(bookingService.approveBooking(id));
    }

    @Override
    public ResponseEntity<BookingDetail> rejectBooking(
            Long id,
            CancelBookingRequest cancelBookingRequest) {
        String reason = cancelBookingRequest != null ? cancelBookingRequest.getReason() : null;
        return ResponseEntity.ok(bookingService.rejectBooking(id, reason));
    }

    @Override
    public ResponseEntity<FacilityBlock> createFacilityBlock(@Valid FacilityBlockRequest facilityBlockRequest) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'createFacilityBlock'");
    }

    @Override
    public ResponseEntity<List<FacilityBlock>> listFacilityBlocks(@Min(1) @Valid Long facilityId) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'listFacilityBlocks'");
    }
}