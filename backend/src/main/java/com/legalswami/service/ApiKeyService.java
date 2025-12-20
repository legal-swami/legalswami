package com.legalswami.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ApiKeyService {
    
    @Value("${api.key.encryption.secret}")
    private String encryptionSecret;
    
    @Value("#{'${groq.api.keys}'.split(',')}")
    private List<String> encryptedKeys;
    
    private final Map<String, ApiKeyUsage> keyUsageTracker = new ConcurrentHashMap<>();
    private final List<String> decryptedKeys = new ArrayList<>();
    
    @PostConstruct
    public void init() {
        if (encryptedKeys == null || encryptedKeys.isEmpty()) {
            throw new RuntimeException("No API keys configured");
        }
        
        encryptedKeys.forEach(encryptedKey -> {
            try {
                String decryptedKey = decryptApiKey(encryptedKey.trim());
                decryptedKeys.add(decryptedKey);
                keyUsageTracker.put(decryptedKey, new ApiKeyUsage());
            } catch (Exception e) {
                throw new RuntimeException("Failed to decrypt API key", e);
            }
        });
    }
    
    public synchronized String getRotatedKey() {
        if (decryptedKeys.isEmpty()) {
            throw new RuntimeException("No API keys available");
        }
        
        String leastUsedKey = keyUsageTracker.entrySet().stream()
            .min(Comparator.comparingInt(e -> e.getValue().getRequestCount()))
            .map(Map.Entry::getKey)
            .orElseThrow(() -> new RuntimeException("No API keys available"));
        
        keyUsageTracker.get(leastUsedKey).incrementRequestCount();
        return leastUsedKey;
    }
    
    public synchronized void markKeyAsInvalid(String apiKey) {
        decryptedKeys.remove(apiKey);
        keyUsageTracker.remove(apiKey);
    }
    
    private String decryptApiKey(String encryptedKey) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(
            encryptionSecret.getBytes(), "AES");
        cipher.init(Cipher.DECRYPT_MODE, keySpec);
        
        byte[] decrypted = cipher.doFinal(
            Base64.getDecoder().decode(encryptedKey));
        return new String(decrypted);
    }
    
    public int getAvailableKeyCount() {
        return decryptedKeys.size();
    }
    
    private static class ApiKeyUsage {
        private int requestCount = 0;
        private Date lastUsed;
        
        public void incrementRequestCount() {
            this.requestCount++;
            this.lastUsed = new Date();
        }
        
        public int getRequestCount() {
            return requestCount;
        }
    }
}