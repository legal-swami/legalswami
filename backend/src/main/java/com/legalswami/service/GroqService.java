package com.legalswami.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.*;

@Service
public class GroqService {
    
    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String apiUrl;
    
    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String model;
    
    @Autowired
    private ApiKeyService apiKeyService;
    
    private final WebClient webClient = WebClient.builder().build();
    
    public String sendChatCompletion(List<Map<String, String>> messages) {
        String apiKey = apiKeyService.getRotatedKey();
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 4000);
        requestBody.put("stream", false);
        
        try {
            String response = webClient.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                    clientResponse -> {
                        if (clientResponse.statusCode() == HttpStatus.UNAUTHORIZED) {
                            apiKeyService.markKeyAsInvalid(apiKey);
                        }
                        return clientResponse.bodyToMono(String.class)
                            .flatMap(error -> Mono.error(new RuntimeException("API Error: " + error)));
                    })
                .bodyToMono(String.class)
                .block();
            
            return extractContentFromResponse(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Groq API: " + e.getMessage(), e);
        }
    }
    
    private String extractContentFromResponse(String jsonResponse) {
        try {
            org.json.JSONObject jsonObject = new org.json.JSONObject(jsonResponse);
            return jsonObject.getJSONArray("choices")
                .getJSONObject(0)
                .getJSONObject("message")
                .getString("content");
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse API response: " + e.getMessage(), e);
        }
    }
    
    public Mono<String> sendChatCompletionStream(List<Map<String, String>> messages) {
        String apiKey = apiKeyService.getRotatedKey();
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 4000);
        requestBody.put("stream", true);
        
        return webClient.post()
            .uri(apiUrl)
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .bodyValue(requestBody)
            .retrieve()
            .bodyToMono(String.class);
    }
}