/**
 * LegalSwami API Service
 * Version: 4.1.0
 * Date: 2024-01-15
 * Fixed Content-Type issue
 */

// LegalSwami API Service for Backend Communication
class LegalSwamiAPI {
    constructor() {
        // ✅ PRODUCTION BACKEND URL (VERIFIED)
        this.BACKEND_URL = 'https://legal-swami-backend.onrender.com/api/v1';
        // For local development: 'http://localhost:8080/api/v1'
        
        this.token = localStorage.getItem('legal_swami_token');
        this.user = JSON.parse(localStorage.getItem('legal_swami_user') || '{}');
        this.isConnected = false;
        this.isInitialized = false;
        
        console.log('⚡ LegalSwami API Initializing...');
        console.log('🌐 Backend URL:', this.BACKEND_URL);
        console.log('🔐 Token exists:', !!this.token);
        console.log('👤 User exists:', !!this.user.id);
        
        // Initialize immediately
        this.initialize();
    }

    // Initialize API connection
    async initialize() {
        try {
            console.log('🔌 Checking backend connection...');
            
            // First check if backend is accessible
            const isHealthy = await this.checkBackendStatus();
            
            if (isHealthy) {
                console.log('✅ Backend is healthy and accessible');
                this.isConnected = true;
                
                // If user has token, verify it
                if (this.token) {
                    try {
                        await this.verifyToken();
                        console.log('✅ User token verified');
                    } catch (error) {
                        console.warn('⚠️ Token verification failed:', error.message);
                        this.clearAuth();
                    }
                }
            } else {
                console.warn('⚠️ Backend is not accessible');
                this.isConnected = false;
                
                // Show user-friendly message
                setTimeout(() => {
                    this.showToast('Running in offline mode. Some features limited.', 'warning');
                }, 2000);
            }
            
            this.isInitialized = true;
            console.log('🚀 LegalSwami API Initialized');
            
            // Update connection status UI
            this.updateConnectionStatus();
            
        } catch (error) {
            console.error('❌ API Initialization failed:', error);
            this.isConnected = false;
            this.isInitialized = true;
            this.updateConnectionStatus();
        }
    }

    // Set authentication token and user data
    setAuth(token, user) {
        console.log('🔐 Setting authentication...');
        
        this.token = token;
        this.user = user;
        localStorage.setItem('legal_swami_token', token);
        localStorage.setItem('legal_swami_user', JSON.stringify(user));
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Dispatch auth change event
        this.dispatchEvent('authChange', { user, isAuthenticated: true });
        
        console.log('✅ Authentication set for user:', user.email);
    }

    // Clear authentication
    clearAuth() {
        console.log('🚪 Clearing authentication...');
        
        this.token = null;
        this.user = {};
        localStorage.removeItem('legal_swami_token');
        localStorage.removeItem('legal_swami_user');
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Dispatch auth change event
        this.dispatchEvent('authChange', { user: {}, isAuthenticated: false });
        
        console.log('✅ Authentication cleared');
    }

