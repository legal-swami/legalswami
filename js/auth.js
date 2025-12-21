/**
 * LegalSwami Authentication Service
 * Version: 2.0.0
 * Date: 2024-01-15
 * Handles user authentication, session management, and OAuth
 */

class LegalSwamiAuth {
    constructor() {
        this.api = window.legalSwamiAPI || {
            user: { id: 'guest' },
            setAuth: (token, user) => {
                localStorage.setItem('legal_swami_token', token);
                localStorage.setItem('legal_swami_user', JSON.stringify(user));
            },
            clearAuth: () => {
                localStorage.removeItem('legal_swami_token');
                localStorage.removeItem('legal_swami_user');
            }
        };
        
        this.isInitialized = false;
        this.googleAuth = null;
        
        // Authentication states
        this.states = {
            LOGGED_OUT: 'logged_out',
            LOGGED_IN: 'logged_in',
            EXPIRED: 'expired',
            PENDING: 'pending'
        };
        
        this.currentState = this.states.LOGGED_OUT;
        
        // Initialize on construction
        this.initialize();
    }

    /**
     * Initialize authentication service
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing LegalSwami Authentication...');
        
        // Check existing session
        await this.checkExistingSession();
        
        // Initialize Google OAuth if available
        await this.initializeGoogleAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Authentication initialized');
        
        // Dispatch initialization event
        this.dispatchEvent('authInitialized', {
            user: this.api.user,
            isAuthenticated: this.isAuthenticated()
        });
    }

    /**
     * Check for existing valid session
     */
    async checkExistingSession() {
        const token = localStorage.getItem('legal_swami_token');
        const userData = localStorage.getItem('legal_swami_user');
        
        if (!token || !userData) {
            this.currentState = this.states.LOGGED_OUT;
            return;
        }
        
        try {
            const user = JSON.parse(userData);
            
            // Check if token is expired (basic check)
            if (this.isTokenExpired(token)) {
                this.currentState = this.states.EXPIRED;
                await this.handleTokenExpired();
                return;
            }
            
            // Validate with backend if API is available
            if (this.api.verifyToken) {
                try {
                    await this.api.verifyToken();
                    this.currentState = this.states.LOGGED_IN;
                    
                    // Update API user data
                    this.api.user = user;
                    this.api.token = token;
                    
                    console.log('✅ Existing session restored');
                    this.dispatchEvent('sessionRestored', { user });
                    
                } catch (error) {
                    console.warn('❌ Session validation failed:', error);
                    this.currentState = this.states.EXPIRED;
                    await this.handleTokenExpired();
                }
            } else {
                // If no backend verification, trust localStorage
                this.currentState = this.states.LOGGED_IN;
                this.api.user = user;
                this.api.token = token;
            }
            
        } catch (error) {
            console.error('❌ Session check failed:', error);
            this.clearSession();
            this.currentState = this.states.LOGGED_OUT;
        }
    }

    /**
     * Initialize Google OAuth
     */
    async initializeGoogleAuth() {
        // Check if Google API is available
        if (typeof gapi === 'undefined') {
            console.warn('⚠️ Google API not loaded. Google Sign-In will not work.');
            return;
        }
        
        try {
            // Load auth2 library
            await new Promise((resolve, reject) => {
                gapi.load('auth2', {
                    callback: resolve,
                    onerror: reject,
                    timeout: 5000
                });
            });
            
            // Initialize Google Auth
            this.googleAuth = gapi.auth2.init({
                client_id: this.getGoogleClientId(),
                cookiepolicy: 'single_host_origin',
                scope: 'profile email',
                ux_mode: 'popup'
            });
            
            console.log('✅ Google OAuth initialized');
            
            // Listen for sign-in state changes
            this.googleAuth.isSignedIn.listen((isSignedIn) => {
                if (isSignedIn) {
                    this.handleGoogleSignIn(this.googleAuth.currentUser.get());
                } else {
                    this.handleGoogleSignOut();
                }
            });
            
        } catch (error) {
            console.error('❌ Google OAuth initialization failed:', error);
            this.googleAuth = null;
        }
    }

    /**
     * Get Google Client ID from config or environment
     */
    getGoogleClientId() {
        // Try to get from window config
        if (window.LEGAL_SWAMI_CONFIG?.googleClientId) {
            return window.LEGAL_SWAMI_CONFIG.googleClientId;
        }
        
        // Try to get from environment variable (if using build system)
        if (process?.env?.GOOGLE_CLIENT_ID) {
            return process.env.GOOGLE_CLIENT_ID;
        }
        
        // Default demo client ID (replace with your actual client ID)
        return '166511615962-bohur5q8d4i5hud6icr4185kcte9enk8.apps.googleusercontent.com';
    }

