package com.legalswami.controller;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.LivenessState;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.context.ApplicationContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private ApplicationAvailability applicationAvailability;
    
    @Operation(summary = "Health check endpoint")
    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "LegalSwami Backend");
        health.put("timestamp", System.currentTimeMillis());
        health.put("liveness", applicationAvailability.getLivenessState());
        health.put("readiness", applicationAvailability.getReadinessState());
        
        return ResponseEntity.ok(health);
    }
    
    @Operation(summary = "Liveness probe")
    @GetMapping("/liveness")
    public ResponseEntity<String> liveness() {
        return ResponseEntity.ok("LIVE");
    }
    
    @Operation(summary = "Readiness probe")
    @GetMapping("/readiness")
    public ResponseEntity<String> readiness() {
        return ResponseEntity.ok("READY");
    }
    
    @Operation(summary = "Change liveness state (for testing)")
    @PostMapping("/liveness/{state}")
    public ResponseEntity<String> changeLiveness(@PathVariable String state) {
        LivenessState livenessState = "CORRECT".equals(state) ? 
                LivenessState.CORRECT : LivenessState.BROKEN;
        
        AvailabilityChangeEvent.publish(applicationContext, livenessState);
        return ResponseEntity.ok("Liveness state changed to: " + livenessState);
    }
}