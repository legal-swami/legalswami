package com.legalswami.controller;

import com.legalswami.model.ChatRequest;
import com.legalswami.model.ChatResponse;
import com.legalswami.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    @PostMapping("/send")
    public ResponseEntity<ChatResponse> sendMessage(@Valid @RequestBody ChatRequest request) {
        ChatResponse response = chatService.processMessage(request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/send-stream")
    public ResponseEntity<String> sendMessageStream(@Valid @RequestBody ChatRequest request) {
        // For streaming responses
        return ResponseEntity.ok()
            .header("Content-Type", "text/event-stream")
            .body(chatService.processMessageStream(request));
    }
    
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