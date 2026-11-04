package com.usv.app.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController 
public class HealthController {
    @GetMapping ("/api/health")
    public String healthCheck() {
        return "Server is running and healthy!";
    }
}
