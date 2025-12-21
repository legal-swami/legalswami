/**
 * LegalSwami Chat Management
 * Version: 2.0.0
 * Date: 2024-01-15
 */

class LegalSwamiChat {
    constructor() {
        this.currentChatId = null;
        this.conversationHistory = [];
        this.isStreaming = false;
        this.api = window.legalSwamiAPI || {
            // Fallback API if not initialized
            sendChatMessage: async () => ({ content: 'Backend not connected' }),
            getChatHistory: async () => [],
            user: { id: 'guest' }
        };
        
        // DOM Elements cache
        this.elements = {};
    }

    // Initialize chat
    initialize() {
        this.cacheElements();
        this.setupEventListeners();
        this.loadChatHistory();
        this.updateSendButton();
        this.checkBackendConnection();
    }

    // Cache DOM elements
    cacheElements() {
        this.elements = {
            // Input elements
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendMessage'), // Changed from sendBtn
            attachFile: document.getElementById('attachFile'),
            voiceInput: document.getElementById('voiceInput'),
            
            // Chat elements
            chatMessages: document.getElementById('chatMessages'),
            chatInterface: document.getElementById('chatInterface'),
            
            // Action buttons
            clearChat: document.getElementById('clearChat'),
            exportChat: document.getElementById('exportChat'),
            historyToggle: document.getElementById('historyToggle'),
            closeHistory: document.getElementById('closeHistory'),
            backToHome: document.getElementById('backToHome'),
            
            // History elements
            historySidebar: document.getElementById('historySidebar'),
            historyList: document.getElementById('historyList'),
            
            // Quick action buttons
            quickButtons: document.querySelectorAll('.quick-btn'),
            
            // Document options
            generateDocument: document.getElementById('generateDocument'),
            documentType: document.getElementById('documentType'),
            
            // Typing indicator
            typingIndicator: document.getElementById('typingIndicator')
        };
    }

    // Check backend connection
    async checkBackendConnection() {
        try {
            if (this.api.verifyToken) {
                await this.api.verifyToken();
                console.log('✅ Backend connected');
            }
        } catch (error) {
            console.warn('⚠️ Backend not connected, using local mode');
            this.showToast('Running in offline mode', 'warning');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const { messageInput, sendBtn, clearChat, exportChat, historyToggle, 
                closeHistory, backToHome, quickButtons, generateDocument, 
                documentType, attachFile, voiceInput } = this.elements;

        // Validate elements exist before adding listeners
        if (!messageInput || !sendBtn) {
            console.error('❌ Required elements not found');
            return;
        }

        // Send message on Enter (but not Shift+Enter)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
            this.updateSendButton();
        });

        // Send button click
        sendBtn.addEventListener('click', () => this.sendMessage());

        // Clear chat button
        if (clearChat) {
            clearChat.addEventListener('click', () => this.clearChat());
        }

        // Export chat button
        if (exportChat) {
            exportChat.addEventListener('click', () => this.exportChat());
        }

        // History toggle
        if (historyToggle) {
            historyToggle.addEventListener('click', () => this.toggleHistorySidebar());
        }

        // Close history
        if (closeHistory) {
            closeHistory.addEventListener('click', () => this.toggleHistorySidebar());
        }

        // Back to home
        if (backToHome) {
            backToHome.addEventListener('click', () => this.goBackToHome());
        }

