// LegalSwami API Service for Backend Communication
class LegalSwamiAPI {
    constructor() {
        this.BACKEND_URL = 'http://localhost:8080/api/v1';
        this.token = localStorage.getItem('legal_swami_token');
        this.user = JSON.parse(localStorage.getItem('legal_swami_user') || '{}');
    }

    // Set authentication
    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('legal_swami_token', token);
        localStorage.setItem('legal_swami_user', JSON.stringify(user));
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.user = {};
        localStorage.removeItem('legal_swami_token');
        localStorage.removeItem('legal_swami_user');
    }

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${this.BACKEND_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.clearAuth();
                window.location.reload();
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Check backend status
    async checkBackendStatus() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/public/status`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Send chat message to backend
    async sendChatMessage(message, chatId = null) {
        const payload = {
            message: message,
            userId: this.user.id || 'guest',
            chatId: chatId,
            language: 'english'
        };

        return this.request('/chat/send', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // Get chat history
    async getChatHistory(userId = 'guest', page = 0, size = 20) {
        return this.request(`/chat/history?userId=${userId}&page=${page}&size=${size}`);
    }

    // Delete chat
    async deleteChat(chatId, userId) {
        return this.request(`/chat/${chatId}?userId=${userId}`, {
            method: 'DELETE'
        });
    }

    // Regenerate response
    async regenerateResponse(chatId, userId) {
        return this.request(`/chat/${chatId}/regenerate?userId=${userId}`, {
            method: 'POST'
        });
    }

    // Get backend configuration
    async getConfig() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/public/config`);
            return await response.json();
        } catch (error) {
            return {
                maxFileSize: '5MB',
                allowedFormats: ['jpg', 'png', 'pdf', 'txt']
            };
        }
    }
}

// Initialize API service
window.legalSwamiAPI = new LegalSwamiAPI();

// Handle Google Sign-In
window.handleGoogleSignIn = async function(response) {
    try {
        // Send Google token to backend for verification
        const backendResponse = await fetch(`${legalSwamiAPI.BACKEND_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: response.credential
            })
        });

        if (!backendResponse.ok) {
            throw new Error('Authentication failed');
        }

        const data = await backendResponse.json();
        
        // Set authentication
        legalSwamiAPI.setAuth(data.token, {
            id: data.userId,
            name: data.name,
            email: data.email,
            picture: data.picture
        });

        // Update UI
        updateUserUI();
        
        // Close login modal
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        
        showToast('Successfully logged in!', 'success');
    } catch (error) {
        console.error('Google sign-in failed:', error);
        showToast('Login failed. Please try again.', 'error');
    }
};

// Update user UI
function updateUserUI() {
    const user = legalSwamiAPI.user;
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');

    if (user && user.id) {
        userName.textContent = user.name || 'User';
        userEmail.textContent = user.email || 'Logged in';
        
        if (user.picture) {
            userAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 8px;">`;
        }
        
        userProfile.onclick = () => {
            if (confirm('Are you sure you want to logout?')) {
                legalSwamiAPI.clearAuth();
                window.location.reload();
            }
        };
    } else {
        userName.textContent = 'Guest';
        userEmail.textContent = 'Click to login';
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        
        userProfile.onclick = () => {
            document.getElementById('loginModal').style.display = 'flex';
        };
    }
}

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    
    // Check backend status
    legalSwamiAPI.checkBackendStatus().then(isOnline => {
        const statusDot = document.getElementById('apiStatus');
        const statusText = document.getElementById('statusText');
        
        if (isOnline) {
            statusDot.style.backgroundColor = '#10a37f';
            statusText.textContent = 'Backend Connected';
        } else {
            statusDot.style.backgroundColor = '#f59e0b';
            statusText.textContent = 'Backend Offline';
            showToast('Backend is offline. Some features may not work.', 'warning');
        }
    });
});