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
    
    // ⭐⭐ FIXED: Use String instead of array, initialize later
    @Value("${groq.api.models:llama-4-scout-17b-16e-instruct,llama-3.1-8b-8192,llama3-70b-8192,mixtral-8x7b-32768}")
    private String modelsConfig;
    
    private String[] availableModels;  // Will be initialized in @PostConstruct
    
    @Value("${groq.api.fallback.enabled:true}")
    private boolean fallbackEnabled;
    
    @Value("${groq.api.fallback.max-attempts:2}")
    private int maxAttemptsPerModel;
    
    @Autowired
    private ApiKeyService apiKeyService;
    
    private final WebClient webClient = WebClient.builder().build();
    
    // Track current model index and failure counts
    private int currentModelIndex = 0;
    private final Map<String, Integer> modelFailureCount = new HashMap<>();
    private final Map<String, Integer> modelSuccessCount = new HashMap<>();
    
    // ⭐⭐ REMOVED: Constructor initialization
    // No constructor - will use @PostConstruct instead
    
    @javax.annotation.PostConstruct  // or jakarta.annotation.PostConstruct
    public void init() {
        // Initialize models from config string
        if (modelsConfig != null && !modelsConfig.trim().isEmpty()) {
            this.availableModels = modelsConfig.split(",");
            // Trim whitespace from each model
            for (int i = 0; i < availableModels.length; i++) {
                availableModels[i] = availableModels[i].trim();
            }
        } else {
            // Default models if not configured
            this.availableModels = new String[]{
                "llama-4-scout-17b-16e-instruct", 
                "llama-3.1-8b-8192", 
                "llama3-70b-8192"
            };
        }
        
        // Initialize tracking for all models
        for (String model : availableModels) {
            modelFailureCount.put(model, 0);
            modelSuccessCount.put(model, 0);
        }
        
        System.out.println("✅ GroqService initialized with " + availableModels.length + " models: " + 
                          Arrays.toString(availableModels));
    }
    
    public String sendChatCompletion(List<Map<String, String>> messages) {
        if (availableModels == null || availableModels.length == 0) {
            throw new RuntimeException("No models configured in GroqService");
        }
        
        if (fallbackEnabled) {
            return sendWithModelFallback(messages);
        } else {
            // Use only current model (backward compatibility)
            return sendWithSingleModel(messages, availableModels[currentModelIndex]);
        }
    }
    
    /**
     * ⭐⭐ NEW: Method with automatic model fallback ⭐⭐
     * Tries models in order, moves to next if current fails
     */
    private String sendWithModelFallback(List<Map<String, String>> messages) {
        String lastError = "";
        int totalModelsTried = 0;
        
        // Start from current model index
        int startIndex = currentModelIndex;
        
        do {
            String currentModel = availableModels[currentModelIndex];
            totalModelsTried++;
            
            System.out.println("[GroqService] Trying model: " + currentModel + 
                             " (Attempt " + totalModelsTried + "/" + availableModels.length + ")");
            
            try {
                String response = sendWithSingleModel(messages, currentModel);
                
                // Success - update statistics
                modelSuccessCount.put(currentModel, modelSuccessCount.get(currentModel) + 1);
                modelFailureCount.put(currentModel, 0); // Reset failures
                
                System.out.println("[GroqService] Success with model: " + currentModel);
                return response;
                
            } catch (Exception e) {
                lastError = e.getMessage();
                modelFailureCount.put(currentModel, modelFailureCount.get(currentModel) + 1);
                
                System.err.println("[GroqService] Model " + currentModel + " failed: " + 
                                 e.getMessage().substring(0, Math.min(100, e.getMessage().length())));
                
                // Check if error is model-specific (decommissioned, etc.)
                if (isModelSpecificError(e.getMessage())) {
                    System.err.println("[GroqService] Model-specific error detected. Moving to next model.");
                }
                
                // Move to next model (circular)
                currentModelIndex = (currentModelIndex + 1) % availableModels.length;
                
                // If we've tried all models
                if (currentModelIndex == startIndex) {
                    break;
                }
                
                // Small delay before trying next model
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        } while (totalModelsTried < availableModels.length);
        
        // All models failed
        throw new RuntimeException("All Groq models failed. Models tried: " + 
                                 Arrays.toString(availableModels) + 
                                 "\nLast error: " + lastError);
    }
    
    /**
     * Original method (updated for any model)
     */
    private String sendWithSingleModel(List<Map<String, String>> messages, String specificModel) {
        String apiKey = apiKeyService.getRotatedKey();
        
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("No valid API key available");
        }
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", specificModel);  // ⭐ Use the specific model parameter
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
                            .flatMap(error -> {
                                String errorMsg = "API Error: " + error;
                                // Check if it's a model decommissioned error
                                if (error.contains("model_decommissioned") || 
                                    error.contains("decommissioned")) {
                                    errorMsg = "MODEL_DECOMMISSIONED: " + specificModel + " - " + error;
                                }
                                return Mono.error(new RuntimeException(errorMsg));
                            });
                    })
                .bodyToMono(String.class)
                .block();
            
            return extractContentFromResponse(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Groq API with model '" + specificModel + "': " + 
                                     e.getMessage(), e);
        }
    }
    
    /**
     * Detect if error is specific to a model (decommissioned, not found, etc.)
     */
    private boolean isModelSpecificError(String errorMessage) {
        if (errorMessage == null) return false;
        
        String lowerError = errorMessage.toLowerCase();
        return lowerError.contains("model_decommissioned") ||
               lowerError.contains("decommissioned") ||
               lowerError.contains("model not found") ||
               lowerError.contains("invalid model") ||
               lowerError.contains("model does not exist");
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
    
    /**
     * Streaming method (updated for fallback)
     */
    public Mono<String> sendChatCompletionStream(List<Map<String, String>> messages) {
        if (!fallbackEnabled) {
            return sendStreamWithSingleModel(messages, availableModels[currentModelIndex]);
        }
        
        // For streaming, we'll use the first successful model approach
        return Mono.fromCallable(() -> {
            try {
                return sendWithModelFallback(messages);
            } catch (Exception e) {
                return "Error: " + e.getMessage();
            }
        });
    }
    
    private Mono<String> sendStreamWithSingleModel(List<Map<String, String>> messages, String model) {
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
    
    // ⭐⭐ NEW: Utility methods for monitoring ⭐⭐
    
    /**
     * Get current active model
     */
    public String getCurrentModel() {
        return availableModels != null && availableModels.length > currentModelIndex 
               ? availableModels[currentModelIndex] 
               : "No model available";
    }
    
    /**
     * Get list of all available models
     */
    public String[] getAvailableModels() {
        return availableModels != null ? Arrays.copyOf(availableModels, availableModels.length) : new String[0];
    }
    
    /**
     * Get model statistics (success/failure counts)
     */
    public Map<String, Map<String, Integer>> getModelStatistics() {
        Map<String, Map<String, Integer>> stats = new HashMap<>();
        
        if (availableModels != null) {
            for (String model : availableModels) {
                Map<String, Integer> modelStats = new HashMap<>();
                modelStats.put("success", modelSuccessCount.getOrDefault(model, 0));
                modelStats.put("failures", modelFailureCount.getOrDefault(model, 0));
                stats.put(model, modelStats);
            }
        }
        
        return stats;
    }
    
    /**
     * Manually switch to a specific model
     */
    public void switchToModel(String modelName) {
        if (availableModels != null) {
            for (int i = 0; i < availableModels.length; i++) {
                if (availableModels[i].equals(modelName)) {
                    currentModelIndex = i;
                    System.out.println("[GroqService] Switched to model: " + modelName);
                    return;
                }
            }
        }
        throw new IllegalArgumentException("Model not found: " + modelName);
    }
    
    /**
     * Reset all failure counts
     */
    public void resetFailureCounts() {
        if (availableModels != null) {
            for (String model : availableModels) {
                modelFailureCount.put(model, 0);
            }
        }
    }
}
