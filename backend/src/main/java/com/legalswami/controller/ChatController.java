package com.legalswami.controller;

import com.legalswami.model.ChatRequest;
import com.legalswami.model.ChatResponse;
import com.legalswami.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@CrossOrigin(origins = {
    "https://legal-swami.github.io",
    "http://localhost:3000", 
    "https://legal-swami.github.io/legalswami"
}, allowedHeaders = "*")    
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    @PostMapping("/send")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader Map<String, String> headers) {  // Get all headers
        
        // Extract user ID from headers (case-insensitive)
        String userId = "guest";
        if (headers.containsKey("x-user-id")) {
            userId = headers.get("x-user-id");
        } else if (headers.containsKey("X-User-Id")) {
            userId = headers.get("X-User-Id");
        }
        
        ChatResponse response = chatService.processMessage(request, userId);
        return ResponseEntity.ok(response);
    }
    
    // Or keep the original but add a helper method
    /*
    @PostMapping("/send")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        
        if (userId == null) {
            userId = "guest";
        }
        
        ChatResponse response = chatService.processMessage(request, userId);
        return ResponseEntity.ok(response);
    }
    */
    
    @GetMapping("/history")
    public ResponseEntity<List<ChatResponse>> getChatHistory(
            @RequestParam(defaultValue = "guest") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<ChatResponse> history = chatService.getChatHistory(userId, page, size);
        return ResponseEntity.ok(history);
    }
    
    @DeleteMapping("/{chatId}")
    public ResponseEntity<Void> deleteChat(
            @PathVariable String chatId,
            @RequestParam String userId) {
        chatService.deleteChat(chatId, userId);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{chatId}/regenerate")
    public ResponseEntity<ChatResponse> regenerateResponse(
            @PathVariable String chatId,
            @RequestParam String userId) {
        ChatResponse response = chatService.regenerateResponse(chatId, userId);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("LegalSwami Chat API is running");
    }
}
