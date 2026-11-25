package com.usv.app.service;

import org.junit.jupiter.api.Test;
import ro.usv.sport.dto.Facility;
import ro.usv.sport.dto.FacilityHours;
import ro.usv.sport.dto.SlotAvailability;
import ro.usv.sport.dto.SlotAvailability.StatusEnum;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FacilityMapperTest {

    private static Map<String, Object> facilityRow(long id, String name, String description,
                                                   String price, String multiplier) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("description", description);
        row.put("price_per_hour", new BigDecimal(price));
        row.put("game_multiplier", new BigDecimal(multiplier));
        return row;
    }

    private static Map<String, Object> hoursRow(long facilityId, int weekday, int open, int close) {
        return Map.of(
                "facility_id", facilityId,
                "weekday", weekday,
                "open_hour", open,
                "close_hour", close
        );
    }

    @Test
    void toFacilitiesMapsColumnsAndGroupsHoursByFacility() {
        // Arrange
        List<Map<String, Object>> facilities = List.of(
                facilityRow(1L, "Sala Polivalentă", "Descriere", "40.00", "1.50"),
                facilityRow(2L, "Teren de tenis", null, "30.00", "2.00")
        );
        List<Map<String, Object>> hours = List.of(
                hoursRow(1L, 1, 8, 21),
                hoursRow(2L, 1, 10, 18),
                hoursRow(1L, 2, 9, 20)
        );

        // Act
        List<Facility> result = FacilityMapper.toFacilities(facilities, hours);

        // Assert
        assertThat(result).hasSize(2);

        Facility first = result.get(0);
        assertThat(first.getId()).isEqualTo(1L);
        assertThat(first.getName()).isEqualTo("Sala Polivalentă");
        assertThat(first.getDescription()).isEqualTo("Descriere");
        assertThat(first.getPricePerHour()).isEqualByComparingTo("40.00");
        assertThat(first.getGameMultiplier()).isEqualByComparingTo("1.50");
        assertThat(first.getHours())
                .extracting(FacilityHours::getWeekday, FacilityHours::getOpenHour, FacilityHours::getCloseHour)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(1, 8, 21),
                        org.assertj.core.groups.Tuple.tuple(2, 9, 20)
                );

        Facility second = result.get(1);
        assertThat(second.getDescription()).isNull();
        assertThat(second.getHours()).hasSize(1);
    }

    @Test
    void toFacilitiesReturnsEmptyHoursWhenFacilityHasNoSchedule() {
        List<Facility> result = FacilityMapper.toFacilities(
                List.of(facilityRow(3L, "Sala de fitness", null, "20.00", "1.50")),
                List.of()
        );

        assertThat(result).singleElement()
                .satisfies(f -> assertThat(f.getHours()).isEmpty());
    }

    @Test
    void toFacilitiesReturnsEmptyListWhenNoFacilities() {
        assertThat(FacilityMapper.toFacilities(List.of(), List.of())).isEmpty();
    }

    @Test
    void buildDaySlotsReturns24SlotsMarkingClosedOccupiedAndAvailable() {
        // Arrange: deschis 08-21, ora 10 rezervată, ora 12 blocată
        Map<Integer, StatusEnum> occupied = Map.of(
                10, StatusEnum.REZERVARE,
                12, StatusEnum.BLOCAT
        );

        // Act
        List<SlotAvailability> slots = FacilityMapper.buildDaySlots(8, 21, occupied);

        // Assert
        assertThat(slots).hasSize(24);
        assertThat(slots.get(0).getStartTime()).isEqualTo("00:00");
        assertThat(slots.get(23).getStartTime()).isEqualTo("23:00");
        assertThat(slots.get(7).getStatus()).isEqualTo(StatusEnum.INCHIS);
        assertThat(slots.get(8).getStatus()).isEqualTo(StatusEnum.DISPONIBIL);
        assertThat(slots.get(10).getStatus()).isEqualTo(StatusEnum.REZERVARE);
        assertThat(slots.get(12).getStatus()).isEqualTo(StatusEnum.BLOCAT);
        assertThat(slots.get(20).getStatus()).isEqualTo(StatusEnum.DISPONIBIL);
        assertThat(slots.get(21).getStatus()).isEqualTo(StatusEnum.INCHIS);
    }

    @Test
    void buildDaySlotsMarksAllClosedWhenNoScheduleForDay() {
        List<SlotAvailability> slots = FacilityMapper.buildDaySlots(null, null, Map.of());

        assertThat(slots).hasSize(24)
                .allSatisfy(s -> assertThat(s.getStatus()).isEqualTo(StatusEnum.INCHIS));
    }

    @Test
    void buildDaySlotsKeepsClosedStatusForOccupiedHoursOutsideSchedule() {
        List<SlotAvailability> slots = FacilityMapper.buildDaySlots(
                8, 21, Map.of(22, StatusEnum.BLOCAT));

        assertThat(slots.get(22).getStatus()).isEqualTo(StatusEnum.INCHIS);
    }

    @Test
    void toOccupiedByHourPrefersBlockOverBookingAndAcceptsBothTemporalTypes() {
        // Arrange: driver-ul MySQL poate întoarce LocalDateTime sau Timestamp
        List<Map<String, Object>> rows = List.of(
                Map.of("slot_start", LocalDateTime.of(2026, 11, 25, 10, 0), "source", "rezervare"),
                Map.of("slot_start", Timestamp.valueOf(LocalDateTime.of(2026, 11, 25, 10, 0)), "source", "blocat"),
                Map.of("slot_start", Timestamp.valueOf(LocalDateTime.of(2026, 11, 25, 14, 0)), "source", "rezervare")
        );

        // Act
        Map<Integer, StatusEnum> result = FacilityMapper.toOccupiedByHour(rows);

        // Assert
        assertThat(result).containsExactlyInAnyOrderEntriesOf(Map.of(
                10, StatusEnum.BLOCAT,
                14, StatusEnum.REZERVARE
        ));
    }
}
