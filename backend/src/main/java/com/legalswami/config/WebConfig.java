package com.legalswami.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(
                "https://legal-swami.github.io",
                "http://localhost:3000",
                "https://legal-swami.github.io/legalswami"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH")
            .allowedHeaders(
                "Content-Type",
                "Authorization", 
                "X-User-Id",
                "X-User-ID",
                "Accept",
                "Origin",
                "X-Requested-With",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
            )
            .exposedHeaders(
                "Authorization",
                "X-User-Id"
            )
            .allowCredentials(false)
            .maxAge(3600);
    }
}
