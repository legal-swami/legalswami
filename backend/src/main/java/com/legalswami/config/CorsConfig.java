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
        System.out.println("✅ Configuring CORS Filter with all required headers...");
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "https://*.github.io",
            "https://legal-swami.github.io",
            "http://127.0.0.1:*"
        ));
        
        // ✅ ADD ALL HEADERS YOUR FRONTEND SENDS
        config.setAllowedHeaders(Arrays.asList(
            "Origin", 
            "Content-Type", 
            "Accept", 
            "Authorization",
            "X-Requested-With", 
            "X-Auth-Token", 
            "X-API-Key",
            "X-User-Id",          // Uppercase
            "x-user-id",          // Lowercase  
            "x-request-id",       // ✅ ADD THIS - New error header
            "X-Request-Id",       // ✅ Uppercase version
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            "Cache-Control",
            "Pragma"
        ));
        
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));
        
        config.setExposedHeaders(Arrays.asList(
            "Authorization", 
            "X-Total-Count", 
            "X-Rate-Limit-Remaining",
            "X-User-Id",
            "x-user-id",
            "x-request-id",      // ✅ Expose this too
            "X-Request-Id"
        ));
        
        config.setMaxAge(3600L);
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
