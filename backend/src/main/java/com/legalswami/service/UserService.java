package com.legalswami.service;

import com.legalswami.model.User;
import com.legalswami.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public User findOrCreateUser(String email, String name, String googleId, String profilePicture) {
        return userRepository.findByEmail(email)
                .map(existingUser -> {
                    existingUser.setLastLogin(LocalDateTime.now());
                    existingUser.setName(name);
                    existingUser.setProfilePicture(profilePicture);
                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(name);
                    newUser.setGoogleId(googleId);
                    newUser.setProfilePicture(profilePicture);
                    return userRepository.save(newUser);
                });
    }
    
    public User getUserById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    public void incrementApiUsage(String userId) {
        User user = getUserById(userId);
        user.setApiUsageCount(user.getApiUsageCount() + 1);
        userRepository.save(user);
    }
}