package com.legalswami.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    
    @Bean
    public CorsFilter corsFilter() {
        System.out.println("✅ Configuring CORS Filter with x-user-id support...");
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Allow specific origins for production
        config.setAllowedOrigins(Arrays.asList(
            "https://legal-swami.github.io",
            "http://localhost:3000",
            "https://legal-swami.github.io/legalswami"
        ));
        
        // OR use patterns (choose one approach)
        // config.setAllowedOriginPatterns(List.of(
        //     "https://legal-swami.github.io",
        //     "http://localhost:*",
        //     "https://*.github.io"
        // ));
        
        // ✅ FIX: Add x-user-id to allowed headers (both lowercase and uppercase)
        config.setAllowedHeaders(Arrays.asList(
            "Origin", 
            "Content-Type", 
            "Accept", 
            "Authorization",
            "X-Requested-With", 
            "X-Auth-Token", 
            "X-API-Key",
            "X-User-Id",    // Uppercase version
            "x-user-id",    // Lowercase version (important!)
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));
        
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));
        
        // ✅ FIX: Add x-user-id to exposed headers
        config.setExposedHeaders(Arrays.asList(
            "Authorization", 
            "X-Total-Count", 
            "X-Rate-Limit-Remaining",
            "X-User-Id",
            "x-user-id"
        ));
        
        // For CORS, allowCredentials should be false when using wildcard origins
        // But since we're specifying exact origins, we can keep it true
        config.setAllowCredentials(true);
        
        config.setMaxAge(3600L);
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
