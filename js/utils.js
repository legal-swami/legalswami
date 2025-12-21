/**
 * LegalSwami Utility Functions
 * Version: 2.0.0
 * Date: 2024-01-15
 * Description: Common utility functions for LegalSwami frontend
 */

// ===============================
// DOM Utility Functions
// ===============================

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Attributes object
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add children
    if (typeof children === 'string') {
        element.textContent = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            } else if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            }
        });
    }
    
    return element;
}

/**
 * Query selector with optional parent element
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null} Found element
 */
function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Query selector all with optional parent element
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {NodeList} Found elements
 */
function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Debounce function to limit function execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call immediately
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===============================
// String Utility Functions
// ===============================

/**
 * Format text with markdown-like syntax
 * @param {string} text - Input text
 * @returns {string} Formatted HTML
 */
function formatMessageText(text) {
    if (!text) return '';
    
    let formatted = text;
    
    // Convert URLs to links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert `code` to <code>
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Convert bullet points to list
    const lines = formatted.split('<br>');
    let inList = false;
    const processedLines = lines.map(line => {
        if (line.trim().match(/^[-•*]\s/)) {
            if (!inList) {
                inList = true;
                return `<ul><li>${line.replace(/^[-•*]\s/, '')}</li>`;
            }
            return `<li>${line.replace(/^[-•*]\s/, '')}</li>`;
        } else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    
    formatted = processedLines.join('<br>');
    if (inList) {
        formatted += '</ul>';
    }
    
    return formatted;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Convert string to title case
 * @param {string} str - Input string
 * @returns {string} Title cased string
 */
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Generate random ID
 * @param {number} length - Length of ID
 * @returns {string} Random ID
 */
function generateId(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a unique chat ID
 * @returns {string} Unique chat ID
 */
function generateChatId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `chat_${timestamp}_${random}`.substring(0, 20);
}

// ===============================
// Date and Time Utility Functions
// ===============================

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date object or string
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    if (!date) return 'Just now';
    
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return d.toLocaleDateString();
}

/**
 * Format date to readable string
 * @param {Date|string} date - Date object or string
 * @param {Object} options - Format options
 * @returns {string} Formatted date
 */
function formatDate(date, options = {}) {
    const d = new Date(date);
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

// ===============================
// Storage Utility Functions
// ===============================

/**
 * LocalStorage wrapper with JSON support
 */
const Storage = {
    /**
     * Get item from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error writing to localStorage:', error);
        }
    },
    
    /**
     * Remove item from localStorage
     * @param {string} key - Storage key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    },
    
    /**
     * Clear all items from localStorage
     */
    clear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    },
    
    /**
     * Get all keys from localStorage
     * @returns {string[]} Array of keys
     */
    keys() {
        try {
            return Object.keys(localStorage);
        } catch (error) {
            console.error('Error getting localStorage keys:', error);
            return [];
        }
    }
};

/**
 * SessionStorage wrapper with JSON support
 */
const SessionStorage = {
    get(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from sessionStorage:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error writing to sessionStorage:', error);
        }
    },
    
    remove(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from sessionStorage:', error);
        }
    },
    
    clear() {
        try {
            sessionStorage.clear();
        } catch (error) {
            console.error('Error clearing sessionStorage:', error);
        }
    }
};

// ===============================
// Validation Utility Functions
// ===============================

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate file type
 * @param {File} file - File object
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {boolean} Whether file type is allowed
 */
function isValidFileType(file, allowedTypes = ['image/', 'application/pdf', 'text/']) {
    return allowedTypes.some(type => file.type.startsWith(type));
}

/**
 * Validate file size
 * @param {File} file - File object
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} Whether file size is valid
 */
