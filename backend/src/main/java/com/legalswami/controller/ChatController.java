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
@CrossOrigin(origins = {
    "https://legal-swami.github.io",
    "http://localhost:3000", 
    "https://legal-swami.github.io/legalswami",
    "http://localhost:8080",
    "http://127.0.0.1:3000"
}, allowedHeaders = "*", exposedHeaders = "*", methods = {
    RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, 
    RequestMethod.DELETE, RequestMethod.OPTIONS, RequestMethod.PATCH
})
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    // ✅ ADD PUBLIC HEALTH ENDPOINT (frontend /api/v1/public/health access kar raha hai)
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
    
    // ✅ Chat endpoints under /chat path
    @PostMapping("/chat/send")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader Map<String, String> headers) {
        
        // Extract user ID from headers (case-insensitive)
        String userId = "guest";
        if (headers.containsKey("x-user-id")) {
            userId = headers.get("x-user-id");
        } else if (headers.containsKey("X-User-Id")) {
            userId = headers.get("X-User-Id");
        } else if (headers.containsKey("x-request-id")) {
            // Optional: Extract from x-request-id if needed
            String requestId = headers.get("x-request-id");
            userId = "user_" + requestId.hashCode();
        }
        
        System.out.println("📱 Received chat request from user: " + userId);
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
        
        // Log x-request-id if present
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
    
    // ✅ ADD GLOBAL OPTIONS HANDLER FOR ALL ENDPOINTS
    @RequestMapping(value = {"/**", "/chat/**", "/public/**"}, method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() {
        System.out.println("🔄 Handling OPTIONS request for CORS preflight");
        return ResponseEntity.ok()
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD")
                .header("Access-Control-Allow-Headers", "*")
                .header("Access-Control-Max-Age", "3600")
                .build();
    }
    
    // ✅ ADD OPTIONS HANDLER SPECIFICALLY FOR HISTORY ENDPOINT
    @RequestMapping(value = "/chat/history", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleHistoryOptions() {
        System.out.println("🔄 Handling OPTIONS request specifically for /chat/history");
        return ResponseEntity.ok().build();
    }
    
    // ✅ ADD OPTIONS HANDLER FOR PUBLIC HEALTH
    @RequestMapping(value = "/public/health", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handlePublicHealthOptions() {
        System.out.println("🔄 Handling OPTIONS request for /public/health");
        return ResponseEntity.ok().build();
    }
}
