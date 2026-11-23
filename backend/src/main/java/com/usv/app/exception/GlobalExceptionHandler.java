package com.usv.app.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import ro.usv.sport.dto.ErrorDetail;
import ro.usv.sport.dto.FieldError;

import java.net.URI;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String PROBLEM_BASE_URI = "https://api.sport.usv.ro/problems/";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetail> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new FieldError()
                        .field(err.getField())
                        .message(err.getDefaultMessage() != null ? err.getDefaultMessage() : "Valoare invalidă"))
                .toList();

        ErrorDetail body = new ErrorDetail()
                .type(URI.create(PROBLEM_BASE_URI + "validation-error"))
                .title("Date de intrare invalide")
                .status(HttpStatus.BAD_REQUEST.value())
                .detail("Unul sau mai multe câmpuri nu respectă regulile de validare.")
                .instance(URI.create(request.getRequestURL().toString()))
                .errors(fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorDetail> handleDataConflict(
            DataIntegrityViolationException ex,
            HttpServletRequest request) {
        ErrorDetail body = new ErrorDetail()
                .type(URI.create(PROBLEM_BASE_URI + "conflict"))
                .title("Conflict de stare")
                .status(HttpStatus.CONFLICT.value())
                .detail("Operațiunea intră în conflict cu o resursă existentă (ex. slot deja rezervat sau email duplicat).")
                .instance(URI.create(request.getRequestURL().toString()));

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorDetail> handleStatusException(
            ResponseStatusException ex,
            HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        ErrorDetail body = new ErrorDetail()
                .type(URI.create(PROBLEM_BASE_URI + status.value()))
                .title(status.getReasonPhrase())
                .status(status.value())
                .detail(ex.getReason())
                .instance(URI.create(request.getRequestURL().toString()));

        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(body);
    }
}