    /**
     * Handle Google Sign-In
     */
    async handleGoogleSignIn(googleUser) {
        try {
            this.currentState = this.states.PENDING;
            this.dispatchEvent('authPending', { provider: 'google' });
            
            const profile = googleUser.getBasicProfile();
            const authResponse = googleUser.getAuthResponse();
            
            console.log('🔐 Google Sign-In successful:', profile.getEmail());
            
            // Prepare user data
            const userData = {
                id: `google_${profile.getId()}`,
                name: profile.getName(),
                email: profile.getEmail(),
                picture: profile.getImageUrl(),
                googleId: profile.getId(),
                provider: 'google'
            };
            
            // If backend API is available, verify with backend
            if (this.api.loginWithGoogle) {
                try {
                    const result = await this.api.loginWithGoogle(authResponse.id_token);
                    
                    // Use backend response
                    this.setSession(result.token, {
                        ...userData,
                        id: result.user?.id || userData.id,
                        token: result.token
                    });
                    
                } catch (backendError) {
                    console.warn('⚠️ Backend login failed, using local session:', backendError);
                    // Fallback to local session
                    this.setSession(authResponse.id_token, userData);
                }
            } else {
                // No backend, use local session
                this.setSession(authResponse.id_token, userData);
            }
            
            this.dispatchEvent('googleSignInSuccess', { user: userData });
            
        } catch (error) {
            console.error('❌ Google Sign-In failed:', error);
            this.currentState = this.states.LOGGED_OUT;
            this.dispatchEvent('googleSignInError', { error });
            throw error;
        }
    }

    /**
     * Handle Google Sign-Out
     */
    async handleGoogleSignOut() {
        try {
            if (this.googleAuth) {
                await this.googleAuth.signOut();
            }
            
            this.clearSession();
            this.currentState = this.states.LOGGED_OUT;
            
            console.log('👋 Google Sign-Out successful');
            this.dispatchEvent('googleSignOutSuccess');
            
        } catch (error) {
            console.error('❌ Google Sign-Out failed:', error);
            this.dispatchEvent('googleSignOutError', { error });
        }
    }

    /**
     * Manual Google Sign-In
     */
    async signInWithGoogle() {
        if (!this.googleAuth) {
            throw new Error('Google OAuth not initialized');
        }
        
        try {
            await this.googleAuth.signIn();
        } catch (error) {
            console.error('❌ Manual Google Sign-In failed:', error);
            
            if (error.error === 'popup_closed_by_user') {
                throw new Error('Sign-in was cancelled');
            }
            
            throw error;
        }
    }

