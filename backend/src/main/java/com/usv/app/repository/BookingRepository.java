
package com.usv.app.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class BookingRepository {

    @PersistenceContext
    private EntityManager entityManager;

    // =====================================================
    // 1. PRELUARE REZERVARI UTILIZATOR
    // =====================================================

    public List<Map<String, Object>> findBookingsByUserId(
            Long userId) {

        String sql =
                "SELECT id, facility_name, start_at, hours_count, " +
                "type, total_amount, status, can_cancel " +
                "FROM v_my_bookings " +
                "WHERE user_id = :userId " +
                "ORDER BY start_at DESC";

        List<Object[]> rows = entityManager
                .createNativeQuery(sql)
                .setParameter("userId", userId)
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : rows) {

            Long bookingId = ((Number) row[0]).longValue();

            Map<String, Object> item = new HashMap<>();

            item.put("id", bookingId);
            item.put("facilityName",
                    row[1] != null
                            ? row[1].toString()
                            : "Facilitate sportivă");

            if (row[2] instanceof Timestamp) {
                item.put(
                        "startAt",
                        ((Timestamp) row[2])
                                .toLocalDateTime()
                                .toString()
                );
            } else if (row[2] != null) {
                item.put(
                        "startAt",
                        row[2].toString().replace(" ", "T")
                );
            }

            item.put(
                    "hoursCount",
                    row[3] != null
                            ? ((Number) row[3]).intValue()
                            : 1
            );

            item.put(
                    "type",
                    row[4] != null
                            ? row[4].toString()
                            : "ora"
            );

            item.put(
                    "totalAmount",
                    row[5] != null
                            ? ((Number) row[5]).doubleValue()
                            : 0.0
            );

            item.put(
                    "status",
                    row[6] != null
                            ? row[6].toString()
                            : "in_asteptare"
            );

            item.put(
                    "canCancel",
                    row[7] != null
                            && ((Number) row[7]).intValue() == 1
            );

            item.put(
                    "equipment",
                    findEquipmentNamesByBookingId(bookingId)
            );

            result.add(item);
        }

        return result;
    }

    // =====================================================
    // 2. PRELUARE ECHIPAMENTE
    // =====================================================

    public List<String> findEquipmentNamesByBookingId(
            Long bookingId) {

        String sql =
                "SELECT e.name FROM booking_equipment be " +
                "JOIN equipment e ON e.id = be.equipment_id " +
                "WHERE be.booking_id = :bookingId";

        return entityManager
                .createNativeQuery(sql)
                .setParameter("bookingId", bookingId)
                .getResultList();
    }

    // =====================================================
    // 3. SALVARE REZERVARE
    // =====================================================

    @Transactional
    public Long insertBooking(
            Long userId,
            Long facilityId,
            String startAtIso,
            Integer hoursCount,
            String type,
            List<String> equipmentNames,
            Double totalAmount
    ) {

        // 1. Identificam facilitatea direct dupa ID

        List<Object[]> facRows = entityManager
                .createNativeQuery(
                        "SELECT id, price_per_hour, game_multiplier " +
                        "FROM facilities " +
                        "WHERE id = :facilityId " +
                        "AND is_active = TRUE"
                )
                .setParameter("facilityId", facilityId)
                .getResultList();

        if (facRows.isEmpty()) {
            throw new IllegalArgumentException(
                    "Facilitatea nu există sau este dezactivată. ID: "
                            + facilityId
            );
        }

        Object[] fac = facRows.get(0);

        Long foundFacilityId =
                ((Number) fac[0]).longValue();

        BigDecimal pricePerHour =
                new BigDecimal(fac[1].toString());

        BigDecimal gameMultiplier =
                new BigDecimal(fac[2].toString());

        // 2. Calculam pretul rezervarii

        BigDecimal unitPrice =
                "joc".equalsIgnoreCase(type)
                        ? pricePerHour.multiply(gameMultiplier)
                        : pricePerHour;

        BigDecimal baseAmount =
                unitPrice.multiply(
                        BigDecimal.valueOf(hoursCount)
                );

        // 3. Preluam reducerea utilizatorului

        List<?> discountRows = entityManager
                .createNativeQuery(
                        "SELECT us.discount_percent " +
                        "FROM users u " +
                        "JOIN user_statuses us " +
                        "ON us.code = u.status_code " +
                        "WHERE u.id = :userId " +
                        "LIMIT 1"
                )
                .setParameter("userId", userId)
                .getResultList();

        BigDecimal discountPercent =
                discountRows.isEmpty()
                        ? BigDecimal.ZERO
                        : new BigDecimal(
                                discountRows.get(0).toString()
                        );

        // 4. Preluam versiunea curenta a termenilor

        List<?> termsRows = entityManager
                .createNativeQuery(
                        "SELECT id FROM terms_versions " +
                        "WHERE is_current = TRUE LIMIT 1"
                )
                .getResultList();

        if (termsRows.isEmpty()) {
            throw new IllegalStateException(
                    "Nu există o versiune activă a termenilor și condițiilor."
            );
        }

        Long termsVersionId =
                ((Number) termsRows.get(0)).longValue();

        // 5. Calculam costul echipamentelor

        BigDecimal equipmentAmount = BigDecimal.ZERO;

        List<Object[]> matchedEquipment = new ArrayList<>();

        if (equipmentNames != null) {

            for (String eqNameValue : equipmentNames) {

                if (eqNameValue == null) {
                    continue;
                }

                String eqName = eqNameValue.trim();

                if (eqName.isEmpty()) {
                    continue;
                }

                List<Object[]> eqRows = entityManager
                        .createNativeQuery(
                                "SELECT id, price " +
                                "FROM equipment " +
                                "WHERE name = :name " +
                                "AND is_active = TRUE " +
                                "LIMIT 1"
                        )
                        .setParameter("name", eqName)
                        .getResultList();

                if (!eqRows.isEmpty()) {

                    Object[] eq = eqRows.get(0);

                    BigDecimal eqPrice =
                            new BigDecimal(eq[1].toString());

                    equipmentAmount =
                            equipmentAmount.add(eqPrice);

                    matchedEquipment.add(eq);
                }
            }
        }

        // 6. Calculam suma finala

        BigDecimal grossTotal =
                baseAmount.add(equipmentAmount);

        BigDecimal discountAmount =
                grossTotal.multiply(discountPercent)
                        .divide(
                                BigDecimal.valueOf(100),
                                2,
                                java.math.RoundingMode.HALF_UP
                        );

        BigDecimal calculatedTotal =
                grossTotal.subtract(discountAmount);

        BigDecimal finalTotal =
                BigDecimal.valueOf(totalAmount);

        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(
                    "Suma totală nu poate fi negativă."
            );
        }

        // Pastram suma calculata de frontend pentru compatibilitate.
        // Backend-ul foloseste in continuare calculul preturilor
        // pentru salvarea detaliilor rezervarii.

        LocalDateTime startDateTime =
                LocalDateTime.parse(startAtIso);

        Timestamp startTimestamp =
                Timestamp.valueOf(startDateTime);

        // 7. Inseram rezervarea

        String insertBookingSql =
                "INSERT INTO bookings " +
                "(user_id, facility_id, type, status, start_at, hours_count, " +
                "unit_price, base_amount, equipment_amount, " +
                "discount_percent, discount_amount, total_amount, " +
                "terms_version_id, terms_accepted_at) " +

                "VALUES " +
                "(:userId, :facilityId, :type, 'in_asteptare', " +
                ":startAt, :hoursCount, :unitPrice, :baseAmount, " +
                ":equipmentAmount, :discountPercent, :discountAmount, " +
                ":totalAmount, :termsVersionId, NOW())";

        entityManager
                .createNativeQuery(insertBookingSql)
                .setParameter("userId", userId)
                .setParameter("facilityId", foundFacilityId)
                .setParameter(
                        "type",
                        "joc".equalsIgnoreCase(type)
                                ? "joc"
                                : "ora"
                )
                .setParameter("startAt", startTimestamp)
                .setParameter("hoursCount", hoursCount)
                .setParameter("unitPrice", unitPrice)
                .setParameter("baseAmount", baseAmount)
                .setParameter("equipmentAmount", equipmentAmount)
                .setParameter("discountPercent", discountPercent)
                .setParameter("discountAmount", discountAmount)
                .setParameter("totalAmount", finalTotal)
                .setParameter("termsVersionId", termsVersionId)
                .executeUpdate();

        // 8. Preluam ID-ul rezervarii

        Long newBookingId = ((Number) entityManager
                .createNativeQuery("SELECT LAST_INSERT_ID()")
                .getSingleResult())
                .longValue();

        // 9. Inseram sloturile orare

        for (int h = 0; h < hoursCount; h++) {

            Timestamp slotStart = Timestamp.valueOf(
                    startDateTime.plusHours(h)
            );

            entityManager
                    .createNativeQuery(
                            "INSERT INTO booking_slots " +
                            "(booking_id, facility_id, slot_start, is_active) " +
                            "VALUES (:bookingId, :facilityId, :slotStart, TRUE)"
                    )
                    .setParameter("bookingId", newBookingId)
                    .setParameter("facilityId", foundFacilityId)
                    .setParameter("slotStart", slotStart)
                    .executeUpdate();
        }

        // 10. Inseram echipamentele

        for (Object[] eq : matchedEquipment) {

            Long eqId =
                    ((Number) eq[0]).longValue();

            BigDecimal eqPrice =
                    new BigDecimal(eq[1].toString());

            entityManager
                    .createNativeQuery(
                            "INSERT INTO booking_equipment " +
                            "(booking_id, equipment_id, quantity, unit_price) " +
                            "VALUES (:bookingId, :equipmentId, 1, :unitPrice)"
                    )
                    .setParameter("bookingId", newBookingId)
                    .setParameter("equipmentId", eqId)
                    .setParameter("unitPrice", eqPrice)
                    .executeUpdate();
        }

        // 11. Inregistram plata

        entityManager
                .createNativeQuery(
                        "INSERT INTO payments " +
                        "(booking_id, amount, currency, method, status, paid_at) " +
                        "VALUES (:bookingId, :amount, 'RON', " +
                        "'card_online', 'reusita', NOW())"
                )
                .setParameter("bookingId", newBookingId)
                .setParameter("amount", finalTotal)
                .executeUpdate();

        return newBookingId;
    }

    // =====================================================
    // 4. ANULARE REZERVARE
    // =====================================================

    @Transactional
    public int cancelBookingById(Long bookingId) {

        String sql =
                "UPDATE bookings " +
                "SET status = 'anulata', cancelled_at = NOW() " +
                "WHERE id = :bookingId " +
                "AND status IN ('in_asteptare', 'aprobata') " +
                "AND TIMESTAMPDIFF(HOUR, NOW(), start_at) >= 12";

        return entityManager
                .createNativeQuery(sql)
                .setParameter("bookingId", bookingId)
                .executeUpdate();
    }
}
