package com.legalswami.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Bean
    public CorsFilter corsFilter() {
        System.out.println("✅ Configuring CORS Filter with all required headers...");
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowCredentials(true);
        
        // Use allowedOriginPatterns for flexibility
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "https://*.github.io",
            "https://*.githubusercontent.com",
            "http://127.0.0.1:*",
            "https://*.vercel.app",
            "https://*.netlify.app"
        ));
        
        // ✅ CRITICAL: ADD x-language HEADER HERE
        config.setAllowedHeaders(Arrays.asList(
            "Origin", 
            "Content-Type", 
            "Accept", 
            "Authorization",
            "X-Requested-With", 
            "X-Auth-Token", 
            "X-API-Key",
            
            // User and request headers
            "X-User-Id",          
            "x-user-id",          
            "X-Request-Id",       
            "x-request-id",       
            
            // ✅ ADD THESE - THE MISSING HEADERS:
            "x-language",         // ✅ CRITICAL: This was missing!
            "X-Language",         // ✅ Uppercase version
            "x-session-id",       // ✅ Additional headers your frontend might send
            "X-Session-Id",      
            "x-client-version",   
            "X-Client-Version",
            
            // CORS preflight headers
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
            
            // Cache and other headers
            "Cache-Control",
            "Pragma",
            "Expires",
            "If-Modified-Since",
            "If-None-Match"
        ));
        
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));
        
        config.setExposedHeaders(Arrays.asList(
            // Standard headers
            "Authorization", 
            "Content-Type",
            "Content-Length",
            "Content-Disposition",
            
            // Custom headers to expose to frontend
            "X-Total-Count", 
            "X-Rate-Limit-Remaining",
            "X-Rate-Limit-Reset",
            
            // Your custom headers
            "X-User-Id",
            "x-user-id",
            "X-Request-Id",
            "x-request-id",
            
            // ✅ Expose language header too
            "X-Language",
            "x-language",
            
            // CORS headers
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Credentials",
            "Access-Control-Expose-Headers"
        ));
        
        config.setMaxAge(3600L); // 1 hour cache for preflight
        
        // Apply to all endpoints
        source.registerCorsConfiguration("/**", config);
        
        System.out.println("✅ CORS Filter configured with headers: " + config.getAllowedHeaders());
        return new CorsFilter(source);
    }
    
    // Additional configuration via WebMvcConfigurer
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        System.out.println("✅ Adding CORS mappings via WebMvcConfigurer...");
        
        registry.addMapping("/api/**")
            .allowedOriginPatterns(
                "http://localhost:*",
                "https://*.github.io",
                "https://*.githubusercontent.com",
                "http://127.0.0.1:*"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD")
            .allowedHeaders("*") // Allow all headers for simplicity
            .exposedHeaders(
                "x-user-id", "X-User-Id",
                "x-request-id", "X-Request-Id",
                "x-language", "X-Language",
                "x-session-id", "X-Session-Id"
            )
            .allowCredentials(true)
            .maxAge(3600);
        
        registry.addMapping("/**")
            .allowedMethods("GET", "OPTIONS", "HEAD")
            .allowedOriginPatterns("*")
            .maxAge(3600);
    }
}
