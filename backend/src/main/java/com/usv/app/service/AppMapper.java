package com.usv.app.service;

import ro.usv.sport.dto.AppSettings;
import ro.usv.sport.dto.Equipment;
import ro.usv.sport.dto.Terms;
import ro.usv.sport.dto.UserStatus;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Transformări pure (fără acces la DB) între rândurile SQL și DTO-urile OpenAPI
 * pentru nomenclatoarele globale ale aplicației (tag-ul App).
 */
final class AppMapper {

    static final String KEY_CANCELLATION_HOURS = "cancellation_hours";
    static final String KEY_ARRIVAL_MINUTES = "arrival_minutes";
    static final String KEY_BOOKING_HORIZON_DAYS = "booking_horizon_days";
    static final String KEY_CURRENCY = "currency";

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");

    private AppMapper() {
    }

    /**
     * Construiește setările globale din perechile cheie/valoare din {@code app_settings}.
     * Cheile necunoscute sunt ignorate; o cheie obligatorie lipsă sau o valoare numerică
     * invalidă înseamnă o configurare coruptă a bazei de date și aruncă excepție.
     */
    static AppSettings toAppSettings(List<Map<String, Object>> rows) {
        Map<String, String> values = rows.stream()
                .collect(Collectors.toUnmodifiableMap(
                        row -> row.get("setting_key").toString(),
                        row -> row.get("setting_value").toString()
                ));

        return new AppSettings()
                .cancellationHours(requireInt(values, KEY_CANCELLATION_HOURS))
                .arrivalMinutes(requireInt(values, KEY_ARRIVAL_MINUTES))
                .bookingHorizonDays(requireInt(values, KEY_BOOKING_HORIZON_DAYS))
                .currency(requireValue(values, KEY_CURRENCY));
    }

    static UserStatus toUserStatus(Map<String, Object> row) {
        return new UserStatus()
                .code(row.get("code").toString())
                .label(row.get("label").toString())
                .discountPercent(toBigDecimal(row.get("discount_percent")));
    }

    static Equipment toEquipment(Map<String, Object> row) {
        Object stock = row.get("stock");
        return new Equipment()
                .id(FacilityMapper.toLong(row.get("id")))
                .name(row.get("name").toString())
                .price(toBigDecimal(row.get("price")))
                .stock(stock == null ? null : FacilityMapper.toInt(stock));
    }

    static Terms toTerms(Map<String, Object> row) {
        return new Terms()
                .id(FacilityMapper.toLong(row.get("id")))
                .body(row.get("body").toString())
                .publishedAt(FacilityMapper.toLocalDateTime(row.get("published_at"))
                        .atZone(BUCHAREST_ZONE)
                        .toOffsetDateTime());
    }

    private static String requireValue(Map<String, String> values, String key) {
        String value = values.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Setarea obligatorie '" + key + "' lipsește din app_settings.");
        }
        return value.trim();
    }

    private static int requireInt(Map<String, String> values, String key) {
        String value = requireValue(values, key);
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw new IllegalStateException(
                    "Setarea '" + key + "' are o valoare nenumerică: '" + value + "'.", e);
        }
    }

    private static BigDecimal toBigDecimal(Object value) {
        return value instanceof BigDecimal bd ? bd : new BigDecimal(value.toString());
    }
}
