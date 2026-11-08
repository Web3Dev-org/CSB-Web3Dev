package com.usv.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignUpRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 6) String password
) {}