        // Quick action buttons
        if (quickButtons.length > 0) {
            quickButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const question = e.currentTarget.getAttribute('data-question');
                    messageInput.value = question;
                    this.autoResizeTextarea(messageInput);
                    this.updateSendButton();
                    messageInput.focus();
                });
            });
        }

        // Document generation toggle
        if (generateDocument && documentType) {
            generateDocument.addEventListener('change', (e) => {
                documentType.disabled = !e.target.checked;
            });
        }

        // Attach file
        if (attachFile) {
            attachFile.addEventListener('click', () => this.attachFile());
        }

        // Voice input
        if (voiceInput) {
            voiceInput.addEventListener('click', () => this.startVoiceInput());
        }

        // Theme toggle (if exists)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-moon');
                    icon.classList.toggle('fa-sun');
                }
            });
        }

        // Sidebar toggle (if exists)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('active');
            });
        }

        // File attachment remove
        document.addEventListener('click', (e) => {
            if (e.target.closest('.file-attachment .btn-icon')) {
                e.target.closest('.file-attachment').remove();
            }
        });
    }

    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    // Update send button state
    updateSendButton() {
        const { messageInput, sendBtn } = this.elements;
        if (!messageInput || !sendBtn) return;

        const hasText = messageInput.value.trim().length > 0;
        
        sendBtn.disabled = !hasText || this.isStreaming;
        sendBtn.innerHTML = this.isStreaming ? 
            '<i class="fas fa-spinner fa-spin"></i>' : 
            '<i class="fas fa-paper-plane"></i>';
    }

    // Send message to backend
    async sendMessage() {
        const { messageInput, generateDocument, documentType, typingIndicator } = this.elements;
        if (!messageInput) return;

        const message = messageInput.value.trim();
        
        if (!message || this.isStreaming) return;

        // Add user message to UI
        this.addMessageToUI(message, true);
        
        // Clear input
        messageInput.value = '';
        this.autoResizeTextarea(messageInput);
        this.updateSendButton();
        
        // Set streaming state
        this.isStreaming = true;
        this.updateSendButton();
        
        // Show typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
        }

        try {
            // Get document generation options
            const shouldGenerateDoc = generateDocument ? generateDocument.checked : false;
            const docType = documentType ? documentType.value : 'PDF';

            // Send to backend
            const response = await this.api.sendMessage(message, [], this.currentChatId);
            
            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
            
            // Add AI response to UI
            const isDocument = response.isDocument || shouldGenerateDoc;
            this.addMessageToUI(response.response || response.content, false, isDocument, docType);
            
            // Update conversation history
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            this.conversationHistory.push({
                role: 'assistant',
                content: response.response || response.content,
                timestamp: new Date().toISOString(),
                isDocument: isDocument,
                documentType: docType
            });

            // If this is a new chat, create chat ID
            if (!this.currentChatId && response.id) {
                this.currentChatId = response.id;
            }

            // If document was generated, show download option
            if (isDocument && response.documentUrl) {
                this.showDocumentDownload(response.documentUrl, docType, response.fileName);
            }

            // Show success toast
            this.showToast('Response received', 'success');

        } catch (error) {
            console.error('Failed to send message:', error);
            
            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
            
            // Add error message to UI
            this.addMessageToUI(
                'Sorry, I encountered an error. Please check your connection and try again.',
                false
            );
            
            // Show error toast
            this.showToast('Failed to send message: ' + error.message, 'error');
            
        } finally {
            this.isStreaming = false;
            this.updateSendButton();
            this.saveToLocalStorage();
            
            // Refresh history
            this.loadChatHistory();
        }
    }

    // Add message to UI
    addMessageToUI(content, isUser = false, isDocument = false, documentType = null) {
        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        // Remove welcome message if present
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage && (isUser || content)) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        // Add animation delay based on message count
        const messageCount = chatMessages.querySelectorAll('.message').length;
        messageDiv.style.animationDelay = `${messageCount * 0.1}s`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = isUser ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        
        // Format content based on type
        if (isDocument) {
            messageText.innerHTML = `
                <div class="document-header">
                    <i class="fas fa-file-${documentType.toLowerCase()}"></i>
                    <strong>${documentType} Document Generated</strong>
                </div>
                <div class="document-content">${this.formatMessageText(content)}</div>
            `;
        } else {
            messageText.innerHTML = this.formatMessageText(content);
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageContent.appendChild(messageText);
        messageContent.appendChild(messageTime);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom with smooth behavior
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // Format message text with markdown-like syntax
    formatMessageText(text) {
        if (!text) return '';
        
        let formatted = text
            // Convert URLs to links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            // Convert newlines to <br>
            .replace(/\n/g, '<br>')
            // Convert **bold** to <strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to <em>
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Convert `code` to <code>
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Convert bullet points to list
        const lines = formatted.split('<br>');
        let inList = false;
        const processedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^[-•*]\s/)) {
                if (!inList) {
                    inList = true;
                    return `<ul><li>${trimmed.substring(2)}</li>`;
                }
                return `<li>${trimmed.substring(2)}</li>`;
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

    // Clear chat
    clearChat() {
        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        if (this.conversationHistory.length > 0 && 
            !confirm('Are you sure you want to clear the chat?')) {
            return;
        }

        this.currentChatId = null;
        this.conversationHistory = [];
        
        // Clear UI but keep welcome message
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        chatMessages.innerHTML = '';
        
        if (!welcomeMessage) {
            chatMessages.innerHTML = this.getWelcomeMessage();
            this.setupQuickButtons();
        } else {
            chatMessages.appendChild(welcomeMessage);
        }

        this.saveToLocalStorage();
        this.showToast('Chat cleared', 'success');
    }

    // Get welcome message HTML
    getWelcomeMessage() {
        return `
            <div class="welcome-message">
                <div class="message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <h4>Welcome to LegalSwami! 👨‍⚖️</h4>
                            <p>I'm your AI legal assistant. I can help you with:</p>
                            <ul>
                                <li>Legal advice and guidance</li>
                                <li>Document review and analysis</li>
                                <li>Legal document generation</li>
                                <li>Explanation of laws and regulations</li>
                                <li>Legal research assistance</li>
                            </ul>
                            <p><strong>Note:</strong> I'm an AI assistant, not a substitute for a licensed attorney. For critical legal matters, please consult a qualified lawyer.</p>
                        </div>
                        <div class="message-time">Just now</div>
                    </div>
                </div>
                <div class="quick-questions">
                    <p>Try asking:</p>
                    <div class="quick-buttons">
                        <button class="quick-btn" data-question="What are the requirements for a valid contract?">
                            Contract Requirements
                        </button>
                        <button class="quick-btn" data-question="How to draft a rental agreement?">
                            Rental Agreement
                        </button>
                        <button class="quick-btn" data-question="What is consumer protection law?">
                            Consumer Rights
                        </button>
                        <button class="quick-btn" data-question="How to file a legal notice?">
                            Legal Notice
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Setup quick action buttons
    setupQuickButtons() {
        const { messageInput } = this.elements;
        if (!messageInput) return;

        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.currentTarget.getAttribute('data-question');
                messageInput.value = question;
                this.autoResizeTextarea(messageInput);
                this.updateSendButton();
                messageInput.focus();
            });
        });
    }

    // Export chat
    exportChat() {
        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        const messages = chatMessages.querySelectorAll('.message');
        
        let exportText = 'LegalSwami Chat Export\n';
        exportText += '========================\n\n';
        exportText += `Exported on: ${new Date().toLocaleString()}\n\n`;
        
        messages.forEach(message => {
            const isAI = message.classList.contains('ai-message');
            const text = message.querySelector('.message-text')?.textContent || '';
            const time = message.querySelector('.message-time')?.textContent || '';
            
            exportText += `${isAI ? 'AI Assistant' : 'You'} (${time}):\n`;
            exportText += text + '\n\n';
        });
        
        // Create and download file
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `legalswami-chat-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Chat exported successfully', 'success');
    }

    // Toggle history sidebar
    toggleHistorySidebar() {
        const { historySidebar } = this.elements;
        if (!historySidebar) return;

        if (historySidebar.style.display === 'flex') {
            historySidebar.style.display = 'none';
        } else {
            historySidebar.style.display = 'flex';
            this.loadChatHistory();
        }
    }

    // Go back to home page
    goBackToHome() {
        const { chatInterface } = this.elements;
        if (chatInterface) {
            chatInterface.style.display = 'none';
            document.querySelector('.main-container').style.background = '';
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Load chat history from backend
    async loadChatHistory() {
        const { historyList } = this.elements;
        if (!historyList) return;

        try {
            // Show loading
            historyList.innerHTML = '<div class="loading-history">Loading history...</div>';
            
            const history = await this.api.getChatHistory(0, 10);
            
            if (!history || history.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-history">
                        <i class="fas fa-history"></i>
                        <p>No chat history yet</p>
                    </div>
                `;
                return;
            }

            this.updateHistoryList(history);
        } catch (error) {
            console.error('Failed to load chat history:', error);
            historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load history</p>
                </div>
            `;
        }
    }

    // Update history list in sidebar
    updateHistoryList(history) {
        const { historyList } = this.elements;
        if (!historyList) return;

        historyList.innerHTML = history.map((chat, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-item-content">
                    <p class="history-question">${this.truncateText(chat.message || 'Chat', 50)}</p>
                    <span class="history-time">${this.formatRelativeTime(chat.createdAt)}</span>
                </div>
                <button class="btn-icon load-history-btn">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.load-history-btn')) {
                    const index = parseInt(item.dataset.index);
                    this.loadChatFromHistory(history[index]);
                }
            });
            
            // Load button
            const loadBtn = item.querySelector('.load-history-btn');
            if (loadBtn) {
                loadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(item.dataset.index);
                    this.loadChatFromHistory(history[index]);
                });
            }
        });
    }

    // Load chat from history
    async loadChatFromHistory(chat) {
        if (!chat) return;

        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        // Clear current chat
        this.currentChatId = chat.id;
        this.conversationHistory = [];
        
        // Clear UI
        chatMessages.innerHTML = '';
        
        // Add historical messages
        if (chat.message) {
            this.addMessageToUI(chat.message, true);
        }
        
        if (chat.response) {
            this.addMessageToUI(chat.response, false);
        }

        this.saveToLocalStorage();
        this.toggleHistorySidebar();
        this.showToast('Chat loaded from history', 'success');
    }

    // Attach file
    attachFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';
        input.multiple = true;
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            const attachmentsDiv = document.getElementById('fileAttachments');
            
            if (!attachmentsDiv) return;
            
            files.forEach(file => {
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    this.showToast(`File ${file.name} is too large (max 10MB)`, 'error');
                    return;
                }
                
                const attachment = document.createElement('div');
                attachment.className = 'file-attachment';
                attachment.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <button class="btn-icon">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                attachmentsDiv.appendChild(attachment);
            });
            
            if (files.length > 0) {
                this.showToast(`${files.length} file(s) attached`, 'success');
            }
        };
        
        input.click();
    }

    // Start voice input
    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showToast('Voice input is not supported in your browser', 'warning');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        const { messageInput } = this.elements;
        if (!messageInput) return;

        recognition.onstart = () => {
            this.showToast('Listening... Speak now', 'info');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            this.autoResizeTextarea(messageInput);
            this.updateSendButton();
            this.showToast('Voice input captured', 'success');
        };

        recognition.onerror = (event) => {
            this.showToast('Voice input error: ' + event.error, 'error');
        };

        recognition.start();
    }

    // Show document download
    showDocumentDownload(url, type, filename = null) {
        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        const downloadDiv = document.createElement('div');
        downloadDiv.className = 'document-download';
        downloadDiv.innerHTML = `
            <div class="download-content">
                <i class="fas fa-file-download"></i>
                <div>
                    <p><strong>${type} Document Ready</strong></p>
                    <p>Your legal document has been generated.</p>
                </div>
                <a href="${url}" class="btn-download" download="${filename || `legal-document.${type.toLowerCase()}`}">
                    Download
                </a>
            </div>
        `;

        chatMessages.appendChild(downloadDiv);
        
        // Scroll to show download option
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    // Save to localStorage
    saveToLocalStorage() {
        const chatData = {
            currentChatId: this.currentChatId,
            conversationHistory: this.conversationHistory,
            lastUpdated: new Date().toISOString()
        };
        
        const userId = this.api.user?.id || 'guest';
        try {
            localStorage.setItem(`legal_swami_chat_${userId}`, JSON.stringify(chatData));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    // Load from localStorage
    loadFromLocalStorage() {
        const userId = this.api.user?.id || 'guest';
        const savedData = localStorage.getItem(`legal_swami_chat_${userId}`);
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.currentChatId = data.currentChatId;
                this.conversationHistory = data.conversationHistory || [];
                
                // Update UI with loaded history
                const { chatMessages } = this.elements;
                if (chatMessages && this.conversationHistory.length > 0) {
                    this.conversationHistory.forEach(msg => {
                        this.addMessageToUI(msg.content, msg.role === 'user');
                    });
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                this.showWelcomeMessage();
            }
        } else {
            this.showWelcomeMessage();
        }
    }

    // Show welcome message
    showWelcomeMessage() {
        const { chatMessages } = this.elements;
        if (!chatMessages) return;

        chatMessages.innerHTML = this.getWelcomeMessage();
        this.setupQuickButtons();
    }

    // Utility: Truncate text
    truncateText(text, maxLength = 50) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Utility: Format relative time
    formatRelativeTime(dateString) {
        if (!dateString) return 'Recently';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    // Utility: Show toast notification
    showToast(message, type = 'info') {
        // Use window.LegalSwamiUtils if available
        if (window.LegalSwamiUtils && window.LegalSwamiUtils.showToast) {
            window.LegalSwamiUtils.showToast(message, type);
            return;
        }
        
        // Fallback toast implementation
        const container = document.getElementById('toastContainer') || (() => {
            const div = document.createElement('div');
            div.id = 'toastContainer';
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();
        
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
        
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize API service if not exists
    if (!window.legalSwamiAPI) {
        console.warn('API service not found, creating fallback');
        window.legalSwamiAPI = {
            sendMessage: async () => ({ 
                content: 'Please connect to backend for full functionality.',
                response: 'Please connect to backend for full functionality.'
            }),
            getChatHistory: async () => [],
            verifyToken: async () => {},
            user: { id: 'guest' }
        };
    }
    
    // Initialize chat
    window.legalSwamiChat = new LegalSwamiChat();
    window.legalSwamiChat.initialize();
    
    console.log('✅ LegalSwami Chat initialized');
});

// Make chat accessible globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegalSwamiChat;
}
