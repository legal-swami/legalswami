package com.legalswami.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.crypto.Cipher;
import jakarta.crypto.spec.SecretKeySpec;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;
import java.util.regex.Pattern;

@Service
public class ApiKeyService {
    
    private static final Logger logger = Logger.getLogger(ApiKeyService.class.getName());
    
    // Pattern to detect Groq API keys (starts with gsk_)
    private static final Pattern GROQ_KEY_PATTERN = Pattern.compile("^gsk_[a-zA-Z0-9]+$");
    
    @Value("${api.key.encryption.secret:default-encryption-secret-change-this-in-production}")
    private String encryptionSecret;
    
    @Value("#{'${groq.api.keys:}'.split(',')}")
    private List<String> rawKeys;
    
    @Value("${groq.api.key:#{null}}")
    private String singleApiKey;
    
    @Value("${GROQ_API_KEY:#{null}}")
    private String envApiKey;
    
    @Value("#{'${GROQ_API_KEYS:}'.split(',')}")
    private List<String> envApiKeys;
    
    private final Map<String, ApiKeyUsage> keyUsageTracker = new ConcurrentHashMap<>();
    private final List<String> availableKeys = Collections.synchronizedList(new ArrayList<>());
    
    @PostConstruct
    public void init() {
        try {
            logger.info("🚀 Initializing ApiKeyService...");
            
            // Collect keys from ALL possible sources
            List<String> allRawKeys = new ArrayList<>();
            
            // 1. Add single API key from groq.api.key
            if (singleApiKey != null && !singleApiKey.trim().isEmpty()) {
                allRawKeys.add(singleApiKey.trim());
                logger.info("✅ Found API key from groq.api.key property");
            }
            
            // 2. Add keys from groq.api.keys (comma-separated)
            if (rawKeys != null && !rawKeys.isEmpty()) {
                for (String key : rawKeys) {
                    if (key != null && !key.trim().isEmpty()) {
                        allRawKeys.add(key.trim());
                    }
                }
                logger.info("✅ Found " + rawKeys.size() + " keys from groq.api.keys");
            }
            
            // 3. Add keys from GROQ_API_KEY environment variable
            if (envApiKey != null && !envApiKey.trim().isEmpty()) {
                allRawKeys.add(envApiKey.trim());
                logger.info("✅ Found API key from GROQ_API_KEY environment variable");
            }
            
            // 4. Add keys from GROQ_API_KEYS environment variable
            if (envApiKeys != null && !envApiKeys.isEmpty()) {
                for (String key : envApiKeys) {
                    if (key != null && !key.trim().isEmpty()) {
                        allRawKeys.add(key.trim());
                    }
                }
                logger.info("✅ Found " + envApiKeys.size() + " keys from GROQ_API_KEYS");
            }
            
            // 5. Add individual numbered keys (GROQ_API_KEY_1, GROQ_API_KEY_2, etc.)
            for (int i = 1; i <= 10; i++) {
                String envVar = System.getenv("GROQ_API_KEY_" + i);
                if (envVar != null && !envVar.trim().isEmpty()) {
                    allRawKeys.add(envVar.trim());
                    logger.info("✅ Found API key from GROQ_API_KEY_" + i);
                }
            }
            
            logger.info("📋 Total raw keys collected: " + allRawKeys.size());
            
            // Process each key
            for (String rawKey : allRawKeys) {
                if (rawKey == null || rawKey.trim().isEmpty()) {
                    continue;
                }
                
                String key = rawKey.trim();
                
                try {
                    // Determine if key is encrypted or plain text
                    String decryptedKey;
                    
                    if (isProbablyEncrypted(key)) {
                        // Try to decrypt it
                        decryptedKey = decryptApiKey(key);
                        logger.info("🔓 Successfully decrypted encrypted API key");
                    } else {
                        // Already plain text
                        decryptedKey = key;
                        logger.info("📝 Using plain text API key");
                    }
                    
                    // Validate it looks like a Groq API key
                    if (isValidGroqKey(decryptedKey)) {
                        availableKeys.add(decryptedKey);
                        keyUsageTracker.put(decryptedKey, new ApiKeyUsage());
                        logger.info("✅ Added valid API key (starts with: " + 
                                  decryptedKey.substring(0, Math.min(8, decryptedKey.length())) + "...)");
                    } else {
                        logger.warning("⚠️ Invalid API key format: " + 
                                     decryptedKey.substring(0, Math.min(10, decryptedKey.length())) + "...");
                    }
                    
                } catch (Exception e) {
                    logger.warning("❌ Failed to process API key: " + e.getMessage());
                }
            }
            
            if (availableKeys.isEmpty()) {
                logger.severe("⚠️ WARNING: No valid API keys available!");
                logger.severe("   Add Groq API keys to environment variables:");
                logger.severe("   - GROQ_API_KEY=gsk_your_key_here");
                logger.severe("   - OR GROQ_API_KEYS=gsk_key1,gsk_key2");
                logger.severe("   - OR GROQ_API_KEY_1, GROQ_API_KEY_2, etc.");
            } else {
                logger.info("🎉 ApiKeyService initialized successfully with " + 
                          availableKeys.size() + " valid API keys");
                logger.info("   Available keys: " + 
                          availableKeys.stream()
                              .map(k -> k.substring(0, Math.min(8, k.length())) + "...")
                              .toList());
            }
            
        } catch (Exception e) {
            logger.severe("🔥 Critical error in ApiKeyService initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private boolean isProbablyEncrypted(String key) {
        // Encrypted keys are usually Base64 encoded and don't look like Groq keys
        // Groq keys start with "gsk_" and contain alphanumeric characters
        if (key.startsWith("gsk_") && key.length() > 40) {
            return false; // Probably plain Groq key
        }
        
        // Check if it looks like Base64
        try {
            if (key.matches("^[A-Za-z0-9+/]+={0,2}$")) {
                Base64.getDecoder().decode(key);
                return true; // Valid Base64, probably encrypted
            }
        } catch (Exception e) {
            // Not Base64
        }
        
        return false;
    }
    
    private boolean isValidGroqKey(String key) {
        return key != null && 
               key.length() >= 40 && 
               key.startsWith("gsk_") &&
               GROQ_KEY_PATTERN.matcher(key).matches();
    }
    
    public synchronized String getRotatedKey() {
        if (availableKeys.isEmpty()) {
            logger.warning("❌ No API keys available for rotation");
            return null;
        }
        
        try {
            String leastUsedKey = keyUsageTracker.entrySet().stream()
                .min(Comparator.comparingInt(e -> e.getValue().getRequestCount()))
                .map(Map.Entry::getKey)
                .orElse(availableKeys.get(0));
            
            if (leastUsedKey != null) {
                keyUsageTracker.get(leastUsedKey).incrementRequestCount();
                logger.fine("🔄 Rotated to API key (starts with: " + 
                          leastUsedKey.substring(0, Math.min(8, leastUsedKey.length())) + "...)");
            }
            
            return leastUsedKey;
        } catch (Exception e) {
            logger.warning("Error during key rotation: " + e.getMessage());
            return availableKeys.isEmpty() ? null : availableKeys.get(0);
        }
    }
    
    public synchronized void markKeyAsInvalid(String apiKey) {
        if (apiKey != null) {
            availableKeys.remove(apiKey);
            keyUsageTracker.remove(apiKey);
            logger.warning("❌ Marked API key as invalid. Remaining keys: " + availableKeys.size());
        }
    }
    
    private String decryptApiKey(String encryptedKey) throws Exception {
        try {
            // First, try standard decryption
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            SecretKeySpec keySpec = new SecretKeySpec(
                Arrays.copyOf(encryptionSecret.getBytes("UTF-8"), 16),
                "AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            
            byte[] decrypted = cipher.doFinal(
                Base64.getDecoder().decode(encryptedKey));
            return new String(decrypted, "UTF-8");
            
        } catch (Exception e) {
            // Fallback: If it looks like it's already a plain Groq key, return it
            if (encryptedKey.startsWith("gsk_") && encryptedKey.length() > 30) {
                return encryptedKey;
            }
            
            // Fallback 2: Try simple Base64 decode
            try {
                byte[] decoded = Base64.getDecoder().decode(encryptedKey);
                String result = new String(decoded, "UTF-8");
                logger.info("📦 Used simple Base64 decode for key");
                return result;
            } catch (Exception e2) {
                throw new Exception("Failed to decrypt API key", e);
            }
        }
    }
    
    public int getAvailableKeyCount() {
        return availableKeys.size();
    }
    
    public boolean hasApiKeys() {
        return !availableKeys.isEmpty();
    }
    
    // Helper method to check what's in environment
    public Map<String, Object> getDebugInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("availableKeysCount", availableKeys.size());
        info.put("availableKeysPreview", availableKeys.stream()
            .map(k -> k.substring(0, Math.min(8, k.length())) + "...")
            .toList());
        info.put("totalEnvVars", System.getenv().size());
        
        // Get specific Groq-related env vars
        Map<String, String> groqEnvVars = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            String key = "GROQ_API_KEY_" + i;
            String value = System.getenv(key);
            if (value != null) {
                groqEnvVars.put(key, value.substring(0, Math.min(8, value.length())) + "...");
            }
        }
        
        groqEnvVars.put("GROQ_API_KEY", System.getenv("GROQ_API_KEY"));
        groqEnvVars.put("GROQ_API_KEYS", System.getenv("GROQ_API_KEYS"));
        info.put("groqEnvVars", groqEnvVars);
        
        return info;
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