function isValidFileSize(file, maxSizeMB = 10) {
    return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * Validate required fields
 * @param {Object} data - Data object
 * @param {string[]} requiredFields - Required field names
 * @returns {Object} Validation result
 */
function validateRequired(data, requiredFields) {
    const errors = {};
    requiredFields.forEach(field => {
        if (!data[field] || data[field].toString().trim() === '') {
            errors[field] = `${toTitleCase(field)} is required`;
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// ===============================
// File Utility Functions
// ===============================

/**
 * Read file as text
 * @param {File} file - File object
 * @returns {Promise<string>} File content
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

/**
 * Read file as data URL
 * @param {File} file - File object
 * @returns {Promise<string>} Data URL
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Download file from URL or data
 * @param {string} data - File data or URL
 * @param {string} filename - Download filename
 * @param {string} type - MIME type
 */
function downloadFile(data, filename, type = 'application/octet-stream') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Convert base64 to Blob
 * @param {string} base64 - Base64 string
 * @param {string} contentType - MIME type
 * @returns {Blob} Blob object
 */
function base64ToBlob(base64, contentType = '') {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
}

// ===============================
// Network Utility Functions
// ===============================

/**
 * Check if user is online
 * @returns {boolean} Online status
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Get network connection info
 * @returns {Object} Connection information
 */
function getConnectionInfo() {
    if (!navigator.connection) {
        return {
            type: 'unknown',
            effectiveType: 'unknown',
            downlink: 0,
            rtt: 0,
            saveData: false
        };
    }
    
    const conn = navigator.connection;
    return {
        type: conn.type || 'unknown',
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        saveData: conn.saveData || false
    };
}

/**
 * Make a fetch request with timeout
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
function fetchWithTimeout(url, options = {}, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    
    throw lastError;
}

// ===============================
// UI Utility Functions
// ===============================

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = createToast(message, type);
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * Create toast container if not exists
 * @returns {HTMLElement} Toast container
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Create toast element
 * @param {string} message - Toast message
 * @param {string} type - Toast type
 * @returns {HTMLElement} Toast element
 */
function createToast(message, type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    toast.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
    
    return toast;
}

/**
 * Show loading spinner
 * @param {string} message - Loading message
 * @param {HTMLElement} parent - Parent element
 */
function showLoading(message = 'Loading...', parent = document.body) {
    hideLoading(); // Hide any existing loading
    
    const loading = document.createElement('div');
    loading.id = 'globalLoading';
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    parent.appendChild(loading);
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    const loading = document.getElementById('globalLoading');
    if (loading) {
        loading.remove();
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
            return true;
        } catch (err) {
            showToast('Failed to copy to clipboard', 'error');
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

/**
 * Scroll to element smoothly
 * @param {HTMLElement|string} element - Element or selector
 * @param {Object} options - Scroll options
 */
function scrollToElement(element, options = {}) {
    const target = typeof element === 'string' ? $(element) : element;
    if (!target) return;
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
    };
    
    target.scrollIntoView({ ...defaultOptions, ...options });
}

// ===============================
// Legal Specific Utility Functions
// ===============================

/**
 * Sanitize legal document content
 * @param {string} content - Document content
 * @returns {string} Sanitized content
 */
function sanitizeLegalContent(content) {
    if (!content) return '';
    
    // Remove sensitive patterns (in a real app, this would be more comprehensive)
    const sensitivePatterns = [
        /(?:\d{4}[- ]?){3}\d{4}/g, // Credit card numbers
        /\b\d{9,12}\b/g, // Long numbers (could be Aadhar, etc.)
        /[A-Z]{5}\d{4}[A-Z]{1}/g, // PAN numbers (Indian)
    ];
    
    let sanitized = content;
    sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
}

/**
 * Format legal citation
 * @param {string} citation - Legal citation
 * @returns {string} Formatted citation
 */
function formatLegalCitation(citation) {
    // Basic citation formatting
    return citation.replace(/(\d{4})\s+([A-Z]+)\s+(\d+)/g, '$1 $2 $3');
}

/**
 * Extract legal terms from text
 * @param {string} text - Input text
 * @returns {string[]} Array of legal terms
 */
function extractLegalTerms(text) {
    const legalTerms = [
        'plaintiff', 'defendant', 'complaint', 'summons', 'writ',
        'affidavit', 'injunction', 'subpoena', 'testimony', 'verdict',
        'judgment', 'appeal', 'bail', 'parole', 'probation',
        'contract', 'agreement', 'lease', 'deed', 'mortgage',
        'will', 'trust', 'estate', 'probate', 'bankruptcy',
        'copyright', 'trademark', 'patent', 'infringement',
        'negligence', 'liability', 'damages', 'compensation'
    ];
    
    const foundTerms = [];
    const words = text.toLowerCase().split(/\W+/);
    
    legalTerms.forEach(term => {
        if (words.includes(term) && !foundTerms.includes(term)) {
            foundTerms.push(term);
        }
    });
    
    return foundTerms;
}

/**
 * Calculate word count for legal documents
 * @param {string} text - Document text
 * @returns {Object} Word count statistics
 */
function calculateWordCount(text) {
    if (!text) return { words: 0, characters: 0, paragraphs: 0 };
    
    const words = text.trim().split(/\s+/).length;
    const characters = text.length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    
    return { words, characters, paragraphs };
}

// ===============================
// Performance Utility Functions
// ===============================

/**
 * Measure function execution time
 * @param {Function} fn - Function to measure
 * @param {string} label - Measurement label
 * @returns {*} Function result
 */
function measurePerformance(fn, label = 'Function') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
}

/**
 * Create performance timer
 * @param {string} label - Timer label
 * @returns {Function} Stop function
 */
function createTimer(label = 'Timer') {
    const start = performance.now();
    
    return function stop() {
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return end - start;
    };
}

// ===============================
// Export Utility Functions
// ===============================

// Create namespace for all utilities
const LegalSwamiUtils = {
    // DOM Utilities
    createElement,
    $,
    $$,
    debounce,
    throttle,
    
    // String Utilities
    formatMessageText,
    truncateText,
    toTitleCase,
    generateId,
    generateChatId,
    
    // Date Utilities
    formatRelativeTime,
    formatDate,
    getTimestamp,
    
    // Storage Utilities
    Storage,
    SessionStorage,
    
    // Validation Utilities
    isValidEmail,
    isValidUrl,
    isValidFileType,
    isValidFileSize,
    validateRequired,
    
    // File Utilities
    readFileAsText,
    readFileAsDataURL,
    downloadFile,
    base64ToBlob,
    
    // Network Utilities
    isOnline,
    getConnectionInfo,
    fetchWithTimeout,
    retryWithBackoff,
    
    // UI Utilities
    showToast,
    showLoading,
    hideLoading,
    copyToClipboard,
    scrollToElement,
    
    // Legal Utilities
    sanitizeLegalContent,
    formatLegalCitation,
    extractLegalTerms,
    calculateWordCount,
    
    // Performance Utilities
    measurePerformance,
    createTimer
};

// Make utilities available globally
window.LegalSwamiUtils = LegalSwamiUtils;

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegalSwamiUtils;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('LegalSwami Utilities v2.0.0 loaded');
    
    // Add CSS for utilities if not present
    addUtilityStyles();
});

/**
 * Add necessary CSS styles for utilities
 */
function addUtilityStyles() {
    const styleId = 'legal-swami-utility-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Toast Styles */
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .toast {
            padding: 12px 16px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: toastSlideIn 0.3s ease;
            border-left: 4px solid;
            min-width: 300px;
            max-width: 400px;
        }
        
        .toast-success {
            border-left-color: #10b981;
        }
        
        .toast-error {
            border-left-color: #ef4444;
        }
        
        .toast-warning {
            border-left-color: #f59e0b;
        }
        
        .toast-info {
            border-left-color: #3b82f6;
        }
        
        .toast i {
            font-size: 18px;
        }
        
        .toast-success i {
            color: #10b981;
        }
        
        .toast-error i {
            color: #ef4444;
        }
        
        .toast-warning i {
            color: #f59e0b;
        }
        
        .toast-info i {
            color: #3b82f6;
        }
        
        .toast.fade-out {
            animation: toastFadeOut 0.3s ease forwards;
        }
        
        @keyframes toastSlideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes toastFadeOut {
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        /* Loading Styles */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
        }
        
        .loading-spinner {
            background: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        
        .loading-spinner .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        
        .loading-spinner p {
            margin: 0;
            color: #334155;
            font-size: 14px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .toast-container {
                left: 20px;
                right: 20px;
                bottom: 80px;
            }
            
            .toast {
                min-width: auto;
                max-width: none;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Add polyfills if needed
function addPolyfills() {
    // Object.entries polyfill
    if (!Object.entries) {
        Object.entries = function(obj) {
            const ownProps = Object.keys(obj);
            let i = ownProps.length;
            const resArray = new Array(i);
            while (i--) {
                resArray[i] = [ownProps[i], obj[ownProps[i]]];
            }
            return resArray;
        };
    }
    
    // Promise.race polyfill
    if (!Promise.race) {
        Promise.race = function(values) {
            return new Promise(function(resolve, reject) {
                values.forEach(function(value) {
                    Promise.resolve(value).then(resolve, reject);
                });
            });
        };
    }
}

// Initialize polyfills
addPolyfills();

// Error handling wrapper
function withErrorHandling(fn, errorMessage = 'An error occurred') {
    return async function(...args) {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(errorMessage, error);
            showToast(`${errorMessage}: ${error.message}`, 'error');
            throw error;
        }
    };
}

// Export error handling wrapper
LegalSwamiUtils.withErrorHandling = withErrorHandling;

console.log('LegalSwami Utilities initialized successfully!');
