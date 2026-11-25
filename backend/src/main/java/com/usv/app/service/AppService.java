package com.usv.app.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.AppSettings;
import ro.usv.sport.dto.Equipment;
import ro.usv.sport.dto.Terms;
import ro.usv.sport.dto.UserStatus;

import java.util.List;
import java.util.Map;

/**
 * Citește nomenclatoarele globale (setări, statuturi, echipamente, termeni)
 * folosite de frontend la listarea facilităților și în fluxul de rezervare.
 */
@Service
@RequiredArgsConstructor
public class AppService {

    private final JdbcTemplate jdbcTemplate;

    @Transactional(readOnly = true)
    public AppSettings getSettings() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT setting_key, setting_value FROM app_settings"
        );
        return AppMapper.toAppSettings(rows);
    }

    @Transactional(readOnly = true)
    public List<UserStatus> listUserStatuses() {
        return jdbcTemplate.queryForList(
                        "SELECT code, label, discount_percent FROM user_statuses ORDER BY discount_percent DESC, code ASC"
                ).stream()
                .map(AppMapper::toUserStatus)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Equipment> listActiveEquipment() {
        return jdbcTemplate.queryForList(
                        "SELECT id, name, price, stock FROM equipment WHERE is_active = TRUE ORDER BY id ASC"
                ).stream()
                .map(AppMapper::toEquipment)
                .toList();
    }

    @Transactional(readOnly = true)
    public Terms getCurrentTerms() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, body, published_at FROM terms_versions WHERE is_current = TRUE"
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nu există o versiune curentă a termenilor și condițiilor.");
        }
        return AppMapper.toTerms(rows.getFirst());
    }
}
