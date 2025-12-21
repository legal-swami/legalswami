package com.legalswami.controller;

import com.legalswami.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@SecurityRequirement(name = "bearerAuth")
public class DocumentController {
    
    @Autowired
    private DocumentService documentService;
    
    @Operation(summary = "Generate PDF document")
    @PostMapping("/pdf")
    public ResponseEntity<byte[]> generatePDF(
            @RequestBody Map<String, String> request) {
        
        String content = request.get("content");
        String title = request.getOrDefault("title", "Legal Document");
        
        byte[] pdfBytes = documentService.generatePDF(content, title);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + title + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
    
    @Operation(summary = "Generate DOC document")
    @PostMapping("/doc")
    public ResponseEntity<byte[]> generateDOC(
            @RequestBody Map<String, String> request) {
        
        String content = request.get("content");
        String title = request.getOrDefault("title", "Legal Document");
        
        byte[] docBytes = documentService.generateDOC(content, title);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + title + ".doc\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(docBytes);
    }
    
    @Operation(summary = "Generate TXT document")
    @PostMapping("/txt")
    public ResponseEntity<byte[]> generateTXT(
            @RequestBody Map<String, String> request) {
        
        String content = request.get("content");
        String title = request.getOrDefault("title", "Legal Document");
        
        byte[] txtBytes = documentService.generateTXT(content, title);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + title + ".txt\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(txtBytes);
    }
}