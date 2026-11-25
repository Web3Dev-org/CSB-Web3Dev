package com.usv.app.service;

import org.junit.jupiter.api.Test;
import ro.usv.sport.dto.AppSettings;
import ro.usv.sport.dto.Equipment;
import ro.usv.sport.dto.Terms;
import ro.usv.sport.dto.UserStatus;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppMapperTest {

    private static Map<String, Object> settingRow(String key, String value) {
        return Map.of("setting_key", key, "setting_value", value);
    }

    private static List<Map<String, Object>> seededSettings() {
        return List.of(
                settingRow("cancellation_hours", "12"),
                settingRow("arrival_minutes", "10"),
                settingRow("booking_horizon_days", "7"),
                settingRow("currency", "RON")
        );
    }

    @Test
    void mapsAllSeededSettingsToAppSettings() {
        AppSettings settings = AppMapper.toAppSettings(seededSettings());

        assertThat(settings.getCancellationHours()).isEqualTo(12);
        assertThat(settings.getArrivalMinutes()).isEqualTo(10);
        assertThat(settings.getBookingHorizonDays()).isEqualTo(7);
        assertThat(settings.getCurrency()).isEqualTo("RON");
    }

    @Test
    void ignoresUnknownSettingKeys() {
        List<Map<String, Object>> rows = new java.util.ArrayList<>(seededSettings());
        rows.add(settingRow("feature_flag", "on"));

        assertThat(AppMapper.toAppSettings(rows).getBookingHorizonDays()).isEqualTo(7);
    }

    @Test
    void throwsWhenRequiredSettingIsMissing() {
        List<Map<String, Object>> rows = seededSettings().subList(0, 3);

        assertThatThrownBy(() -> AppMapper.toAppSettings(rows))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("currency");
    }

    @Test
    void throwsWhenNumericSettingIsNotANumber() {
        List<Map<String, Object>> rows = List.of(
                settingRow("cancellation_hours", "douăsprezece"),
                settingRow("arrival_minutes", "10"),
                settingRow("booking_horizon_days", "7"),
                settingRow("currency", "RON")
        );

        assertThatThrownBy(() -> AppMapper.toAppSettings(rows))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cancellation_hours");
    }

    @Test
    void mapsUserStatusRow() {
        Map<String, Object> row = Map.of(
                "code", "student", "label", "Student", "discount_percent", new BigDecimal("50.00"));

        UserStatus status = AppMapper.toUserStatus(row);

        assertThat(status.getCode()).isEqualTo("student");
        assertThat(status.getLabel()).isEqualTo("Student");
        assertThat(status.getDiscountPercent()).isEqualByComparingTo("50");
    }

    @Test
    void mapsEquipmentRowWithLimitedStock() {
        Map<String, Object> row = Map.of(
                "id", 2L, "name", "Veste", "price", new BigDecimal("5.00"), "stock", 20);

        Equipment equipment = AppMapper.toEquipment(row);

        assertThat(equipment.getId()).isEqualTo(2L);
        assertThat(equipment.getName()).isEqualTo("Veste");
        assertThat(equipment.getPrice()).isEqualByComparingTo("5");
        assertThat(equipment.getStock()).isEqualTo(20);
    }

    @Test
    void mapsNullStockAsUnlimited() {
        Map<String, Object> row = new HashMap<>();
        row.put("id", 1L);
        row.put("name", "Mingi");
        row.put("price", new BigDecimal("10.00"));
        row.put("stock", null);

        assertThat(AppMapper.toEquipment(row).getStock()).isNull();
    }

    @Test
    void mapsTermsRowWithBucharestOffset() {
        Map<String, Object> row = Map.of(
                "id", 1L,
                "body", "1. Rezervarea este personală.",
                "published_at", Timestamp.valueOf(LocalDateTime.of(2026, 9, 15, 9, 0)));

        Terms terms = AppMapper.toTerms(row);

        assertThat(terms.getId()).isEqualTo(1L);
        assertThat(terms.getBody()).isEqualTo("1. Rezervarea este personală.");
        assertThat(terms.getPublishedAt())
                .isEqualTo(OffsetDateTime.of(2026, 9, 15, 9, 0, 0, 0, ZoneOffset.ofHours(3)));
    }
}