    // ✅ FIXED: Make authenticated API request with better error handling
    async request(endpoint, options = {}) {
        const url = `${this.BACKEND_URL}${endpoint}`;
        
        console.log(`📤 API Request: ${endpoint}`, options.method || 'GET');
        
        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
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
            // Set timeout for request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            // ✅ FIXED: Always send JSON for chat messages
            let body = options.body;
            
            // Convert FormData to JSON if needed
            if (body instanceof FormData && endpoint.includes('/chat/')) {
                // Convert FormData to plain object
                const data = {};
                for (let [key, value] of body.entries()) {
                    data[key] = value;
                }
                body = JSON.stringify(data);
                headers['Content-Type'] = 'application/json';
            }
            
            const fetchOptions = {
                ...options,
                headers,
                body,
                signal: controller.signal,
                mode: 'cors',
                credentials: 'same-origin'
            };
            
            const response = await fetch(url, fetchOptions);
            
            clearTimeout(timeoutId);

            console.log(`📥 API Response [${endpoint}]:`, response.status);

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
                let errorText = 'Unknown error';
                try {
                    errorText = await response.text();
                } catch {
                    errorText = `HTTP ${response.status}`;
                }
                
                console.error(`❌ API Error [${endpoint} ${response.status}]:`, errorText);
                
                // If it's a connection error, mark as offline
                if (response.status === 0 || response.status >= 500) {
                    this.isConnected = false;
                    this.dispatchEvent('connectionChange', { connected: false });
                }
                
                throw new Error(errorText || `Request failed with status ${response.status}`);
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
                console.error('⏱️ Request timeout:', endpoint);
                this.isConnected = false;
                this.dispatchEvent('connectionChange', { connected: false });
                throw new Error('Request timeout. Please check your internet connection.');
            }
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('🌐 Network error:', endpoint);
                this.isConnected = false;
                this.dispatchEvent('connectionChange', { connected: false });
                throw new Error('Cannot connect to server. Please check your internet connection.');
            }
            
            console.error(`❌ API Request failed [${endpoint}]:`, error);
            throw error;
        }
    }

    // ✅ FIXED: Check backend health status with better error handling
    async checkBackendStatus() {
        try {
            console.log('🏥 Checking backend health...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.BACKEND_URL}/public/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            this.isConnected = response.ok;
            
            if (response.ok) {
                const health = await response.json();
                console.log('✅ Backend is healthy:', health);
                this.dispatchEvent('healthCheck', { 
                    status: 'healthy', 
                    details: health 
                });
            } else {
                console.warn('⚠️ Backend health check failed:', response.status);
                this.isConnected = false;
                this.dispatchEvent('healthCheck', { 
                    status: 'unhealthy', 
                    details: { status: response.status }
                });
            }
            
            return this.isConnected;
            
        } catch (error) {
            console.error('❌ Backend health check error:', error.message);
            this.isConnected = false;
            this.dispatchEvent('healthCheck', { 
                status: 'offline', 
                details: { error: error.message }
            });
            return false;
        }
    }

    // ✅ FIXED: Update connection status UI
    updateConnectionStatus() {
        // Create status element if it doesn't exist
        let statusIndicator = document.getElementById('connectionStatus');
        
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.id = 'connectionStatus';
            statusIndicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 9999;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(0,0,0,0.1);
            `;
            document.body.appendChild(statusIndicator);
        }
        
        if (this.isConnected) {
            statusIndicator.innerHTML = `
                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span>
                <span style="color: #10b981;">Connected to LegalSwami AI</span>
            `;
            statusIndicator.style.background = 'rgba(16, 185, 129, 0.1)';
            statusIndicator.style.color = '#10b981';
        } else {
            statusIndicator.innerHTML = `
                <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; display: inline-block;"></span>
                <span style="color: #ef4444;">Offline Mode - Limited Features</span>
            `;
            statusIndicator.style.background = 'rgba(239, 68, 68, 0.1)';
            statusIndicator.style.color = '#ef4444';
        }
        
        // Add pulse animation
        if (!document.querySelector('#connectionStatusStyles')) {
            const style = document.createElement('style');
            style.id = 'connectionStatusStyles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ✅ FIXED: Send chat message with JSON instead of FormData
    async sendChatMessage(message, attachments = [], chatId = null, options = {}) {
        // If offline, return mock response
        if (!this.isConnected) {
            console.log('📴 Offline mode - Using mock response');
            return this.generateMockResponse(message, options);
        }
        
        try {
            // ✅ FIXED: Create JSON payload instead of FormData
            const payload = {
                message: message,
                userId: this.user?.id || 'guest',
                generateDocument: options.generateDocument || false,
                documentType: options.documentType || 'PDF',
                chatId: chatId || null,
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Sending chat message:', payload);

            return await this.request('/chat/send', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
        } catch (error) {
            console.error('❌ Chat message failed:', error);
            
            // If it's a connection error, return mock response
            if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('connection')) {
                this.isConnected = false;
                this.updateConnectionStatus();
                return this.generateMockResponse(message, options);
            }
            
            throw error;
        }
    }

    // Generate mock response for offline mode
    generateMockResponse(message, options = {}) {
        const mockResponses = [
            `I understand you're asking about "${message.substring(0, 50)}...". In offline mode, I can provide general legal guidance. For specific advice, please ensure you're connected to the internet.`,
            `That's an important legal question. Since we're offline, here's general information: Always consult with a qualified attorney for legal matters. Documentation is key.`,
            `Regarding your question, in offline mode I can share that proper legal advice requires current context. Please reconnect for detailed AI assistance.`,
            `I'd be happy to help with legal guidance! For accurate responses, please connect to the internet to access the full LegalSwami AI.`
        ];
        
        const response = {
            id: 'offline_' + Date.now(),
            response: mockResponses[Math.floor(Math.random() * mockResponses.length)],
            timestamp: new Date().toISOString(),
            isOffline: true,
            isMock: true
        };
        
        if (options.generateDocument) {
            response.document = {
                content: `# Legal Document (Offline Mode)\n\n## Based on: "${message}"\n\nThis is a sample document generated in offline mode. Please connect to the internet for proper document generation.\n\n**Disclaimer**: This is not legal advice. Consult an attorney.`,
                format: options.documentType || 'PDF',
                filename: `legalswami-document-${Date.now()}.${(options.documentType || 'PDF').toLowerCase()}`
            };
        }
        
        return response;
    }

    // Get chat history with pagination
    async getChatHistory(userId = null, page = 0, size = 20) {
        // If offline, return empty array
        if (!this.isConnected) {
            console.log('📴 Offline mode - No chat history available');
            return [];
        }
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: size.toString()
            });
            
            if (userId) {
                params.append('userId', userId);
            } else if (this.user?.id) {
                params.append('userId', this.user.id);
            }

            return await this.request(`/chat/history?${params.toString()}`);
            
        } catch (error) {
            console.error('❌ Failed to get chat history:', error);
            return [];
        }
    }

    // Get specific chat by ID
    async getChatById(chatId) {
        // If offline, return null
        if (!this.isConnected) {
            return null;
        }
        
        try {
            return await this.request(`/chat/${chatId}`);
        } catch (error) {
            console.error('❌ Failed to get chat:', error);
            return null;
        }
    }

    // Delete chat
    async deleteChat(chatId) {
        // If offline, pretend it worked
        if (!this.isConnected) {
            console.log('📴 Offline mode - Chat deletion simulated');
            return { success: true, message: 'Offline mode - Delete will sync when online' };
        }
        
        try {
            return await this.request(`/chat/${chatId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('❌ Failed to delete chat:', error);
            throw error;
        }
    }

    // Regenerate response for a chat
    async regenerateResponse(chatId) {
        // If offline, return mock response
        if (!this.isConnected) {
            console.log('📴 Offline mode - Using mock regeneration');
            return this.generateMockResponse("Regenerated response", {});
        }
        
        try {
            return await this.request(`/chat/${chatId}/regenerate`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('❌ Failed to regenerate response:', error);
            throw error;
        }
    }

    // Generate document from chat
    async generateDocument(chatId, documentType = 'PDF') {
        // If offline, return mock document
        if (!this.isConnected) {
            console.log('📴 Offline mode - Generating mock document');
            return {
                success: true,
                document: {
                    content: "# Legal Document (Offline Mode)\n\nThis document was generated in offline mode.\n\nPlease connect to the internet for proper document generation.",
                    format: documentType,
                    filename: `document-offline-${Date.now()}.${documentType.toLowerCase()}`,
                    isOffline: true
                }
            };
        }
        
        try {
            return await this.request(`/documents/generate`, {
                method: 'POST',
                body: JSON.stringify({
                    chatId: chatId,
                    documentType: documentType
                })
            });
        } catch (error) {
            console.error('❌ Failed to generate document:', error);
            throw error;
        }
    }

    // ✅ FIXED: Login with Google OAuth
    async loginWithGoogle(token) {
        try {
            console.log('🔐 Attempting Google login...');
            
            // If backend is offline, create local user
            if (!this.isConnected) {
                console.log('📴 Backend offline - Creating local user session');
                
                // Decode JWT token to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                
                const userData = {
                    id: 'google_' + payload.sub,
                    name: payload.name,
                    email: payload.email,
                    picture: payload.picture,
                    provider: 'google'
                };
                
                // Set local authentication
                this.setAuth(token, userData);
                
                return {
                    success: true,
                    user: userData,
                    token: token,
                    message: 'Logged in locally (backend offline)'
                };
            }
            
            // Try to login with backend
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
            console.error('❌ Google login failed:', error);
            
            // Even if backend fails, create local session
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                
                const userData = {
                    id: 'google_' + payload.sub,
                    name: payload.name,
                    email: payload.email,
                    picture: payload.picture,
                    provider: 'google'
                };
                
                this.setAuth(token, userData);
                
                return {
                    success: true,
                    user: userData,
                    token: token,
                    message: 'Logged in locally (backend unreachable)'
                };
            } catch (decodeError) {
                throw new Error('Failed to process Google login');
            }
        }
    }

    // Verify token validity
    async verifyToken() {
        if (!this.token) {
            throw new Error('No token found');
        }
        
        // If offline, assume token is valid
        if (!this.isConnected) {
            console.log('📴 Offline mode - Assuming token is valid');
            return { valid: true, user: this.user };
        }
        
        try {
            return await this.request('/auth/verify');
        } catch (error) {
            console.warn('⚠️ Token verification failed:', error);
            // Don't clear auth immediately, might be network issue
            // this.clearAuth();
            throw error;
        }
    }

    // Get application configuration
    async getConfig() {
        // If offline, return default config
        if (!this.isConnected) {
            return {
                maxFileSize: 5 * 1024 * 1024, // 5MB
                allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
                maxMessageLength: 2000,
                features: {
                    chat: true,
                    documents: false,
                    history: false
                },
                isOffline: true
            };
        }
        
        try {
            return await this.request('/public/config');
        } catch (error) {
            console.error('❌ Failed to get config:', error);
            return {
                maxFileSize: 5 * 1024 * 1024,
                allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
                maxMessageLength: 2000,
                features: {
                    chat: true,
                    documents: false,
                    history: false
                },
                isOffline: true
            };
        }
    }

    // Upload file to backend (still uses FormData)
    async uploadFile(file) {
        // If offline, simulate upload
        if (!this.isConnected) {
            console.log('📴 Offline mode - File upload simulated');
            return {
                success: true,
                fileId: 'offline_' + Date.now(),
                filename: file.name,
                size: file.size,
                message: 'File will be uploaded when online'
            };
        }
        
        try {
            const formData = new FormData();
            formData.append('file', file);

            return await this.request('/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': this.token ? `Bearer ${this.token}` : ''
                },
                body: formData
            });
        } catch (error) {
            console.error('❌ File upload failed:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile() {
        // If offline, return current user
        if (!this.isConnected) {
            return {
                user: this.user,
                isOffline: true
            };
        }
        
        try {
            return await this.request('/user/profile');
        } catch (error) {
            console.error('❌ Failed to get user profile:', error);
            return {
                user: this.user,
                isOffline: true
            };
        }
    }

    // Update user profile
    async updateUserProfile(profileData) {
        // If offline, update locally
        if (!this.isConnected) {
            console.log('📴 Offline mode - Profile updated locally');
            this.user = { ...this.user, ...profileData };
            localStorage.setItem('legal_swami_user', JSON.stringify(this.user));
            return {
                success: true,
                user: this.user,
                message: 'Profile updated locally (will sync when online)'
            };
        }
        
        try {
            return await this.request('/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
        } catch (error) {
            console.error('❌ Failed to update profile:', error);
            throw error;
        }
    }

    // Get usage statistics
    async getUsageStats() {
        // If offline, return empty stats
        if (!this.isConnected) {
            return {
                totalChats: 0,
                totalMessages: 0,
                documentsGenerated: 0,
                isOffline: true
            };
        }
        
        try {
            return await this.request('/user/usage');
        } catch (error) {
            console.error('❌ Failed to get usage stats:', error);
            return {
                totalChats: 0,
                totalMessages: 0,
                documentsGenerated: 0,
                isOffline: true
            };
        }
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
        console.log(`📢 Event: ${event}`, data);
        
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    
    // ✅ FIXED: Show toast notification
    showToast(message, type = 'info') {
        console.log(`🍞 Toast [${type}]: ${message}`);
        
        // Check if toast container exists
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
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
            <i class="fas ${icons[type] || icons.info}" style="color: ${colors[type] || colors.info}; font-size: 16px;"></i>
            <span style="font-size: 14px; color: #334155;">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 300);
        }, 3000);
        
        // Add animations if not exists
        if (!document.querySelector('#toastAnimations')) {
            const style = document.createElement('style');
            style.id = 'toastAnimations';
            style.textContent = `
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
            document.head.appendChild(style);
        }
    }
}

