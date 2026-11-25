package com.usv.app.controller;

import com.usv.app.service.FacilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.FacilitiesApi;
import ro.usv.sport.dto.Facility;
import ro.usv.sport.dto.SlotAvailability;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class FacilityController implements FacilitiesApi {

    private final FacilityService facilityService;

    @Override
    public ResponseEntity<List<Facility>> listFacilities() {
        return ResponseEntity.ok(facilityService.listActiveFacilities());
    }

    @Override
    public ResponseEntity<List<SlotAvailability>> getFacilityAvailability(Long id, LocalDate date) {
        return ResponseEntity.ok(facilityService.getAvailability(id, date));
    }
}
