package com.legalswami.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

@Service
public class ApiKeyService {
    
    private static final Logger logger = Logger.getLogger(ApiKeyService.class.getName());
    
    @Value("${api.key.encryption.secret:default-encryption-secret-change-this-in-production}")
    private String encryptionSecret;
    
    @Value("#{'${groq.api.keys:}'.split(',')}")
    private List<String> encryptedKeys;
    
    private final Map<String, ApiKeyUsage> keyUsageTracker = new ConcurrentHashMap<>();
    private final List<String> decryptedKeys = Collections.synchronizedList(new ArrayList<>());
    
    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing ApiKeyService...");
            
            // Check if properties are available
            if (encryptionSecret == null || encryptionSecret.trim().isEmpty()) {
                logger.warning("api.key.encryption.secret is not configured. Using default.");
                encryptionSecret = "default-encryption-secret-change-this-in-production";
            }
            
            if (encryptedKeys == null || encryptedKeys.isEmpty() || 
                (encryptedKeys.size() == 1 && encryptedKeys.get(0).isEmpty())) {
                logger.warning("No encrypted API keys configured. Service will run in limited mode.");
                // Don't throw exception, just log warning
                return;
            }
            
            logger.info("Found " + encryptedKeys.size() + " encrypted API keys to process");
            
            // Process each encrypted key
            for (String encryptedKey : encryptedKeys) {
                String trimmedKey = encryptedKey.trim();
                if (!trimmedKey.isEmpty()) {
                    try {
                        String decryptedKey = decryptApiKey(trimmedKey);
                        decryptedKeys.add(decryptedKey);
                        keyUsageTracker.put(decryptedKey, new ApiKeyUsage());
                        logger.info("Successfully decrypted API key (first 5 chars: " + 
                                  decryptedKey.substring(0, Math.min(5, decryptedKey.length())) + "...)");
                    } catch (Exception e) {
                        logger.warning("Failed to decrypt API key: " + e.getMessage());
                        // Continue with other keys instead of failing completely
                    }
                }
            }
            
            if (decryptedKeys.isEmpty()) {
                logger.warning("No valid API keys could be decrypted. Chat features will not work.");
            } else {
                logger.info("ApiKeyService initialized successfully with " + decryptedKeys.size() + " API keys");
            }
            
        } catch (Exception e) {
            logger.severe("Critical error in ApiKeyService initialization: " + e.getMessage());
            // Don't rethrow - allow application to start
            // In production, you might want to rethrow, but for development/testing, continue
        }
    }
    
    public synchronized String getRotatedKey() {
        if (decryptedKeys.isEmpty()) {
            logger.warning("No API keys available for rotation");
            return null; // Return null instead of throwing exception
        }
        
        try {
            String leastUsedKey = keyUsageTracker.entrySet().stream()
                .min(Comparator.comparingInt(e -> e.getValue().getRequestCount()))
                .map(Map.Entry::getKey)
                .orElse(null);
            
            if (leastUsedKey != null) {
                keyUsageTracker.get(leastUsedKey).incrementRequestCount();
                logger.fine("Rotated to API key (first 5 chars: " + 
                          leastUsedKey.substring(0, Math.min(5, leastUsedKey.length())) + "...)");
            }
            
            return leastUsedKey;
        } catch (Exception e) {
            logger.warning("Error during key rotation: " + e.getMessage());
            return decryptedKeys.isEmpty() ? null : decryptedKeys.get(0);
        }
    }
    
    public synchronized void markKeyAsInvalid(String apiKey) {
        if (apiKey != null) {
            decryptedKeys.remove(apiKey);
            keyUsageTracker.remove(apiKey);
            logger.warning("Marked API key as invalid. Remaining keys: " + decryptedKeys.size());
        }
    }
    
    private String decryptApiKey(String encryptedKey) throws Exception {
        try {
            // Use simpler AES/ECB/PKCS5Padding for compatibility (GCM requires more setup)
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(
                Arrays.copyOf(encryptionSecret.getBytes("UTF-8"), 16), // Ensure 16-byte key for AES-128
                "AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            
            byte[] decrypted = cipher.doFinal(
                Base64.getDecoder().decode(encryptedKey));
            return new String(decrypted, "UTF-8");
            
        } catch (Exception e) {
            // Fallback: Try simpler approach for development
            logger.warning("Standard decryption failed, trying simple Base64 decode");
            
            // For development/testing: If the "encrypted" key looks like a plain API key
            if (encryptedKey.startsWith("gsk_") || encryptedKey.length() > 30) {
                // Might already be a plain key, return as-is
                return encryptedKey;
            }
            
            // Try simple Base64 decode
            try {
                byte[] decoded = Base64.getDecoder().decode(encryptedKey);
                return new String(decoded, "UTF-8");
            } catch (Exception e2) {
                throw new Exception("Failed to decrypt API key: " + e.getMessage(), e);
            }
        }
    }
    
    public int getAvailableKeyCount() {
        return decryptedKeys.size();
    }
    
    public boolean hasApiKeys() {
        return !decryptedKeys.isEmpty();
    }
    
    // Helper method for testing/development
    public String encryptApiKey(String plainKey) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
        SecretKeySpec keySpec = new SecretKeySpec(
            Arrays.copyOf(encryptionSecret.getBytes("UTF-8"), 16),
            "AES");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        
        byte[] encrypted = cipher.doFinal(plainKey.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encrypted);
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
