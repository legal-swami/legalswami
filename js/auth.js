/**
 * LegalSwami Authentication Service
 * Version: 2.2.0
 * Date: 2024-01-15
 * Handles user authentication, session management, and OAuth
 * GitHub Pages Compatible Version
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
        this.isOfflineMode = false;
        this.isGitHubPages = window.location.hostname.includes('github.io');
        
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
        
        // Check offline status first
        this.checkOfflineStatus();
        
        // Check existing session
        await this.checkExistingSession();
        
        // Initialize Google OAuth if available and online
        // Skip on GitHub Pages due to CSP restrictions
        if (!this.isOfflineMode && !this.isGitHubPages) {
            await this.initializeGoogleAuth();
        } else if (this.isGitHubPages) {
            console.log('🌐 GitHub Pages detected: Using alternative authentication methods');
            this.setupGitHubPagesAuth();
        } else {
            console.log('🌐 Offline mode: Google OAuth disabled');
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Authentication initialized');
        
        // Show offline status if needed
        if (this.isOfflineMode) {
            setTimeout(() => {
                this.showOfflineStatus();
            }, 1000);
        }
        
        // Dispatch initialization event
        this.dispatchEvent('authInitialized', {
            user: this.api.user,
            isAuthenticated: this.isAuthenticated(),
            isOffline: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages
        });
    }

    /**
     * Setup authentication for GitHub Pages
     */
    setupGitHubPagesAuth() {
        console.log('🔧 Setting up GitHub Pages compatible authentication');
        
        // Create a fallback login method for GitHub Pages
        this.createGitHubPagesLoginUI();
        
        // Use localStorage-based auth for GitHub Pages
        this.enableLocalAuth();
    }

    /**
     * Create GitHub Pages compatible login UI
     */
    createGitHubPagesLoginUI() {
        // Check if login modal exists
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;
        
        // Add GitHub Pages specific message
        const modalBody = loginModal.querySelector('.login-modal-body');
        if (modalBody) {
            const githubPagesWarning = document.createElement('div');
            githubPagesWarning.className = 'github-pages-warning';
            githubPagesWarning.innerHTML = `
                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 16px 0;
                    text-align: left;
                    font-size: 14px;
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 16px;">⚠️</span>
                        <strong>GitHub Pages Notice</strong>
                    </div>
                    <p style="margin: 0; color: #856404;">
                        Google Sign-In has limited functionality on GitHub Pages due to security restrictions.
                        Use the demo login below or test on localhost for full features.
                    </p>
                </div>
            `;
            
            // Insert at the beginning of modal body
            modalBody.insertBefore(githubPagesWarning, modalBody.firstChild);
        }
        
        // Add demo login button
        this.addDemoLoginButton();
    }

    /**
     * Add demo login button for GitHub Pages
     */
    addDemoLoginButton() {
        const loginModal = document.getElementById('loginModal');
        if (!loginModal) return;
        
        const googleSignInBtn = loginModal.querySelector('.google-signin-btn');
        if (googleSignInBtn) {
            // Create demo login button
            const demoLoginBtn = document.createElement('button');
            demoLoginBtn.className = 'demo-login-btn';
            demoLoginBtn.innerHTML = `
                <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span style="font-size: 18px;">👤</span>
                    <span>Try Demo Login</span>
                </span>
            `;
            demoLoginBtn.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #7c3aed, #2563eb);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                margin: 12px 0;
            `;
            
            demoLoginBtn.onmouseover = () => {
                demoLoginBtn.style.opacity = '0.9';
                demoLoginBtn.style.transform = 'translateY(-2px)';
            };
            
            demoLoginBtn.onmouseout = () => {
                demoLoginBtn.style.opacity = '1';
                demoLoginBtn.style.transform = 'translateY(0)';
            };
            
            demoLoginBtn.onclick = (e) => {
                e.preventDefault();
                this.demoLogin();
            };
            
            // Insert after Google button
            googleSignInBtn.parentNode.insertBefore(demoLoginBtn, googleSignInBtn.nextSibling);
            
            // Also add a guest continue button
            const guestBtn = document.createElement('button');
            guestBtn.className = 'guest-continue-btn';
            guestBtn.innerHTML = 'Continue as Guest';
            guestBtn.style.cssText = `
                width: 100%;
                padding: 10px;
                background: transparent;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                color: #64748b;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                margin-top: 8px;
                transition: all 0.3s;
            `;
            
            guestBtn.onmouseover = () => {
                guestBtn.style.borderColor = '#2563eb';
                guestBtn.style.color = '#2563eb';
            };
            
            guestBtn.onmouseout = () => {
                guestBtn.style.borderColor = '#e2e8f0';
                guestBtn.style.color = '#64748b';
            };
            
            guestBtn.onclick = (e) => {
                e.preventDefault();
                this.hideLoginModal();
                this.showToast('Continuing as guest. Some features may be limited.', 'info');
            };
            
            demoLoginBtn.parentNode.appendChild(guestBtn);
        }
    }

    /**
     * Demo login for GitHub Pages
     */
    demoLogin() {
        const demoUsers = [
            {
                id: 'demo_lawyer_1',
                name: 'Demo Lawyer',
                email: 'demo.lawyer@example.com',
                role: 'lawyer',
                specialization: 'Corporate Law'
            },
            {
                id: 'demo_client_1',
                name: 'Demo Client',
                email: 'demo.client@example.com',
                role: 'client',
                caseType: 'Divorce'
            },
            {
                id: 'demo_judge_1',
                name: 'Demo Judge',
                email: 'demo.judge@example.com',
                role: 'judge',
                court: 'Supreme Court'
            }
        ];
        
        // Create user selection modal
        const selectionModal = document.createElement('div');
        selectionModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        selectionModal.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                width: 100%;
                max-width: 400px;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <div style="
                    padding: 24px;
                    background: linear-gradient(135deg, #7c3aed, #2563eb);
                    color: white;
                    text-align: center;
                ">
                    <h3 style="margin: 0; font-size: 20px;">👥 Select Demo User</h3>
                    <p style="margin: 8px 0 0; opacity: 0.9;">
                        Choose a demo profile to explore features
                    </p>
                </div>
                
                <div style="padding: 24px;">
                    ${demoUsers.map((user, index) => `
                        <div class="demo-user-option" data-index="${index}" style="
                            padding: 16px;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            margin-bottom: 12px;
                            cursor: pointer;
                            transition: all 0.3s;
                        ">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="
                                    width: 40px;
                                    height: 40px;
                                    background: linear-gradient(135deg, #7c3aed, #2563eb);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-weight: bold;
                                    font-size: 18px;
                                ">
                                    ${user.name.charAt(0)}
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #334155;">${user.name}</div>
                                    <div style="font-size: 14px; color: #64748b;">${user.email}</div>
                                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                                        Role: ${user.role} • ${user.specialization || user.caseType || user.court}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <button id="closeDemoModal" style="
                            width: 100%;
                            padding: 12px;
                            background: #e2e8f0;
                            color: #64748b;
                            border: none;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(selectionModal);
        
        // Add event listeners
        selectionModal.querySelectorAll('.demo-user-option').forEach((option, index) => {
            option.addEventListener('click', () => {
                const user = demoUsers[index];
                this.setDemoSession(user);
                selectionModal.remove();
                this.hideLoginModal();
            });
            
            option.onmouseover = () => {
                option.style.borderColor = '#2563eb';
                option.style.backgroundColor = '#f8fafc';
                option.style.transform = 'translateY(-2px)';
                option.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            };
            
            option.onmouseout = () => {
                option.style.borderColor = '#e2e8f0';
                option.style.backgroundColor = '';
                option.style.transform = '';
                option.style.boxShadow = '';
            };
        });
        
        document.getElementById('closeDemoModal').addEventListener('click', () => {
            selectionModal.remove();
        });
        
        selectionModal.addEventListener('click', (e) => {
            if (e.target === selectionModal) {
                selectionModal.remove();
            }
        });
    }

    /**
     * Set demo user session
     */
    setDemoSession(userData) {
        // Generate a demo token
        const demoToken = 'demo_' + btoa(JSON.stringify({
            ...userData,
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }));
        
        const fullUserData = {
            ...userData,
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=7c3aed&color=fff&size=128`,
            provider: 'demo',
            isDemo: true
        };
        
        this.setSession(demoToken, fullUserData);
        this.showToast(`Welcome ${userData.name}! (Demo Mode)`, 'success');
    }

    /**
     * Enable local authentication for GitHub Pages
     */
    enableLocalAuth() {
        // Check for local auth credentials
        const localAuthKey = 'legal_swami_local_auth_enabled';
        if (!localStorage.getItem(localAuthKey)) {
            localStorage.setItem(localAuthKey, 'true');
            console.log('🔐 Local authentication enabled for GitHub Pages');
        }
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
            
            // For demo users on GitHub Pages, always allow
            if (user.isDemo && this.isGitHubPages) {
                this.currentState = this.states.LOGGED_IN;
                this.api.user = user;
                this.api.token = token;
                console.log('✅ Demo session restored on GitHub Pages');
                this.dispatchEvent('demoSessionRestored', { user });
                return;
            }
            
            // Validate with backend if API is available and online
            if (this.api.verifyToken && !this.isOfflineMode && !this.isGitHubPages) {
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
                    // In offline mode or GitHub Pages, still allow cached session
                    if (this.isOfflineMode || this.isGitHubPages) {
                        console.log('🌐 Using cached session');
                        this.currentState = this.states.LOGGED_IN;
                        this.api.user = user;
                        this.api.token = token;
                    } else {
                        this.currentState = this.states.EXPIRED;
                        await this.handleTokenExpired();
                    }
                }
            } else {
                // If no backend verification or offline/GitHub Pages, trust localStorage
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
     * Initialize Google OAuth (skipped on GitHub Pages)
     */
    async initializeGoogleAuth() {
        // Skip on GitHub Pages
        if (this.isGitHubPages) {
            console.log('⏭️ Skipping Google OAuth on GitHub Pages');
            this.googleAuth = null;
            return;
        }
        
        // Get client ID first
        const clientId = this.getGoogleClientId();
        
        // If no valid client ID, disable Google OAuth
        if (!clientId || clientId.includes('YOUR_CLIENT_ID') || clientId.includes('placeholder')) {
            console.warn('⚠️ No valid Google Client ID configured. Google Sign-In disabled.');
            this.googleAuth = null;
            return;
        }
        
        // Check if Google API is available
        if (typeof gapi === 'undefined') {
            console.warn('⚠️ Google API not loaded. Google Sign-In will not work.');
            this.googleAuth = null;
            return;
        }
        
        try {
            // Load auth2 library
            await new Promise((resolve, reject) => {
                try {
                    gapi.load('auth2', {
                        callback: resolve,
                        onerror: reject
                    });
                } catch (loadError) {
                    console.error('❌ gapi.load failed:', loadError);
                    reject(loadError);
                }
            });
            
            // Initialize Google Auth with error suppression
            try {
                this.googleAuth = gapi.auth2.init({
                    client_id: clientId,
                    cookiepolicy: 'single_host_origin',
                    scope: 'profile email',
                    ux_mode: 'redirect', // Use redirect instead of popup for better compatibility
                    fetch_basic_profile: true
                });
                
                console.log('✅ Google OAuth initialized');
                
                // Check if already signed in
                if (this.googleAuth.isSignedIn.get()) {
                    const googleUser = this.googleAuth.currentUser.get();
                    await this.handleGoogleSignIn(googleUser);
                }
                
                // Listen for sign-in state changes
                this.googleAuth.isSignedIn.listen((isSignedIn) => {
                    if (isSignedIn) {
                        const googleUser = this.googleAuth.currentUser.get();
                        this.handleGoogleSignIn(googleUser).catch(error => {
                            console.error('Error handling Google sign-in:', error);
                        });
                    } else {
                        this.handleGoogleSignOut().catch(error => {
                            console.error('Error handling Google sign-out:', error);
                        });
                    }
                });
                
            } catch (initError) {
                console.error('❌ Google auth2.init failed:', initError);
                this.googleAuth = null;
                
                // Try alternative initialization
                await this.tryAlternativeGoogleAuth(clientId);
            }
            
        } catch (error) {
            console.error('❌ Google OAuth initialization failed:', error);
            this.googleAuth = null;
        }
    }

    /**
     * Try alternative Google Auth methods
     */
    async tryAlternativeGoogleAuth(clientId) {
        console.log('🔄 Trying alternative Google Auth method...');
        
        try {
            // Try with explicit consent
            this.googleAuth = gapi.auth2.init({
                client_id: clientId,
                cookiepolicy: 'single_host_origin',
                scope: 'profile email',
                ux_mode: 'redirect',
                prompt: 'select_account'
            });
            
            console.log('✅ Alternative Google OAuth initialized');
        } catch (error) {
            console.error('❌ Alternative Google Auth also failed:', error);
            this.googleAuth = null;
        }
    }

    /**
     * Get Google Client ID from config or environment
     */
    getGoogleClientId() {
        // Priority 1: Window config
        if (window.LEGAL_SWAMI_CONFIG?.googleClientId) {
            const clientId = window.LEGAL_SWAMI_CONFIG.googleClientId;
            if (clientId && !clientId.includes('YOUR_CLIENT_ID') && !clientId.includes('placeholder')) {
                return clientId;
            }
        }
        
        // Priority 2: Check meta tags
        const metaTag = document.querySelector('meta[name="google-signin-client_id"]');
        if (metaTag) {
            const clientId = metaTag.getAttribute('content');
            if (clientId && !clientId.includes('YOUR_CLIENT_ID')) {
                return clientId;
            }
        }
        
        // Priority 3: Check for environment variable
        if (window._env?.GOOGLE_CLIENT_ID) {
            return window._env.GOOGLE_CLIENT_ID;
        }
        
        // Check if process.env is available (for build tools)
        if (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) {
            return process.env.GOOGLE_CLIENT_ID;
        }
        
        // For GitHub Pages, return null to disable
        if (this.isGitHubPages) {
            return null;
        }
        
        // Localhost development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('⚠️ Using demo Google Client ID for localhost');
            return '166511615962-bohur5q8d4i5hud6icr4185kcte9enk8.apps.googleusercontent.com';
        }
        
        // Default - disable to avoid errors
        console.warn('⚠️ No Google Client ID configured');
        return null;
    }

    /**
     * Handle Google Sign-In
     */
    async handleGoogleSignIn(googleUser) {
        // Skip on GitHub Pages
        if (this.isGitHubPages) {
            console.log('⏭️ Google Sign-In not available on GitHub Pages');
            this.showToast('Google Sign-In not available on GitHub Pages. Use demo login.', 'warning');
            return;
        }
        
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
            
            // If backend API is available and online, verify with backend
            if (this.api.loginWithGoogle && !this.isOfflineMode) {
                try {
                    const result = await this.api.loginWithGoogle(authResponse.id_token);
                    
                    // Use backend response
                    this.setSession(result.token, {
                        ...userData,
                        id: result.user?.id || userData.id,
                        token: result.token
                    });
                    
                } catch (backendError) {
                    console.warn('⚠️ Backend login failed:', backendError);
                    // Fallback to local session
                    this.setSession(authResponse.id_token, userData);
                }
            } else {
                // No backend or offline, use local session
                this.setSession(authResponse.id_token, userData);
            }
            
            this.dispatchEvent('googleSignInSuccess', { user: userData });
            
        } catch (error) {
            console.error('❌ Google Sign-In failed:', error);
            this.currentState = this.states.LOGGED_OUT;
            this.dispatchEvent('googleSignInError', { error });
            
            // Show user-friendly error
            if (error.error === 'popup_closed_by_user') {
                this.showToast('Sign-in was cancelled', 'info');
            } else {
                this.showToast('Google Sign-In failed. Try demo login instead.', 'error');
            }
        }
    }

    /**
     * Manual Google Sign-In
     */
    async signInWithGoogle() {
        // On GitHub Pages, redirect to demo login
        if (this.isGitHubPages) {
            console.log('🔀 Redirecting to demo login on GitHub Pages');
            this.demoLogin();
            return;
        }
        
        if (!this.googleAuth) {
            // Try to initialize if not already
            await this.initializeGoogleAuth();
            
            if (!this.googleAuth) {
                this.showToast('Google Sign-In not available. Try demo login instead.', 'warning');
                this.demoLogin();
                return;
            }
        }
        
        try {
            await this.googleAuth.signIn();
            return true;
        } catch (error) {
            console.error('❌ Manual Google Sign-In failed:', error);
            
            if (error.error === 'popup_closed_by_user') {
                this.showToast('Sign-in was cancelled', 'info');
            } else {
                this.showToast('Google Sign-In failed. Try demo login instead.', 'error');
                this.demoLogin();
            }
            
            throw error;
        }
    }

    /**
     * Set user session
     */
    setSession(token, userData) {
        // Store in localStorage
        localStorage.setItem('legal_swami_token', token);
        localStorage.setItem('legal_swami_user', JSON.stringify(userData));
        
        // Update last sync time
        localStorage.setItem('last_sync_time', Date.now().toString());
        
        // Update API service
        if (this.api.setAuth) {
            this.api.setAuth(token, userData);
        } else {
            this.api.user = userData;
            this.api.token = token;
        }
        
        this.currentState = this.states.LOGGED_IN;
        
        console.log('🔐 Session set for user:', userData.email);
        
        // Track login
        this.trackLogin();
        
        // Dispatch events
        this.dispatchEvent('sessionSet', { user: userData });
        this.dispatchEvent('authStateChange', {
            state: this.currentState,
            user: userData,
            isOffline: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages
        });
        
        // Show success message
        const welcomeMsg = userData.isDemo 
            ? `Welcome ${userData.name}! (Demo Mode)` 
            : `Welcome ${userData.name}!`;
        this.showToast(welcomeMsg, 'success');
        
        // Update UI
        this.updateAuthUI();
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
            user: null,
            isOffline: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages
        });
        
        // Update UI
        this.updateAuthUI();
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
        
        // Show login modal after delay if online
        if (!this.isOfflineMode) {
            setTimeout(() => {
                this.showLoginModal();
            }, 2000);
        }
    }

    /**
     * Check if token is expired (basic implementation)
     */
    isTokenExpired(token) {
        if (!token) return true;
        
        // Demo tokens don't expire (for GitHub Pages)
        if (token.startsWith('demo_')) {
            return false;
        }
        
        try {
            // Decode JWT token (without verification)
            const parts = token.split('.');
            if (parts.length !== 3) return true;
            
            const payload = JSON.parse(atob(parts[1]));
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
            hasGoogleAuth: !!this.googleAuth,
            isOffline: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages,
            isDemoUser: this.api.user?.isDemo || false,
            capabilities: this.isOfflineMode ? this.getOfflineCapabilities() : null
        };
    }

    /**
     * Show login modal
     */
    showLoginModal() {
        // Don't show login modal in offline mode if we have cached session
        if (this.isOfflineMode && this.isAuthenticated()) {
            this.showToast('Using cached session (offline mode)', 'info');
            return;
        }
        
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
            this.dispatchEvent('loginModalShown');
        } else {
            console.warn('⚠️ Login modal not found');
            
            // Create fallback modal
            this.createFallbackLoginModal();
        }
    }

    /**
     * Create fallback login modal
     */
    createFallbackLoginModal() {
        const modal = document.createElement('div');
        modal.id = 'loginModalFallback';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                width: 100%;
                max-width: 400px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="
                    padding: 24px;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: white;
                    text-align: center;
                ">
                    <h3 style="margin: 0; font-size: 20px;">🔐 Login to LegalSwami</h3>
                    <p style="margin: 8px 0 0; opacity: 0.9;">
                        Access your legal assistant
                    </p>
                </div>
                
                <div style="padding: 32px; text-align: center;">
                    <button id="fallbackDemoLogin" style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #7c3aed, #2563eb);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        font-weight: 600;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 12px 0;
                    ">
                        <span style="font-size: 18px;">👤</span>
                        <span>Try Demo Login</span>
                    </button>
                    
                    ${!this.isGitHubPages ? `
                    <button id="fallbackGoogleLogin" style="
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
                        margin: 12px 0;
                    ">
                        <span style="font-size: 18px; color: #ea4335;">G</span>
                        <span>Sign in with Google</span>
                    </button>
                    ` : ''}
                    
                    <button id="closeFallbackModal" style="
                        width: 100%;
                        padding: 10px;
                        background: transparent;
                        border: 2px solid #e2e8f0;
                        border-radius: 8px;
                        color: #64748b;
                        font-weight: 500;
                        font-size: 14px;
                        cursor: pointer;
                        margin-top: 16px;
                    ">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('fallbackDemoLogin').addEventListener('click', () => {
            modal.remove();
            this.demoLogin();
        });
        
        if (!this.isGitHubPages) {
            document.getElementById('fallbackGoogleLogin').addEventListener('click', () => {
                modal.remove();
                this.signInWithGoogle();
            });
        }
        
        document.getElementById('closeFallbackModal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Hide login modal
     */
    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        const fallbackModal = document.getElementById('loginModalFallback');
        if (fallbackModal) {
            fallbackModal.remove();
        }
        
        this.dispatchEvent('loginModalHidden');
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
        
        // Demo login button (if exists)
        const demoLoginBtn = document.getElementById('demoLoginBtn');
        if (demoLoginBtn) {
            demoLoginBtn.addEventListener('click', () => this.demoLogin());
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
        
        // Network status listeners
        window.addEventListener('online', () => {
            console.log('🌐 Internet connection restored');
            this.checkOfflineStatus();
            
            // Hide offline status bar
            const offlineBar = document.getElementById('offlineStatusBar');
            if (offlineBar) offlineBar.remove();
            
            // Try to restore session with backend
            setTimeout(() => {
                this.checkExistingSession();
            }, 1000);
            
            this.showToast('Back online! Syncing data...', 'success');
            this.dispatchEvent('connectionRestored');
        });
        
        window.addEventListener('offline', () => {
            console.log('🌐 Internet connection lost');
            this.checkOfflineStatus();
            this.showOfflineStatus();
            this.dispatchEvent('connectionLost');
        });
        
        // Listen for storage changes (for multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'legal_swami_token' || e.key === 'legal_swami_user') {
                console.log('🔄 Auth storage changed in another tab');
                this.checkExistingSession();
                this.updateAuthUI();
            }
        });
    }

    /**
     * Update user interface based on auth state
     */
    updateAuthUI() {
        const isAuthenticated = this.isAuthenticated();
        const user = this.getCurrentUser();
        const isDemoUser = user?.isDemo || false;
        
        // Update user profile display
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userProfile && userName && userEmail && userAvatar) {
            if (isAuthenticated && user.id !== 'guest') {
                // User is logged in
                userProfile.style.display = 'flex';
                
                // Handle header login button
                const headerLoginBtn = document.getElementById('headerLoginBtn');
                if (headerLoginBtn) {
                    headerLoginBtn.style.display = 'none';
                }
                
                userName.textContent = user.name || 'User';
                userEmail.textContent = user.email || '';
                
                // Add demo badge for demo users
                if (isDemoUser) {
                    if (!userName.querySelector('.demo-badge')) {
                        const demoBadge = document.createElement('span');
                        demoBadge.className = 'demo-badge';
                        demoBadge.textContent = ' (Demo)';
                        demoBadge.style.cssText = `
                            font-size: 12px;
                            color: #f59e0b;
                            margin-left: 4px;
                            font-weight: normal;
                        `;
                        userName.appendChild(demoBadge);
                    }
                }
                
                // Set avatar
                if (user.picture) {
                    userAvatar.innerHTML = `
                        <img src="${user.picture}" 
                             alt="${user.name}" 
                             style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">
                    `;
                } else {
                    const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                    const gradient = isDemoUser 
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                        : 'linear-gradient(135deg, #2563eb, #7c3aed)';
                    
                    userAvatar.innerHTML = `
                        <div style="width: 100%; height: 100%; 
                              background: ${gradient}; 
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
                
                // Handle header login button
                const headerLoginBtn = document.getElementById('headerLoginBtn');
                if (headerLoginBtn) {
                    headerLoginBtn.style.display = 'flex';
                }
            }
        } else {
            // If user profile elements don't exist, still handle header login button
            const headerLoginBtn = document.getElementById('headerLoginBtn');
            if (headerLoginBtn) {
                headerLoginBtn.style.display = isAuthenticated && user.id !== 'guest' ? 'none' : 'flex';
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
        
        // Update demo-only content
        document.querySelectorAll('[data-demo-only]').forEach(element => {
            if (isDemoUser) {
                element.style.display = element.dataset.demoDisplay || 'block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Update offline indicators
        document.querySelectorAll('[data-online-only]').forEach(element => {
            if (this.isOfflineMode) {
                element.style.display = 'none';
            } else {
                element.style.display = element.dataset.onlineDisplay || 'block';
            }
        });
        
        document.querySelectorAll('[data-offline-only]').forEach(element => {
            if (this.isOfflineMode) {
                element.style.display = element.dataset.offlineDisplay || 'block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Dispatch UI update event
        this.dispatchEvent('authUIUpdated', { 
            isAuthenticated, 
            user,
            isDemo: isDemoUser,
            isOffline: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages
        });
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
            animation: authSlideIn 0.3s ease;
        `;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        toast.style.borderLeftColor = colors[type] || colors.info;
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span style="font-size: 18px; font-weight: bold; color: ${colors[type] || colors.info}">
                ${icons[type] || icons.info}
            </span>
            <span style="font-size: 14px; color: #334155;">${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'authSlideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
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

    // ... (Keep all the other methods from previous version: checkOfflineStatus, 
    // getOfflineCapabilities, showOfflineStatus, calculateLocalStorageUsage, 
    // estimateLocalStorageAvailable, hasLocalStorageSpace, exportUserData, 
    // getUserStats, calculateSessionDuration, trackLogin, etc.)
    // They remain the same as in v2.1.0

    /**
     * Check if app is in offline mode
     */
    checkOfflineStatus() {
        const isOnline = navigator.onLine;
        const hasValidToken = !!localStorage.getItem('legal_swami_token');
        const token = localStorage.getItem('legal_swami_token');
        const tokenExpired = token ? this.isTokenExpired(token) : true;
        
        this.isOfflineMode = !isOnline || (hasValidToken && !tokenExpired && !this.isAuthenticated());
        
        if (this.isOfflineMode) {
            console.log('🌐 Offline mode activated');
            this.dispatchEvent('offlineModeActivated', {
                isInternetOffline: !isOnline,
                hasCachedSession: hasValidToken && !tokenExpired
            });
        }
        
        return this.isOfflineMode;
    }

    /**
     * Get offline capabilities
     */
    getOfflineCapabilities() {
        const user = this.getCurrentUser();
        const isGuest = user.id === 'guest';
        
        return {
            canViewDocuments: !isGuest,
            canEditDocuments: !isGuest && this.hasLocalStorageSpace(),
            canAccessCachedResearch: !isGuest,
            canUseBasicTemplates: true,
            canExportDocuments: !isGuest,
            canPrintDocuments: true,
            canUseLocalSearch: !isGuest,
            canAccessHelp: true,
            canManageProfile: !isGuest,
            
            // Timestamp for sync
            lastSyncTime: localStorage.getItem('last_sync_time'),
            
            // Storage info
            localStorageUsed: this.calculateLocalStorageUsage(),
            localStorageAvailable: this.estimateLocalStorageAvailable(),
            
            // Limitations
            limitations: [
                'Real-time legal updates unavailable',
                'New AI analysis disabled',
                'Cloud sync paused',
                'Team collaboration disabled',
                'Payment features unavailable',
                'Google Sign-In disabled'
            ]
        };
    }

    /**
     * Show offline status UI
     */
    showOfflineStatus() {
        if (!this.isOfflineMode) return;
        
        const capabilities = this.getOfflineCapabilities();
        const user = this.getCurrentUser();
        
        // Remove existing offline bar if any
        const existingBar = document.getElementById('offlineStatusBar');
        if (existingBar) existingBar.remove();
        
        // Create offline status bar
        const offlineBar = document.createElement('div');
        offlineBar.id = 'offlineStatusBar';
        offlineBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 12px 20px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        const userName = user.name || 'Guest';
        offlineBar.innerHTML = `
            <span style="font-size: 16px;">📶</span>
            <span>${userName}, you're in offline mode. Some features are limited.</span>
            <button id="offlineDetailsBtn" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                margin-left: 10px;
            ">Details</button>
            <button id="dismissOfflineBtn" style="
                background: transparent;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                margin-left: 15px;
            ">×</button>
        `;
        
        document.body.appendChild(offlineBar);
        
        // Add event listeners
        setTimeout(() => {
            const detailsBtn = document.getElementById('offlineDetailsBtn');
            const dismissBtn = document.getElementById('dismissOfflineBtn');
            
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    // You can implement showOfflineCapabilitiesModal here
                    this.showToast('Offline mode details', 'info');
                });
            }
            
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    offlineBar.style.display = 'none';
                });
            }
        }, 100);
    }

    /**
     * Calculate localStorage usage
     */
    calculateLocalStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (key.length + localStorage[key].length) * 2;
            }
        }
        
        if (total < 1024) return total + ' B';
        if (total < 1024 * 1024) return (total / 1024).toFixed(1) + ' KB';
        return (total / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Estimate available localStorage
     */
    estimateLocalStorageAvailable() {
        try {
            const total = 5 * 1024 * 1024; // Assume 5MB typical localStorage limit
            const used = this.calculateLocalStorageUsage();
            const usedMatch = used.match(/([\d.]+)\s*(\w+)/);
            
            if (!usedMatch) return 'Unknown';
            
            let usedBytes = parseFloat(usedMatch[1]);
            const unit = usedMatch[2].toUpperCase();
            
            // Convert to bytes
            if (unit === 'KB') usedBytes *= 1024;
            if (unit === 'MB') usedBytes *= 1024 * 1024;
            
            const available = total - usedBytes;
            
            if (available < 1024) return '< 1 KB';
            if (available < 1024 * 1024) return (available / 1024).toFixed(0) + ' KB';
            return (available / (1024 * 1024)).toFixed(1) + ' MB';
            
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Check if there's enough local storage space
     */
    hasLocalStorageSpace() {
        const available = this.estimateLocalStorageAvailable();
        const numericValue = parseFloat(available);
        
        // Consider space available if more than 500KB
        if (available.includes('KB')) {
            return numericValue > 500;
        }
        if (available.includes('MB')) {
            return numericValue > 0.5;
        }
        return false;
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
            app: 'LegalSwami',
            version: '2.2.0'
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
            isGuest: user.id === 'guest',
            isDemo: user.isDemo || false,
            offlineMode: this.isOfflineMode,
            isGitHubPages: this.isGitHubPages,
            localStorageUsage: this.calculateLocalStorageUsage()
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
if (!document.querySelector('style#auth-styles')) {
    const authStyles = document.createElement('style');
    authStyles.id = 'auth-styles';
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
            display: none;
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
        
        .demo-login-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #7c3aed, #2563eb);
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            margin: 12px 0;
        }
        
        .demo-login-btn:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .auth-footer {
            margin-top: 24px;
            font-size: 14px;
            color: #64748b;
        }
        
        .demo-badge {
            font-size: 12px;
            color: #f59e0b;
            margin-left: 4px;
            font-weight: normal;
        }
    `;
    document.head.appendChild(authStyles);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Update UI after auth initialization
    setTimeout(() => {
        if (window.legalSwamiAuth) {
            window.legalSwamiAuth.updateAuthUI();
        }
    }, 500);
    
    // Listen for auth state changes
    if (window.legalSwamiAuth) {
        window.legalSwamiAuth.on('authStateChange', () => {
            window.legalSwamiAuth.updateAuthUI();
        });
        
        // Track login if user is authenticated
        if (window.legalSwamiAuth.isAuthenticated()) {
            window.legalSwamiAuth.trackLogin();
        }
    }
});

console.log('✅ LegalSwami Authentication Service v2.2.0 (GitHub Pages Compatible) loaded');
