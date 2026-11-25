package com.usv.app.service;

import ro.usv.sport.dto.Facility;
import ro.usv.sport.dto.FacilityHours;
import ro.usv.sport.dto.SlotAvailability;
import ro.usv.sport.dto.SlotAvailability.StatusEnum;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Transformări pure (fără acces la DB) între rândurile SQL și DTO-urile OpenAPI
 * pentru facilități și disponibilitatea lor.
 */
final class FacilityMapper {

    static final int HOURS_PER_DAY = 24;

    private FacilityMapper() {
    }

    static List<Facility> toFacilities(List<Map<String, Object>> facilityRows,
                                       List<Map<String, Object>> hoursRows) {
        Map<Long, List<FacilityHours>> hoursByFacility = hoursRows.stream()
                .collect(Collectors.groupingBy(
                        row -> toLong(row.get("facility_id")),
                        LinkedHashMap::new,
                        Collectors.mapping(FacilityMapper::toFacilityHours, Collectors.toList())
                ));

        return facilityRows.stream()
                .map(row -> {
                    long id = toLong(row.get("id"));
                    return new Facility()
                            .id(id)
                            .name(row.get("name").toString())
                            .description(row.get("description") != null ? row.get("description").toString() : null)
                            .pricePerHour(toBigDecimal(row.get("price_per_hour")))
                            .gameMultiplier(toBigDecimal(row.get("game_multiplier")))
                            .hours(hoursByFacility.getOrDefault(id, List.of()));
                })
                .toList();
    }

    /**
     * Construiește cele 24 de sloturi orare ale unei zile.
     * Orele din afara intervalului [openHour, closeHour) sunt mereu `inchis`;
     * o zi fără program (openHour/closeHour null) este complet închisă.
     */
    static List<SlotAvailability> buildDaySlots(Integer openHour, Integer closeHour,
                                                Map<Integer, StatusEnum> occupiedByHour) {
        return IntStream.range(0, HOURS_PER_DAY)
                .mapToObj(hour -> new SlotAvailability()
                        .startTime(String.format("%02d:00", hour))
                        .status(resolveStatus(hour, openHour, closeHour, occupiedByHour)))
                .toList();
    }

    /**
     * Grupează rândurile din `v_occupied_slots` pe oră. Dacă o oră apare atât ca
     * rezervare cât și ca blocare administrativă, blocarea are prioritate.
     */
    static Map<Integer, StatusEnum> toOccupiedByHour(List<Map<String, Object>> occupiedRows) {
        Map<Integer, StatusEnum> result = new HashMap<>();
        for (Map<String, Object> row : occupiedRows) {
            int hour = toLocalDateTime(row.get("slot_start")).getHour();
            StatusEnum status = StatusEnum.fromValue(row.get("source").toString());
            result.merge(hour, status, (existing, incoming) ->
                    existing == StatusEnum.BLOCAT ? existing : incoming);
        }
        return Collections.unmodifiableMap(result);
    }

    private static StatusEnum resolveStatus(int hour, Integer openHour, Integer closeHour,
                                            Map<Integer, StatusEnum> occupiedByHour) {
        boolean isOpen = openHour != null && closeHour != null && hour >= openHour && hour < closeHour;
        if (!isOpen) {
            return StatusEnum.INCHIS;
        }
        return occupiedByHour.getOrDefault(hour, StatusEnum.DISPONIBIL);
    }

    private static FacilityHours toFacilityHours(Map<String, Object> row) {
        return new FacilityHours()
                .weekday(toInt(row.get("weekday")))
                .openHour(toInt(row.get("open_hour")))
                .closeHour(toInt(row.get("close_hour")));
    }

    static LocalDateTime toLocalDateTime(Object rawValue) {
        return switch (rawValue) {
            case LocalDateTime ldt -> ldt;
            case Timestamp ts -> ts.toLocalDateTime();
            case null -> throw new IllegalArgumentException("Valoare temporală lipsă.");
            default -> LocalDateTime.parse(rawValue.toString().replace(" ", "T"));
        };
    }

    static long toLong(Object value) {
        return ((Number) value).longValue();
    }

    static int toInt(Object value) {
        return ((Number) value).intValue();
    }

    private static BigDecimal toBigDecimal(Object value) {
        return value instanceof BigDecimal bd ? bd : new BigDecimal(value.toString());
    }
}
