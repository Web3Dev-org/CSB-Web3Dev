package com.usv.app.controller;

import com.usv.app.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import ro.usv.sport.api.PaymentsApi;
import ro.usv.sport.dto.PaymentDetail;
import ro.usv.sport.dto.PaymentInitiateRequest;
import ro.usv.sport.dto.PaymentInitiateResponse;

import java.net.URI;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaymentController implements PaymentsApi {

    private final PaymentService paymentService;

    @Override
    public ResponseEntity<PaymentInitiateResponse> initiatePayment(
            PaymentInitiateRequest paymentInitiateRequest,
            UUID idempotencyKey) {
        PaymentInitiateResponse created = paymentService.initiate(paymentInitiateRequest);
        return ResponseEntity
                .created(URI.create("/api/payments/" + created.getPaymentId()))
                .body(created);
    }

    @Override
    public ResponseEntity<PaymentDetail> getPaymentById(Long id) {
        return ResponseEntity.ok(paymentService.getMyPayment(id));
    }

    @Override
    public ResponseEntity<PaymentDetail> getPaymentByLink(UUID token) {
        return ResponseEntity.ok(paymentService.getMyPaymentByLink(token));
    }

    @Override
    public ResponseEntity<PaymentDetail> payByLink(UUID token) {
        return ResponseEntity.ok(paymentService.payByLink(token));
    }
}
