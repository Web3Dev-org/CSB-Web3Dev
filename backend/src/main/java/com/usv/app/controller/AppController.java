package com.usv.app.controller;

import com.usv.app.service.AppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.AppApi;
import ro.usv.sport.dto.AppSettings;
import ro.usv.sport.dto.Equipment;
import ro.usv.sport.dto.Terms;
import ro.usv.sport.dto.UserStatus;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class AppController implements AppApi {

    private final AppService appService;

    @Override
    public ResponseEntity<AppSettings> getAppSettings() {
        return ResponseEntity.ok(appService.getSettings());
    }

    @Override
    public ResponseEntity<List<UserStatus>> listUserStatuses() {
        return ResponseEntity.ok(appService.listUserStatuses());
    }

    @Override
    public ResponseEntity<List<Equipment>> listEquipment() {
        return ResponseEntity.ok(appService.listActiveEquipment());
    }

    @Override
    public ResponseEntity<Terms> getCurrentTerms() {
        return ResponseEntity.ok(appService.getCurrentTerms());
    }
}
