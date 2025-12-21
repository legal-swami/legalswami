package com.legalswami.repository;

import com.legalswami.model.Chat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, String> {
    
    Page<Chat> findByUserId(String userId, Pageable pageable);
    
    List<Chat> findByUserIdOrderByCreatedAtDesc(String userId);
    
    Optional<Chat> findByIdAndUserId(String id, String userId);
    
    void deleteByUserId(String userId);
    
    Long countByUserId(String userId);
}