    /**
     * Manual Google Sign-Out
     */
    async signOut() {
        // Clear local session
        this.clearSession();
        
        // Sign out from Google if signed in
        if (this.googleAuth && this.googleAuth.isSignedIn.get()) {
            await this.handleGoogleSignOut();
        } else {
            this.currentState = this.states.LOGGED_OUT;
            this.dispatchEvent('signOutSuccess');
        }
        
        // Reload to clear any cached state
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    /**
     * Set user session
     */
    setSession(token, userData) {
        // Store in localStorage
        localStorage.setItem('legal_swami_token', token);
        localStorage.setItem('legal_swami_user', JSON.stringify(userData));
        
        // Update API service
        if (this.api.setAuth) {
            this.api.setAuth(token, userData);
        } else {
            this.api.user = userData;
            this.api.token = token;
        }
        
        this.currentState = this.states.LOGGED_IN;
        
        console.log('🔐 Session set for user:', userData.email);
        
        // Dispatch events
        this.dispatchEvent('sessionSet', { user: userData });
        this.dispatchEvent('authStateChange', {
            state: this.currentState,
            user: userData
        });
        
        // Show success message
        this.showToast(`Welcome ${userData.name}!`, 'success');
    }

    /**
     * Clear user session
     */
    clearSession() {
        // Clear localStorage
        localStorage.removeItem('legal_swami_token');
        localStorage.removeItem('legal_swami_user');
        
        // Clear API service
        if (this.api.clearAuth) {
            this.api.clearAuth();
        } else {
            this.api.user = { id: 'guest' };
            this.api.token = null;
        }
        
        this.currentState = this.states.LOGGED_OUT;
        
        console.log('🧹 Session cleared');
        
        // Dispatch events
        this.dispatchEvent('sessionCleared');
        this.dispatchEvent('authStateChange', {
            state: this.currentState,
            user: null
        });
    }

    /**
     * Handle expired token
     */
    async handleTokenExpired() {
        console.warn('⚠️ Session token expired');
        
        // Clear expired session
        this.clearSession();
        
        // Show notification
        this.showToast('Your session has expired. Please login again.', 'warning');
        
        // Dispatch event
        this.dispatchEvent('tokenExpired');
        
        // Show login modal after delay
        setTimeout(() => {
            this.showLoginModal();
        }, 2000);
    }

    /**
     * Check if token is expired (basic implementation)
     */
    isTokenExpired(token) {
        try {
            // Decode JWT token (without verification)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            
            return Date.now() > expiry;
        } catch (error) {
            // If token can't be parsed, assume it's invalid
            return true;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentState === this.states.LOGGED_IN;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.api.user;
    }

    /**
     * Get authentication state
     */
    getAuthState() {
        return {
            state: this.currentState,
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            hasGoogleAuth: !!this.googleAuth
        };
    }

    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showLoginModal();
            return false;
        }
        return true;
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            this.dispatchEvent('loginModalShown');
        } else {
            console.warn('⚠️ Login modal not found');
            
            // Fallback: Create a simple login prompt
            if (confirm('You need to login to continue. Login now?')) {
                if (this.googleAuth) {
                    this.signInWithGoogle();
                }
            }
        }
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            this.dispatchEvent('loginModalHidden');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.signOut());
        }
        
        // Google sign-in button (if separate)
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => this.signInWithGoogle());
        }
        
        // Close login modal buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-login-modal') || 
                e.target.closest('.close-login-modal')) {
                this.hideLoginModal();
            }
            
            // Close modal when clicking outside
            if (e.target.id === 'loginModal') {
                this.hideLoginModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoginModal();
            }
            
            // Ctrl/Cmd + L for login
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.showLoginModal();
            }
        });
    }

    /**
     * Update user interface based on auth state
     */
    updateAuthUI() {
        const isAuthenticated = this.isAuthenticated();
        const user = this.getCurrentUser();
        
        // Update user profile display
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userProfile && userName && userEmail && userAvatar) {
            if (isAuthenticated && user.id !== 'guest') {
                // User is logged in
                userProfile.style.display = 'flex';
                document.getElementById('headerLoginBtn')?.style.display = 'none';
                
                userName.textContent = user.name || 'User';
                userEmail.textContent = user.email || '';
                
                // Set avatar
                if (user.picture) {
                    userAvatar.innerHTML = `
                        <img src="${user.picture}" 
                             alt="${user.name}" 
                             style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">
                    `;
                } else {
                    const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                    userAvatar.innerHTML = `
                        <div style="width: 100%; height: 100%; 
                              background: linear-gradient(135deg, #2563eb, #7c3aed); 
                              color: white; border-radius: 8px; 
                              display: flex; align-items: center; 
                              justify-content: center; font-weight: bold;">
                            ${initials}
                        </div>
                    `;
                }
                
            } else {
                // User is not logged in
                userProfile.style.display = 'none';
                document.getElementById('headerLoginBtn')?.style.display = 'flex';
            }
        }
        
        // Update protected content visibility
        document.querySelectorAll('[data-auth-required]').forEach(element => {
            if (isAuthenticated) {
                element.style.display = element.dataset.authDisplay || 'block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Update guest-only content
        document.querySelectorAll('[data-guest-only]').forEach(element => {
            if (!isAuthenticated) {
                element.style.display = element.dataset.guestDisplay || 'block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Dispatch UI update event
        this.dispatchEvent('authUIUpdated', { isAuthenticated, user });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use existing toast system if available
        if (window.legalSwamiAPI?.showToast) {
            window.legalSwamiAPI.showToast(message, type);
            return;
        }
        
        if (window.LegalSwamiUtils?.showToast) {
            window.LegalSwamiUtils.showToast(message, type);
            return;
        }
        
        // Fallback toast
        const toast = document.createElement('div');
        toast.className = `auth-toast auth-toast-${type}`;
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
            <i class="fas ${icons[type] || icons.info}" 
               style="color: ${colors[type] || colors.info}"></i>
            <span style="font-size: 14px; color: #334155;">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Event system for auth events
     */
    events = {};
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    dispatchEvent(event, data = {}) {
        if (!this.events[event]) return;
        
        // Add timestamp and auth state to event data
        const eventData = {
            ...data,
            timestamp: new Date().toISOString(),
            authState: this.getAuthState()
        };
        
        this.events[event].forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error(`Error in auth event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Export user data (for backup/download)
     */
    exportUserData() {
        const userData = this.getCurrentUser();
        const token = localStorage.getItem('legal_swami_token');
        
        const exportData = {
            user: userData,
            token: token ? '***REDACTED***' : null,
            exportedAt: new Date().toISOString(),
            app: 'LegalSwami'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportName = `legalswami-user-${userData.id || 'guest'}-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
        
        this.showToast('User data exported', 'success');
    }

    /**
     * Import user data
     */
    importUserData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate imported data
                    if (!data.user || !data.app === 'LegalSwami') {
                        throw new Error('Invalid user data file');
                    }
                    
                    // Set session from imported data
                    const token = localStorage.getItem('legal_swami_token'); // Keep current token
                    this.setSession(token, data.user);
                    
                    this.showToast('User data imported successfully', 'success');
                    resolve(data.user);
                    
                } catch (error) {
                    this.showToast('Failed to import user data', 'error');
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                this.showToast('Failed to read file', 'error');
                reject(new Error('File read error'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Get user statistics
     */
    getUserStats() {
        const user = this.getCurrentUser();
        const loginCount = parseInt(localStorage.getItem(`login_count_${user.id}`) || '0');
        const lastLogin = localStorage.getItem(`last_login_${user.id}`);
        
        return {
            loginCount,
            lastLogin,
            sessionDuration: this.calculateSessionDuration(),
            isGuest: user.id === 'guest'
        };
    }

    /**
     * Calculate session duration
     */
    calculateSessionDuration() {
        const loginTime = localStorage.getItem('session_start_time');
        if (!loginTime) return 0;
        
        return Date.now() - parseInt(loginTime);
    }

    /**
     * Track login
     */
    trackLogin() {
        const user = this.getCurrentUser();
        const loginCount = parseInt(localStorage.getItem(`login_count_${user.id}`) || '0');
        
        localStorage.setItem(`login_count_${user.id}`, (loginCount + 1).toString());
        localStorage.setItem(`last_login_${user.id}`, new Date().toISOString());
        localStorage.setItem('session_start_time', Date.now().toString());
    }
}

// Initialize authentication service
window.legalSwamiAuth = new LegalSwamiAuth();

// Make auth available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalSwamiAuth };
}

// Add CSS for auth-specific styles
const authStyles = document.createElement('style');
authStyles.textContent = `
    .auth-toast {
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
        animation: authSlideIn 0.3s ease;
    }
    
    .auth-toast-success {
        border-left-color: #10b981;
    }
    
    .auth-toast-error {
        border-left-color: #ef4444;
    }
    
    .auth-toast-warning {
        border-left-color: #f59e0b;
    }
    
    .auth-toast-info {
        border-left-color: #3b82f6;
    }
    
    @keyframes authSlideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes authSlideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    /* Login modal styles */
    .login-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    }
    
    .login-modal-content {
        background: white;
        border-radius: 20px;
        width: 100%;
        max-width: 400px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    
    .login-modal-header {
        padding: 24px;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
        color: white;
        text-align: center;
    }
    
    .login-modal-body {
        padding: 32px;
        text-align: center;
    }
    
    .google-signin-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
        padding: 14px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        color: #334155;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s;
        margin: 24px 0;
    }
    
    .google-signin-btn:hover {
        background: #f8fafc;
        border-color: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .google-signin-btn i {
        font-size: 18px;
        color: #ea4335;
    }
    
    .auth-footer {
        margin-top: 24px;
        font-size: 14px;
        color: #64748b;
    }
`;
document.head.appendChild(authStyles);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Update UI after auth initialization
    setTimeout(() => {
        window.legalSwamiAuth.updateAuthUI();
    }, 500);
    
    // Listen for auth state changes
    window.legalSwamiAuth.on('authStateChange', () => {
        window.legalSwamiAuth.updateAuthUI();
    });
    
    // Track login if user is authenticated
    if (window.legalSwamiAuth.isAuthenticated()) {
        window.legalSwamiAuth.trackLogin();
    }
});

console.log('✅ LegalSwami Authentication Service loaded'); 
