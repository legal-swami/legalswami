package com.legalswami.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public")
public class ApiController {
    
    @GetMapping("/status")
    public Map<String, String> getStatus() {
        return Map.of(
            "status", "online",
            "service", "LegalSwami Backend",
            "version", "1.0.0"
        );
    }
    
    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        return Map.of(
            "maxFileSize", "5MB",
            "allowedFormats", new String[]{"jpg", "png", "pdf", "txt"},
            "maxChatHistory", 50,
            "supportedLanguages", new String[]{"en", "hi", "mr"}
        );
    }
}