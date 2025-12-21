package com.legalswami.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        System.out.println("🔧 Configuring CORS via WebMvcConfigurer...");
        
        registry.addMapping("/**")
            .allowedOrigins(
                "https://legal-swami.github.io",
                "http://localhost:3000",
                "https://legal-swami.github.io/legalswami"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")  // Allow ALL headers
            .exposedHeaders("*")  // Expose ALL headers
            .allowCredentials(false)
            .maxAge(3600);
    }
    
    // Additional CORS filter for better compatibility
    @Bean
    public CorsFilter corsFilter() {
        System.out.println("🔧 Creating additional CORS Filter...");
        
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(false);
        config.addAllowedOrigin("https://legal-swami.github.io");
        config.addAllowedOrigin("http://localhost:3000");
        config.addAllowedOrigin("https://legal-swami.github.io/legalswami");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}