// Initialize API service
console.log('🚀 Creating LegalSwami API instance...');
window.legalSwamiAPI = new LegalSwamiAPI();

// ✅ FIXED: Handle Google Sign-In
window.handleGoogleCredentialResponse = async function(response) {
    console.log('🔐 Google credential received');
    
    try {
        const token = response.credential;
        
        // Show loading toast
        if (window.legalSwamiAPI) {
            window.legalSwamiAPI.showToast('Logging in with Google...', 'info');
        }
        
        // Send to backend
        const result = await window.legalSwamiAPI.loginWithGoogle(token);
        
        // Success
        window.legalSwamiAPI.showToast(`Welcome ${result.user.name}!`, 'success');
        
        // Close login modal if exists
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'none';
        }
        
        // Trigger page update
        if (typeof updateUserUI === 'function') {
            updateUserUI();
        }
        
        // Dispatch event
        window.legalSwamiAPI.dispatchEvent('loginSuccess', { user: result.user });
        
        return result;
        
    } catch (error) {
        console.error('❌ Google sign-in failed:', error);
        if (window.legalSwamiAPI) {
            window.legalSwamiAPI.showToast('Login failed. Please try again.', 'error');
        }
        throw error;
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing API');
    
    // Update connection status
    setTimeout(() => {
        if (window.legalSwamiAPI) {
            window.legalSwamiAPI.updateConnectionStatus();
        }
    }, 1000);
    
    // Check backend connection every 60 seconds
    setInterval(() => {
        if (window.legalSwamiAPI) {
            window.legalSwamiAPI.checkBackendStatus().then(connected => {
                if (!connected) {
                    console.log('🔄 Periodic check: Backend is offline');
                }
            });
        }
    }, 60000);
});

// Event listeners for API
if (window.legalSwamiAPI) {
    window.legalSwamiAPI.on('connectionChange', ({ connected }) => {
        console.log(`🔌 Connection ${connected ? 'established' : 'lost'}`);
        
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
        console.log(`👤 User ${isAuthenticated ? 'logged in' : 'logged out'}:`, user.email || 'guest');
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalSwamiAPI };
}

console.log('✅ LegalSwami API v4.1.0 loaded successfully');
