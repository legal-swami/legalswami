// LegalSwami Chat Management
class LegalSwamiChat {
    constructor() {
        this.currentChatId = null;
        this.conversationHistory = [];
        this.isStreaming = false;
        this.api = window.legalSwamiAPI;
    }

    // Initialize chat
    initialize() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.updateSendButton();
    }

    // Setup event listeners
    setupEventListeners() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const newChatBtn = document.getElementById('newChatBtn');

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

        // New chat button
        newChatBtn.addEventListener('click', () => this.startNewChat());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const icon = document.querySelector('#themeToggle i');
            icon.classList.toggle('fa-sun');
            icon.classList.toggle('fa-moon');
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    // Update send button state
    updateSendButton() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const hasText = messageInput.value.trim().length > 0;
        
        sendBtn.disabled = !hasText || this.isStreaming;
        sendBtn.innerHTML = this.isStreaming ? 
            '<i class="fas fa-stop"></i>' : 
            '<i class="fas fa-paper-plane"></i>';
    }

    // Send message to backend
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
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

        try {
            // Send to backend
            const response = await this.api.sendChatMessage(message, this.currentChatId);
            
            // Add AI response to UI
            this.addMessageToUI(response.content, false);
            
            // Update conversation history
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            this.conversationHistory.push({
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString(),
                isDocument: response.isDocument || false
            });

            // If this is a new chat, create chat ID
            if (!this.currentChatId) {
                this.currentChatId = 'chat_' + Date.now();
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            this.addMessageToUI(
                'Sorry, I encountered an error. Please try again or check if the backend is running.',
                false
            );
        } finally {
            this.isStreaming = false;
            this.updateSendButton();
            this.saveToLocalStorage();
        }
    }

    // Add message to UI
    addMessageToUI(content, isUser) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove welcome message if present
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = isUser ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-scale-balanced"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.innerHTML = content.replace(/\n/g, '<br>');
        
        messageContent.appendChild(messageText);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Start new chat
    startNewChat() {
        if (this.conversationHistory.length > 0 && 
            !confirm('Start a new chat? Current chat will be saved.')) {
            return;
        }

        this.currentChatId = null;
        this.conversationHistory = [];
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to LegalSwami</h2>
                <p>Your AI-powered legal assistant. Ask any legal question in English, Hindi, or Marathi.</p>
                <div class="quick-actions">
                    <button class="quick-btn" data-question="Draft a rental agreement for India">
                        <i class="fas fa-file-contract"></i>
                        Rental Agreement
                    </button>
                    <button class="quick-btn" data-question="Explain Section 420 of Indian Penal Code">
                        <i class="fas fa-gavel"></i>
                        IPC Section 420
                    </button>
                    <button class="quick-btn" data-question="What are the requirements for a valid will in India?">
                        <i class="fas fa-file-signature"></i>
                        Will Requirements
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('messageInput').value = btn.dataset.question;
                document.getElementById('messageInput').focus();
                this.autoResizeTextarea(document.getElementById('messageInput'));
                this.updateSendButton();
            });
        });

        this.saveToLocalStorage();
    }

    // Load chat history from backend
    async loadChatHistory() {
        try {
            const history = await this.api.getChatHistory(
                this.api.user.id || 'guest'
            );
            
            this.updateHistoryList(history);
        } catch (error) {
            console.error('Failed to load chat history:', error);
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }

    // Update history list in sidebar
    updateHistoryList(history) {
        const historyList = document.getElementById('historyList');
        
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="empty-history">No chat history</p>';
            return;
        }

        historyList.innerHTML = history.map(chat => `
            <div class="history-item" data-chat-id="${chat.id}">
                <div class="history-title">${chat.title || 'Legal Chat'}</div>
                <div class="history-preview">${chat.preview || 'Click to load'}</div>
                <div class="history-date">${new Date(chat.date).toLocaleDateString()}</div>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.dataset.chatId;
                this.loadChat(chatId);
            });
        });
    }

    // Load specific chat
    async loadChat(chatId) {
        // Implementation for loading specific chat
        console.log('Loading chat:', chatId);
    }

    // Save to localStorage
    saveToLocalStorage() {
        const chatData = {
            currentChatId: this.currentChatId,
            conversationHistory: this.conversationHistory,
            lastUpdated: new Date().toISOString()
        };
        
        const userId = this.api.user.id || 'guest';
        localStorage.setItem(`legal_swami_chat_${userId}`, JSON.stringify(chatData));
    }

    // Load from localStorage
    loadFromLocalStorage() {
        const userId = this.api.user.id || 'guest';
        const savedData = localStorage.getItem(`legal_swami_chat_${userId}`);
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.currentChatId = data.currentChatId;
                this.conversationHistory = data.conversationHistory || [];
                
                // Update UI with loaded history
                if (this.conversationHistory.length > 0) {
                    this.conversationHistory.forEach(msg => {
                        this.addMessageToUI(msg.content, msg.role === 'user');
                    });
                } else {
                    this.startNewChat();
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                this.startNewChat();
            }
        } else {
            this.startNewChat();
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.legalSwamiChat = new LegalSwamiChat();
    legalSwamiChat.initialize();
});