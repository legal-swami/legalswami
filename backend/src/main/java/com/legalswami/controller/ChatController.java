package com.legalswami.controller;

import com.legalswami.model.ChatRequest;
import com.legalswami.model.ChatResponse;
import com.legalswami.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(
    origins = {
        "https://legal-swami.github.io",
        "http://localhost:3000", 
        "https://legal-swami.github.io/legalswami",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "https://legalswami.vercel.app"
    }, 
    allowedHeaders = "*", 
    exposedHeaders = "*", 
    methods = {
        RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, 
        RequestMethod.DELETE, RequestMethod.OPTIONS, RequestMethod.PATCH
    },
    maxAge = 3600  // Cache preflight response for 1 hour
)
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    @GetMapping("/public/health")
    public ResponseEntity<Map<String, Object>> publicHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "LegalSwami Chat API");
        response.put("timestamp", System.currentTimeMillis());
        response.put("version", "1.0.0");
        response.put("message", "LegalSwami Backend is operational");
        
        System.out.println("🏥 Public health check requested");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/chat/send")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader Map<String, String> headers) {
        
        String userId = "guest";
        if (headers.containsKey("x-user-id")) {
            userId = headers.get("x-user-id");
        } else if (headers.containsKey("X-User-Id")) {
            userId = headers.get("X-User-Id");
        } else if (headers.containsKey("x-request-id")) {
            String requestId = headers.get("x-request-id");
            userId = "user_" + requestId.hashCode();
        }
        
        System.out.println("📱 Received chat request from user: " + userId);
        if (headers.containsKey("x-language")) {
            System.out.println("   Language: " + headers.get("x-language"));
        }
        if (headers.containsKey("x-request-id")) {
            System.out.println("   Request ID: " + headers.get("x-request-id"));
        }
        
        ChatResponse response = chatService.processMessage(request, userId);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/chat/history")
    public ResponseEntity<List<ChatResponse>> getChatHistory(
            @RequestParam(defaultValue = "guest") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader Map<String, String> headers) {
        
        if (headers.containsKey("x-request-id")) {
            System.out.println("📜 Loading history with Request ID: " + headers.get("x-request-id"));
        }
        
        System.out.println("📜 Loading history for user: " + userId + 
                          ", page: " + page + ", size: " + size);
        
        List<ChatResponse> history = chatService.getChatHistory(userId, page, size);
        return ResponseEntity.ok(history);
    }
    
    @DeleteMapping("/chat/{chatId}")
    public ResponseEntity<Void> deleteChat(
            @PathVariable String chatId,
            @RequestParam String userId) {
        chatService.deleteChat(chatId, userId);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/chat/{chatId}/regenerate")
    public ResponseEntity<ChatResponse> regenerateResponse(
            @PathVariable String chatId,
            @RequestParam String userId) {
        ChatResponse response = chatService.regenerateResponse(chatId, userId);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/chat/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("LegalSwami Chat API is running");
    }
    
    // ✅ FIXED: Remove conflicting OPTIONS handlers and let Spring handle them
    // The @CrossOrigin annotation handles OPTIONS automatically
}
