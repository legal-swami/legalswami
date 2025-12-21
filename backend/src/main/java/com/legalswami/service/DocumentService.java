package com.legalswami.service;

import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;

@Service
public class DocumentService {
    
    public byte[] generatePDF(String content, String title) {
        // Implement PDF generation using iText or Apache PDFBox
        // For now, return as text file
        String pdfContent = "PDF Document: " + title + "\n\n" + content;
        return pdfContent.getBytes(StandardCharsets.UTF_8);
    }
    
    public byte[] generateDOC(String content, String title) {
        // Implement DOC generation using Apache POI
        String docContent = "DOC Document: " + title + "\n\n" + content;
        return docContent.getBytes(StandardCharsets.UTF_8);
    }
    
    public byte[] generateTXT(String content, String title) {
        String txtContent = title + "\n\n" + content;
        return txtContent.getBytes(StandardCharsets.UTF_8);
    }
}