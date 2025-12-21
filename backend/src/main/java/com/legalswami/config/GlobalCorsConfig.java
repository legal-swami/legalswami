package com.legalswami.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;

@Configuration
public class GlobalCorsConfig {
    
    // Method 1: Using FilterRegistrationBean (Most reliable)
    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration() {
        System.out.println("🚀 Registering Global CORS Filter...");
        
        CorsConfiguration config = new CorsConfiguration();
        
        // Set your allowed origins
        config.setAllowedOrigins(Arrays.asList(
            "https://legal-swami.github.io",
            "http://localhost:3000",
            "https://legal-swami.github.io/legalswami"
        ));
        
        // Allow all methods
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"
        ));
        
        // Allow all headers
        config.setAllowedHeaders(Collections.singletonList("*"));
        
        // Expose all headers
        config.setExposedHeaders(Collections.singletonList("*"));
        
        // Set to false
        config.setAllowCredentials(false);
        
        // Cache for 1 hour
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        
        // Set highest priority
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        
        return bean;
    }
    
    // Method 2: Simple Servlet Filter (Fallback option)
    @Bean
    public FilterRegistrationBean<Filter> simpleCorsFilter() {
        FilterRegistrationBean<Filter> registrationBean = new FilterRegistrationBean<>();
        
        registrationBean.setFilter(new Filter() {
            @Override
            public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) 
                    throws IOException, ServletException {
                
                HttpServletRequest request = (HttpServletRequest) servletRequest;
                HttpServletResponse response = (HttpServletResponse) servletResponse;
                
                // Set CORS headers
                response.setHeader("Access-Control-Allow-Origin", "https://legal-swami.github.io");
                response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                response.setHeader("Access-Control-Allow-Headers", "*");
                response.setHeader("Access-Control-Max-Age", "3600");
                
                // Handle OPTIONS request
                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    return;
                }
                
                chain.doFilter(request, response);
            }
        });
        
        registrationBean.addUrlPatterns("/*");
        registrationBean.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        
        return registrationBean;
    }
}
