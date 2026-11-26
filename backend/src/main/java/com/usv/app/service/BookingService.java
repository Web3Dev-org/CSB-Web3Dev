package com.usv.app.service;

import com.usv.app.entity.User;
import com.usv.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.BookingDetail;
import ro.usv.sport.dto.BookingEquipmentItem;
import ro.usv.sport.dto.BookingEquipmentRequest;
import ro.usv.sport.dto.BookingPage;
import ro.usv.sport.dto.BookingRequest;
import ro.usv.sport.dto.BookingStatus;
import ro.usv.sport.dto.BookingSummary;
import ro.usv.sport.dto.BookingType;
import ro.usv.sport.dto.AdminBookingRequest;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private static final ZoneId BUCHAREST_ZONE = ZoneId.of("Europe/Bucharest");

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;

    private record EquipmentLine(Long equipmentId, String name, int quantity, BigDecimal unitPrice) {
    }

    @Transactional(readOnly = true)
    public BookingPage listMyBookings(
            Boolean activeOnly,
            BookingStatus status,
            OffsetDateTime from,
            OffsetDateTime to,
            String sort,
            Integer page,
            Integer size) {

        Long userId = getCurrentUserId();
        int pageNum = page != null ? page : 0;
        int pageSize = size != null ? size : 20;

        StringBuilder where = new StringBuilder(" WHERE user_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(userId);

        if (status != null) {
            where.append(" AND status = ?");
            params.add(status.getValue());
        } else if (activeOnly != null) {
            where.append(" AND is_active_booking = ?");
            params.add(activeOnly);
        }

        if (from != null) {
            where.append(" AND start_at >= ?");
            params.add(Timestamp.valueOf(from.atZoneSameInstant(BUCHAREST_ZONE).toLocalDateTime()));
        }

        if (to != null) {
            where.append(" AND start_at <= ?");
            params.add(Timestamp.valueOf(to.atZoneSameInstant(BUCHAREST_ZONE).toLocalDateTime()));
        }

        Long totalElements = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM v_my_bookings" + where,
                Long.class,
                params.toArray());
        long total = totalElements != null ? totalElements : 0L;

        String orderBy = switch (sort != null ? sort : "startAt,desc") {
            case "startAt,asc" -> " ORDER BY start_at ASC, id ASC";
            case "createdAt,desc" -> " ORDER BY created_at DESC, id DESC";
            default -> " ORDER BY start_at DESC, id DESC";
        };

        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(pageSize);
        dataParams.add((long) pageNum * pageSize);

        List<BookingSummary> content = jdbcTemplate.query(
                "SELECT id, facility_id, facility_name, type, status, start_at, hours_count, " +
                        "total_amount, is_active_booking, can_cancel " +
                        "FROM v_my_bookings" + where + orderBy + " LIMIT ? OFFSET ?",
                (rs, rowNum) -> mapBookingSummary(rs),
                dataParams.toArray());

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / pageSize);

        return new BookingPage()
                .content(content)
                .page(pageNum)
                .size(pageSize)
                .totalElements(total)
                .totalPages(totalPages);
    }

    @Transactional
    public BookingDetail createBooking(BookingRequest request, UUID idempotencyKey) {
        Long userId = getCurrentUserId();

        // 1. Validare oră fixă și fereastră de rezervare (Europe/Bucharest)
        ZonedDateTime startZoned = request.getStartAt().atZoneSameInstant(BUCHAREST_ZONE);
        if (startZoned.getMinute() != 0 || startZoned.getSecond() != 0 || startZoned.getNano() != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ora de început trebuie să fie la oră fixă (:00:00).");
        }

        LocalDateTime nowLocal = LocalDateTime.now(BUCHAREST_ZONE);
        LocalDateTime startLocal = startZoned.toLocalDateTime();
        BookingWindow.validate(startLocal, nowLocal, getIntSetting("booking_horizon_days", 7));

        // 2. Verificare statut și reducere utilizator
        Map<String, Object> userRow = jdbcTemplate.queryForList(
                "SELECT u.is_active, us.discount_percent " +
                        "FROM users u JOIN user_statuses us ON us.code = u.status_code " +
                        "WHERE u.id = ?",
                userId).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Utilizator inexistent."));

        if (!Boolean.TRUE.equals(userRow.get("is_active"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul este dezactivat.");
        }
        BigDecimal discountPercent = new BigDecimal(userRow.get("discount_percent").toString());

        // 3. Verificare facilitate activă și program săptămânal
        Map<String, Object> facilityRow = jdbcTemplate.queryForList(
                "SELECT price_per_hour, game_multiplier, is_active FROM facilities WHERE id = ?",
                request.getFacilityId()).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Facilitatea nu a fost găsită."));

        if (!Boolean.TRUE.equals(facilityRow.get("is_active"))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Facilitatea selectată este inactivă.");
        }

        int weekday = startLocal.getDayOfWeek().getValue(); // 1 = Luni ... 7 = Duminică
        Map<String, Object> hoursRow = jdbcTemplate.queryForList(
                "SELECT open_hour, close_hour FROM facility_hours WHERE facility_id = ? AND weekday = ?",
                request.getFacilityId(), weekday).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Facilitatea este închisă în ziua selectată."));

        int openHour = ((Number) hoursRow.get("open_hour")).intValue();
        int closeHour = ((Number) hoursRow.get("close_hour")).intValue();
        int startHour = startLocal.getHour();
        int endHour = startHour + request.getHoursCount();

        if (!startLocal.toLocalDate().equals(startLocal.plusHours(request.getHoursCount() - 1L).toLocalDate())
                || startHour < openHour
                || endHour > closeHour) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Intervalul orar depășește programul facilității (" + openHour + ":00 - "
                            + closeHour + ":00).");
        }

        // 4. Verificare existență versiune termeni și condiții
        Integer termsCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM terms_versions WHERE id = ?",
                Integer.class,
                request.getTermsVersionId());
        if (termsCount == null || termsCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Versiunea termenilor și condițiilor nu există.");
        }

        // 5. Verificare disponibilitate sloturi (rezervări + blocări administrative)
        LocalDateTime endLocal = startLocal.plusHours(request.getHoursCount());
        Integer occupiedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM v_occupied_slots " +
                        "WHERE facility_id = ? AND slot_start >= ? AND slot_start < ?",
                Integer.class,
                request.getFacilityId(),
                Timestamp.valueOf(startLocal),
                Timestamp.valueOf(endLocal));
        if (occupiedCount != null && occupiedCount > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Unul sau mai multe dintre sloturile orare selectate sunt deja ocupate sau blocate.");
        }

        // 6. Validare echipamente și calcul sume pe server
        List<EquipmentLine> equipmentLines = new ArrayList<>();
        BigDecimal equipmentAmount = BigDecimal.ZERO;

        if (request.getEquipment() != null) {
            for (BookingEquipmentRequest item : request.getEquipment()) {
                Map<String, Object> eqRow = jdbcTemplate.queryForList(
                        "SELECT id, name, price, stock, is_active FROM equipment WHERE id = ?",
                        item.getEquipmentId()).stream().findFirst()
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Echipamentul cu ID " + item.getEquipmentId()
                                        + " nu a fost găsit."));

                if (!Boolean.TRUE.equals(eqRow.get("is_active"))) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Echipamentul '" + eqRow.get("name")
                                    + "' nu mai este disponibil.");
                }

                Object stockObj = eqRow.get("stock");
                if (stockObj != null && ((Number) stockObj).intValue() < item.getQuantity()) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Stoc insuficient pentru echipamentul '" + eqRow.get("name")
                                    + "'.");
                }

                BigDecimal eqPrice = new BigDecimal(eqRow.get("price").toString());
                equipmentAmount = equipmentAmount
                        .add(eqPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
                equipmentLines.add(new EquipmentLine(
                        item.getEquipmentId(),
                        eqRow.get("name").toString(),
                        item.getQuantity(),
                        eqPrice));
            }
        }

        BigDecimal pricePerHour = new BigDecimal(facilityRow.get("price_per_hour").toString());
        BigDecimal gameMultiplier = new BigDecimal(facilityRow.get("game_multiplier").toString());
        BigDecimal unitPrice = (request.getType() == BookingType.JOC)
                ? pricePerHour.multiply(gameMultiplier).setScale(2, RoundingMode.HALF_UP)
                : pricePerHour.setScale(2, RoundingMode.HALF_UP);

        BigDecimal baseAmount = unitPrice
                .multiply(BigDecimal.valueOf(request.getHoursCount()))
                .setScale(2, RoundingMode.HALF_UP);
        equipmentAmount = equipmentAmount.setScale(2, RoundingMode.HALF_UP);

        BigDecimal grossTotal = baseAmount.add(equipmentAmount);
        BigDecimal discountAmount = grossTotal
                .multiply(discountPercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = grossTotal.subtract(discountAmount).max(BigDecimal.ZERO);

        // 7. Inserare rezervare + sloturi orare + echipamente
        Timestamp nowTs = Timestamp.valueOf(nowLocal);
        Timestamp startTs = Timestamp.valueOf(startLocal);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        BigDecimal finalEquipmentAmount = equipmentAmount;
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO bookings (" +
                            "user_id, facility_id, type, status, start_at, hours_count, " +
                            "unit_price, base_amount, equipment_amount, discount_percent, discount_amount, total_amount, "
                            +
                            "terms_version_id, terms_accepted_at" +
                            ") VALUES (?, ?, ?, 'in_asteptare', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setLong(2, request.getFacilityId());
            ps.setString(3, request.getType().getValue());
            ps.setTimestamp(4, startTs);
            ps.setInt(5, request.getHoursCount());
            ps.setBigDecimal(6, unitPrice);
            ps.setBigDecimal(7, baseAmount);
            ps.setBigDecimal(8, finalEquipmentAmount);
            ps.setBigDecimal(9, discountPercent);
            ps.setBigDecimal(10, discountAmount);
            ps.setBigDecimal(11, totalAmount);
            ps.setLong(12, request.getTermsVersionId());
            ps.setTimestamp(13, nowTs);
            return ps;
        }, keyHolder);

        long bookingId = Objects.requireNonNull(keyHolder.getKey()).longValue();

        for (int i = 0; i < request.getHoursCount(); i++) {
            Timestamp slotTs = Timestamp.valueOf(startLocal.plusHours(i));
            jdbcTemplate.update(
                    "INSERT INTO booking_slots (booking_id, facility_id, slot_start) VALUES (?, ?, ?)",
                    bookingId, request.getFacilityId(), slotTs);
        }

        for (EquipmentLine line : equipmentLines) {
            jdbcTemplate.update(
                    "INSERT INTO booking_equipment (booking_id, equipment_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                    bookingId, line.equipmentId(), line.quantity(), line.unitPrice());
        }

        return getMyBookingById(bookingId);
    }

    @Transactional(readOnly = true)
    public BookingDetail getMyBookingById(Long id) {
        Long userId = getCurrentUserId();

        List<Long> owners = jdbcTemplate.queryForList(
                "SELECT user_id FROM bookings WHERE id = ?",
                Long.class,
                id
        );
        if (owners.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rezervarea nu a fost găsită.");
        }
        if (!owners.getFirst().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu aveți acces la această rezervare.");
        }

        return getBookingDetailById(id);
    }

    private BookingDetail getBookingDetailById(Long id) {
        Map<String, Object> row = jdbcTemplate.queryForList(
                "SELECT * FROM v_my_bookings WHERE id = ?",
                id
        ).stream().findFirst().orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Rezervarea nu a fost găsită.")
        );

        List<BookingEquipmentItem> equipmentList = jdbcTemplate.query(
                "SELECT be.equipment_id, e.name, be.quantity, be.unit_price " +
                "FROM booking_equipment be " +
                "JOIN equipment e ON e.id = be.equipment_id " +
                "WHERE be.booking_id = ? ORDER BY be.equipment_id ASC",
                (rs, rowNum) -> new BookingEquipmentItem()
                        .equipmentId(rs.getLong("equipment_id"))
                        .name(rs.getString("name"))
                        .quantity(rs.getInt("quantity"))
                        .unitPrice(rs.getBigDecimal("unit_price")),
                id
        );

        return new BookingDetail()
                .id(((Number) row.get("id")).longValue())
                .facilityId(((Number) row.get("facility_id")).longValue())
                .facilityName(row.get("facility_name").toString())
                .type(BookingType.fromValue(row.get("type").toString()))
                .status(BookingStatus.fromValue(row.get("status").toString()))
                .startAt(toOffsetDateTime(row.get("start_at")))
                .hoursCount(((Number) row.get("hours_count")).intValue())
                .totalAmount(new BigDecimal(row.get("total_amount").toString()))
                .isActiveBooking(((Number) row.get("is_active_booking")).intValue() == 1)
                .canCancel(((Number) row.get("can_cancel")).intValue() == 1)
                .unitPrice(new BigDecimal(row.get("unit_price").toString()))
                .baseAmount(new BigDecimal(row.get("base_amount").toString()))
                .equipmentAmount(new BigDecimal(row.get("equipment_amount").toString()))
                .discountPercent(new BigDecimal(row.get("discount_percent").toString()))
                .discountAmount(new BigDecimal(row.get("discount_amount").toString()))
                .termsVersionId(((Number) row.get("terms_version_id")).longValue())
                .approvedAt(toOffsetDateTime(row.get("approved_at")))
                .cancelledAt(toOffsetDateTime(row.get("cancelled_at")))
                .cancelReason(row.get("cancel_reason") != null ? row.get("cancel_reason").toString() : null)
                .createdAt(toOffsetDateTime(row.get("created_at")))
                .equipmentList(equipmentList);
    }

    @Transactional
    public BookingDetail cancelMyBooking(Long id, String reason) {
        BookingDetail existing = getMyBookingById(id);

        if (!Boolean.TRUE.equals(existing.getCanCancel())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Rezervarea nu mai poate fi anulată (fie nu este activă, fie termenul limită a fost depășit).");
        }

        Timestamp nowTs = Timestamp.valueOf(LocalDateTime.now(BUCHAREST_ZONE));
        // Trigger-ul MySQL `trg_release_slots` eliberează automat sloturile din
        // `booking_slots`
        jdbcTemplate.update(
                "UPDATE bookings SET status = 'anulata', cancelled_at = ?, cancel_reason = ? WHERE id = ?",
                nowTs, reason, id);

        return getMyBookingById(id);
    }

    @Transactional(readOnly = true)
    public List<AdminBookingRequest> listAdminBookings(BookingStatus status) {
        StringBuilder sql = new StringBuilder(
                "SELECT b.id AS booking_id, u.full_name AS client, f.name AS facility, " +
                        "b.start_at, b.hours_count, b.total_amount, b.status, " +
                        "CASE WHEN EXISTS (" +
                        "    SELECT 1 FROM payments p WHERE p.booking_id = b.id AND p.status = 'reusita'"
                        +
                        ") THEN 'Plătit' ELSE 'Neplătit' END AS payment_state " +
                        "FROM bookings b " +
                        "JOIN users u ON u.id = b.user_id " +
                        "JOIN facilities f ON f.id = b.facility_id ");

        List<Object> params = new ArrayList<>();
        if (status != null) {
            sql.append("WHERE b.status = ? ");
            params.add(status.getValue());
        }

        sql.append("ORDER BY CASE WHEN b.status = 'in_asteptare' THEN 0 ELSE 1 END, b.start_at ASC, b.id DESC");

        return jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> new AdminBookingRequest()
                        .bookingId(rs.getLong("booking_id"))
                        .client(rs.getString("client"))
                        .facility(rs.getString("facility"))
                        .startAt(toOffsetDateTime(rs.getTimestamp("start_at")))
                        .hoursCount(rs.getInt("hours_count"))
                        .totalAmount(rs.getBigDecimal("total_amount"))
                        .status(BookingStatus.fromValue(rs.getString("status")))
                        .paymentState(AdminBookingRequest.PaymentStateEnum
                                .fromValue(rs.getString("payment_state"))),
                params.toArray());
    }

    @Transactional
    public BookingDetail approveBooking(Long id) {
        Long adminId = getCurrentUserId();
        String currentStatus = getBookingStatusOrThrow(id);

        if (!"in_asteptare".equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Doar rezervările în așteptare pot fi aprobate.");
        }

        Timestamp nowTs = Timestamp.valueOf(LocalDateTime.now(BUCHAREST_ZONE));
        jdbcTemplate.update(
                "UPDATE bookings SET status = 'aprobata', approved_by = ?, approved_at = ? WHERE id = ?",
                adminId, nowTs, id);

        return getBookingDetailById(id);
    }

    @Transactional
    public BookingDetail rejectBooking(Long id, String reason) {
        String currentStatus = getBookingStatusOrThrow(id);

        if (!"in_asteptare".equals(currentStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Doar rezervările în așteptare pot fi respinse.");
        }

        Timestamp nowTs = Timestamp.valueOf(LocalDateTime.now(BUCHAREST_ZONE));
        jdbcTemplate.update(
                "UPDATE bookings SET status = 'respinsa', cancelled_at = ?, cancel_reason = ? WHERE id = ?",
                nowTs, reason, id);

        // Siguranță suplimentară pentru eliberarea sloturilor (idempotentă alături de
        // trigger-ul MySQL)
        jdbcTemplate.update("DELETE FROM booking_slots WHERE booking_id = ?", id);

        return getBookingDetailById(id);
    }

    private String getBookingStatusOrThrow(Long id) {
        List<String> statuses = jdbcTemplate.queryForList(
                "SELECT status FROM bookings WHERE id = ?",
                String.class,
                id);
        if (statuses.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rezervarea nu a fost găsită.");
        }
        return statuses.getFirst();
    }

    private BookingSummary mapBookingSummary(ResultSet rs) throws SQLException {
        return new BookingSummary()
                .id(rs.getLong("id"))
                .facilityId(rs.getLong("facility_id"))
                .facilityName(rs.getString("facility_name"))
                .type(BookingType.fromValue(rs.getString("type")))
                .status(BookingStatus.fromValue(rs.getString("status")))
                .startAt(toOffsetDateTime(rs.getTimestamp("start_at")))
                .hoursCount(rs.getInt("hours_count"))
                .totalAmount(rs.getBigDecimal("total_amount"))
                .isActiveBooking(rs.getBoolean("is_active_booking"))
                .canCancel(rs.getBoolean("can_cancel"));
    }

    private OffsetDateTime toOffsetDateTime(Object rawValue) {
        return switch (rawValue) {
            case null -> null;
            case LocalDateTime ldt -> ldt.atZone(BUCHAREST_ZONE).toOffsetDateTime();
            case Timestamp ts -> ts.toLocalDateTime().atZone(BUCHAREST_ZONE).toOffsetDateTime();
            case OffsetDateTime odt -> odt.atZoneSameInstant(BUCHAREST_ZONE).toOffsetDateTime();
            default -> LocalDateTime.parse(rawValue.toString().replace(" ", "T"))
                    .atZone(BUCHAREST_ZONE)
                    .toOffsetDateTime();
        };
    }

    private int getIntSetting(String key, int fallback) {
        List<String> values = jdbcTemplate.queryForList(
                "SELECT setting_value FROM app_settings WHERE setting_key = ?",
                String.class,
                key);
        if (values.isEmpty()) {
            return fallback;
        }
        return Integer.parseInt(values.getFirst());
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autentificare necesară.");
        }
        return userRepository.findByEmail(auth.getName())
                .map(user -> user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Utilizator negăsit."));
    }
}