/**
 * LegalSwami API Service
 * Version: 3.0.0
 * Date: 2024-01-15
 * Handles all backend communication
 */

// LegalSwami API Service for Backend Communication
class LegalSwamiAPI {
    constructor() {
        // Production backend URL (change this for production)
        this.BACKEND_URL = 'https://legal-swami-backend.onrender.com/api/v1';
        // For local development: 'http://localhost:8080/api/v1'
        // For production: 'https://your-backend-domain.com/api/v1'
        
        this.token = localStorage.getItem('legal_swami_token');
        this.user = JSON.parse(localStorage.getItem('legal_swami_user') || '{}');
        this.isConnected = false;
        
        // Auto-check connection on initialization
        this.checkBackendStatus();
    }

    // Set authentication token and user data
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('legal_swami_token', token);
        localStorage.setItem('legal_swami_user', JSON.stringify(user));
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Dispatch auth change event
        this.dispatchEvent('authChange', { user, isAuthenticated: true });
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.user = {};
        localStorage.removeItem('legal_swami_token');
        localStorage.removeItem('legal_swami_user');
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Dispatch auth change event
        this.dispatchEvent('authChange', { user: {}, isAuthenticated: false });
    }

    // Make authenticated API request with error handling
    async request(endpoint, options = {}) {
        const url = `${this.BACKEND_URL}${endpoint}`;
        
        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add Authorization header if token exists
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Add user ID for tracking
        if (this.user?.id) {
            headers['X-User-Id'] = this.user.id;
        }

        // Add request ID for debugging
        headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.clearAuth();
                this.dispatchEvent('unauthorized', { endpoint });
                throw new Error('Authentication expired. Please login again.');
            }

            // Handle 429 Rate Limit
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Rate limit exceeded. Please try again after ${retryAfter || 60} seconds.`);
            }

            // Handle other errors
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || `HTTP ${response.status}` };
                }
                
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            // Parse successful response
            const data = await response.json();
            
            // Update connection status on successful request
            if (!this.isConnected) {
                this.isConnected = true;
                this.dispatchEvent('connectionChange', { connected: true });
            }
            
            return data;

        } catch (error) {
            // Handle network errors
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your internet connection.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.isConnected = false;
                this.dispatchEvent('connectionChange', { connected: false });
                throw new Error('Cannot connect to server. Please check your internet connection.');
            }
            
            console.error(`API Request failed [${endpoint}]:`, error);
            throw error;
        }
    }

    // Check backend health status
    async checkBackendStatus() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/public/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            this.isConnected = response.ok;
            
            if (response.ok) {
                const health = await response.json();
                this.dispatchEvent('healthCheck', { 
                    status: 'healthy', 
                    details: health 
                });
            } else {
                this.dispatchEvent('healthCheck', { 
                    status: 'unhealthy', 
                    details: { status: response.status }
                });
            }
            
            return this.isConnected;
            
        } catch (error) {
            this.isConnected = false;
            this.dispatchEvent('healthCheck', { 
                status: 'offline', 
                details: { error: error.message }
            });
            return false;
        }
    }

    // Update connection status UI
    updateConnectionStatus() {
        const statusIndicator = document.getElementById('connectionStatus');
        if (!statusIndicator) return;
        
        if (this.isConnected) {
            statusIndicator.innerHTML = `
                <span class="status-dot connected"></span>
                <span class="status-text">Connected to LegalSwami AI</span>
            `;
        } else {
            statusIndicator.innerHTML = `
                <span class="status-dot disconnected"></span>
                <span class="status-text">Offline Mode - Limited Features</span>
            `;
        }
    }

    // Send chat message with attachments
    async sendChatMessage(message, attachments = [], chatId = null, options = {}) {
        const formData = new FormData();
        formData.append('message', message);
        
        if (chatId) {
            formData.append('chatId', chatId);
        }
        
        if (options.generateDocument) {
            formData.append('generateDocument', 'true');
            formData.append('documentType', options.documentType || 'PDF');
        }
        
        // Add attachments
        attachments.forEach((file, index) => {
            formData.append(`attachments`, file, file.name);
        });

        return this.request('/chat/send', {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : '',
                'X-User-Id': this.user?.id || 'guest'
            },
            body: formData
        });
    }

    // Get chat history with pagination
    async getChatHistory(userId = null, page = 0, size = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString()
        });
        
        if (userId) {
            params.append('userId', userId);
        } else if (this.user?.id) {
            params.append('userId', this.user.id);
        }

        return this.request(`/chat/history?${params.toString()}`);
    }

    // Get specific chat by ID
    async getChatById(chatId) {
        return this.request(`/chat/${chatId}`);
    }

    // Delete chat
    async deleteChat(chatId) {
        return this.request(`/chat/${chatId}`, {
            method: 'DELETE'
        });
    }

    // Regenerate response for a chat
    async regenerateResponse(chatId) {
        return this.request(`/chat/${chatId}/regenerate`, {
            method: 'POST'
        });
    }

    // Generate document from chat
    async generateDocument(chatId, documentType = 'PDF') {
        return this.request(`/documents/generate`, {
            method: 'POST',
            body: JSON.stringify({
                chatId: chatId,
                documentType: documentType
            })
        });
    }

    // Login with Google OAuth
    async loginWithGoogle(token) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                throw new Error('Google authentication failed');
            }

            const data = await response.json();
            
            // Set authentication
            this.setAuth(data.token, {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                picture: data.user.profilePicture
            });
            
            return data;
            
        } catch (error) {
            console.error('Google login failed:', error);
            throw error;
        }
    }

    // Verify token validity
    async verifyToken() {
        if (!this.token) {
            throw new Error('No token found');
        }
        
        try {
            return await this.request('/auth/verify');
        } catch (error) {
            this.clearAuth();
            throw error;
        }
    }

    // Get application configuration
    async getConfig() {
        try {
            return await this.request('/public/config');
        } catch (error) {
            // Return default config if backend is unavailable
            return {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
                maxMessageLength: 4000,
                features: {
                    chat: true,
                    documents: true,
                    history: true
                }
            };
        }
    }

    // Upload file to backend
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request('/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : ''
            },
            body: formData
        });
    }

    // Get user profile
    async getUserProfile() {
        return this.request('/user/profile');
    }

    // Update user profile
    async updateUserProfile(profileData) {
        return this.request('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Get usage statistics
    async getUsageStats() {
        return this.request('/user/usage');
    }

    // Event system for API events
    events = {};
    
    // Subscribe to events
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    // Unsubscribe from events
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    // Dispatch events
    dispatchEvent(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
}

// Initialize API service
window.legalSwamiAPI = new LegalSwamiAPI();

// Add CSS for connection status
const statusStyles = document.createElement('style');
statusStyles.textContent = `
    #connectionStatus {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #64748b;
        padding: 4px 12px;
        background: rgba(0,0,0,0.03);
        border-radius: 20px;
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0,0,0,0.1);
    }
    
    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }
    
    .status-dot.connected {
        background: #10b981;
        animation: pulse 2s infinite;
    }
    
    .status-dot.disconnected {
        background: #ef4444;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .status-text {
        font-size: 11px;
        font-weight: 500;
    }
