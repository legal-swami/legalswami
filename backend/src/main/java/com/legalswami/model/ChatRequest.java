package com.legalswami.model;

import lombok.Data;
import javax.validation.constraints.NotBlank;

@Data
public class ChatRequest {
    
    @NotBlank(message = "Message cannot be empty")
    private String message;
    
    private String chatId;
    
    private Boolean generateDocument = false;
    
    private String documentType; // PDF, DOC, TXT
    
    // For file uploads
    private String[] attachmentUrls;
}