package com.usv.app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.Facility;
import ro.usv.sport.dto.SlotAvailability;
import ro.usv.sport.dto.SlotAvailability.StatusEnum;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FacilityService {

    /** Intervalul suportat de tipul MySQL DATETIME ('1000-01-01' .. '9999-12-31'). */
    private static final LocalDate MIN_SUPPORTED_DATE = LocalDate.of(1000, 1, 1);
    private static final LocalDate MAX_SUPPORTED_DATE = LocalDate.of(9999, 12, 30);

    private final JdbcTemplate jdbcTemplate;

    /**
     * Preia din DB toate facilitățile active împreună cu programul săptămânal.
     * Două interogări (facilități + program) în loc de una per facilitate.
     */
    @Transactional(readOnly = true)
    public List<Facility> listActiveFacilities() {
        List<Map<String, Object>> facilityRows = jdbcTemplate.queryForList(
                "SELECT id, name, description, price_per_hour, game_multiplier " +
                "FROM facilities WHERE is_active = TRUE ORDER BY id ASC"
        );

        List<Map<String, Object>> hoursRows = jdbcTemplate.queryForList(
                "SELECT fh.facility_id, fh.weekday, fh.open_hour, fh.close_hour " +
                "FROM facility_hours fh " +
                "JOIN facilities f ON f.id = fh.facility_id " +
                "WHERE f.is_active = TRUE " +
                "ORDER BY fh.facility_id ASC, fh.weekday ASC"
        );

        return FacilityMapper.toFacilities(facilityRows, hoursRows);
    }

    /**
     * Returnează starea celor 24 de sloturi orare pentru o facilitate activă într-o zi
     * (fus orar Europe/Bucharest), corelând programul, rezervările și blocările.
     */
    @Transactional(readOnly = true)
    public List<SlotAvailability> getAvailability(Long facilityId, LocalDate date) {
        if (date.isBefore(MIN_SUPPORTED_DATE) || date.isAfter(MAX_SUPPORTED_DATE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data solicitată este în afara intervalului permis.");
        }
        ensureActiveFacilityExists(facilityId);

        List<Map<String, Object>> hoursRows = jdbcTemplate.queryForList(
                "SELECT open_hour, close_hour FROM facility_hours WHERE facility_id = ? AND weekday = ?",
                facilityId, date.getDayOfWeek().getValue()
        );
        Integer openHour = hoursRows.isEmpty() ? null : FacilityMapper.toInt(hoursRows.getFirst().get("open_hour"));
        Integer closeHour = hoursRows.isEmpty() ? null : FacilityMapper.toInt(hoursRows.getFirst().get("close_hour"));

        List<Map<String, Object>> occupiedRows = jdbcTemplate.queryForList(
                "SELECT slot_start, source FROM v_occupied_slots " +
                "WHERE facility_id = ? AND slot_start >= ? AND slot_start < ?",
                facilityId,
                // LocalDateTime (nu Timestamp) => fără conversie dependentă de fusul orar al JVM
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        );
        Map<Integer, StatusEnum> occupiedByHour = FacilityMapper.toOccupiedByHour(occupiedRows);

        return FacilityMapper.buildDaySlots(openHour, closeHour, occupiedByHour);
    }

    private void ensureActiveFacilityExists(Long facilityId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM facilities WHERE id = ? AND is_active = TRUE",
                Integer.class,
                facilityId
        );
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Facilitatea nu a fost găsită.");
        }
    }
}