`;
document.head.appendChild(statusStyles);

// Add connection status element
const connectionStatus = document.createElement('div');
connectionStatus.id = 'connectionStatus';
document.body.appendChild(connectionStatus);

// Initialize connection status
window.legalSwamiAPI.updateConnectionStatus();

// Event listeners for API
window.legalSwamiAPI.on('connectionChange', ({ connected }) => {
    console.log(`Backend ${connected ? 'connected' : 'disconnected'}`);
    
    if (connected) {
        window.legalSwamiAPI.showToast('Connected to LegalSwami AI', 'success');
    } else {
        window.legalSwamiAPI.showToast('Offline mode - Limited features available', 'warning');
    }
});

window.legalSwamiAPI.on('unauthorized', () => {
    window.legalSwamiAPI.showToast('Session expired. Please login again.', 'error');
});

window.legalSwamiAPI.on('authChange', ({ isAuthenticated, user }) => {
    console.log(`User ${isAuthenticated ? 'logged in' : 'logged out'}:`, user.email || 'guest');
    
    // Update UI
    updateUserUI();
});

// Toast notification method
window.legalSwamiAPI.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        border-left: 4px solid;
        animation: slideIn 0.3s ease;
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    toast.style.borderLeftColor = colors[type] || colors.info;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}" style="color: ${colors[type] || colors.info}"></i>
        <span style="font-size: 14px; color: #334155;">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Add slide animations
const toastAnimations = document.createElement('style');
toastAnimations.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastAnimations);

// Update user UI function
function updateUserUI() {
    const user = window.legalSwamiAPI.user;
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!userProfile || !userName || !userEmail || !userAvatar) {
        return;
    }

    if (user && user.id) {
        // User is logged in
        userName.textContent = user.name || 'User';
        userEmail.textContent = user.email || '';
        
        if (user.picture) {
            userAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            userAvatar.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border-radius: 50%; font-weight: bold; font-size: 14px;">${initials}</div>`;
        }
        
        // Show user profile, hide login button
        userProfile.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
    } else {
        // User is not logged in
        userName.textContent = 'Guest';
        userEmail.textContent = 'Click to login';
        userAvatar.innerHTML = '<i class="fas fa-user" style="font-size: 20px; color: #64748b;"></i>';
        
        // Hide user profile, show login button
        userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// Google Sign-In Handler
window.handleGoogleSignIn = async function(response) {
    try {
        const token = response.credential;
        
        // Show loading
        window.legalSwamiAPI.showToast('Logging in...', 'info');
        
        // Send to backend
        const result = await window.legalSwamiAPI.loginWithGoogle(token);
        
        // Success
        window.legalSwamiAPI.showToast(`Welcome ${result.user.name}!`, 'success');
        
        // Close login modal if exists
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        // Show chat interface
        const chatInterface = document.getElementById('chatInterface');
        if (chatInterface) {
            chatInterface.style.display = 'block';
        }
        
        // Load chat history
        setTimeout(() => {
            if (window.legalSwamiChat && window.legalSwamiChat.loadChatHistory) {
                window.legalSwamiChat.loadChatHistory();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Google sign-in failed:', error);
        window.legalSwamiAPI.showToast('Login failed. Please try again.', 'error');
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize user UI
    updateUserUI();
    
    // Check if user is already logged in
    if (window.legalSwamiAPI.token) {
        window.legalSwamiAPI.verifyToken().catch(() => {
            // Token invalid, clear auth
            window.legalSwamiAPI.clearAuth();
        });
    }
    
    // Check backend connection every 30 seconds
    setInterval(() => {
        window.legalSwamiAPI.checkBackendStatus();
    }, 30000);
    
    // Initial backend check
    setTimeout(() => {
        window.legalSwamiAPI.checkBackendStatus().then(connected => {
            if (!connected) {
                window.legalSwamiAPI.showToast(
                    'Backend is offline. Running in demo mode.',
                    'warning'
                );
            }
        });
    }, 1000);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalSwamiAPI };
}
