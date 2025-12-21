package com.legalswami.controller;

import com.legalswami.model.User;
import com.legalswami.security.JwtTokenProvider;
import com.legalswami.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Operation(summary = "Google OAuth login")
    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        
        // Verify Google token and get user info
        // This is a simplified version - implement proper Google token verification
        
        String email = "test@example.com"; // Get from Google token verification
        String name = "Test User";
        String googleId = "google123";
        
        // Create or update user
        User user = userService.findOrCreateUser(email, name, googleId, null);
        
        // Generate JWT token
        String jwtToken = tokenProvider.generateToken(user.getId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("token", jwtToken);
        response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "profilePicture", user.getProfilePicture()
        ));
        
        return ResponseEntity.ok(response);
    }
    
    @Operation(summary = "Verify token")
    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyToken() {
        // Token is verified by JwtAuthenticationFilter
        // Just return success if we reach here
        return ResponseEntity.ok(Map.of("valid", true));
    }
}