package com.legalswami.service;

import com.legalswami.model.Chat;
import com.legalswami.model.ChatRequest;
import com.legalswami.model.ChatResponse;
import com.legalswami.repository.ChatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChatService {
    
    @Autowired
    private ChatRepository chatRepository;
    
    @Autowired
    private GroqService groqService;
    
    public ChatResponse processMessage(ChatRequest request, String userId) {
        // Prepare messages for Groq API
        List<java.util.Map<String, String>> messages = prepareMessages(request);
        
        // Call Groq API
        String response = groqService.sendChatCompletion(messages);
        
        // Save to database
        Chat chat = new Chat();
        chat.setUserId(userId);
        chat.setMessage(request.getMessage());
        chat.setResponse(response);
        chat.setIsDocument(request.getGenerateDocument());
        chat.setDocumentType(request.getDocumentType());
        
        Chat savedChat = chatRepository.save(chat);
        
        return convertToResponse(savedChat);
    }
    
    public List<ChatResponse> getChatHistory(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        return chatRepository.findByUserId(userId, pageable)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    public void deleteChat(String chatId, String userId) {
        Chat chat = chatRepository.findByIdAndUserId(chatId, userId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        
        chatRepository.delete(chat);
    }
    
    public ChatResponse regenerateResponse(String chatId, String userId) {
        Chat chat = chatRepository.findByIdAndUserId(chatId, userId)
                .orElseThrow(() -> new RuntimeException("Chat not found"));
        
        // Regenerate response using Groq
        List<java.util.Map<String, String>> messages = List.of(
                java.util.Map.of("role", "user", "content", chat.getMessage())
        );
        
        String newResponse = groqService.sendChatCompletion(messages);
        chat.setResponse(newResponse);
        
        Chat updatedChat = chatRepository.save(chat);
        
        return convertToResponse(updatedChat);
    }
    
    private List<java.util.Map<String, String>> prepareMessages(ChatRequest request) {
        // Prepare system prompt for legal context
        String systemPrompt = "You are LegalSwami, an AI legal assistant. Provide accurate, helpful legal information. " +
                "Always mention that you are an AI and not a substitute for a real lawyer. " +
                "Be clear, concise, and cite relevant laws where possible.";
        
        return List.of(
                java.util.Map.of("role", "system", "content", systemPrompt),
                java.util.Map.of("role", "user", "content", request.getMessage())
        );
    }
    
    private ChatResponse convertToResponse(Chat chat) {
        ChatResponse response = new ChatResponse();
        response.setId(chat.getId());
        response.setUserId(chat.getUserId());
        response.setMessage(chat.getMessage());
        response.setResponse(chat.getResponse());
        response.setIsDocument(chat.getIsDocument());
        response.setDocumentType(chat.getDocumentType());
        response.setCreatedAt(chat.getCreatedAt());
        response.setUpdatedAt(chat.getUpdatedAt());
        return response;
    }
}