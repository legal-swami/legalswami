/**
 * LegalSwami Main Application
 * Version: 3.0.0
 * Date: 2024-01-15
 * Main application initialization and orchestration
 */

class LegalSwamiApp {
    constructor() {
        this.isInitialized = false;
        this.isBackendConnected = false;
        this.currentView = 'home';
        this.darkMode = false;
        this.loading = false;
        
        // Services
        this.api = null;
        this.auth = null;
        this.chat = null;
        this.utils = null;
        
        // App configuration
        this.config = {
            appName: 'LegalSwami',
            version: '3.0.0',
            environment: 'production',
            features: {
                chat: true,
                documents: true,
                history: true,
                voiceInput: false,
                fileUpload: true
            },
            limits: {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                maxMessageLength: 4000,
                maxHistoryItems: 100
            }
        };
        
        // Initialize on construction
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing LegalSwami Application...');
        
        // Show loading screen
        this.showLoadingScreen('Loading LegalSwami...');
        
        try {
            // Step 1: Initialize utilities first
            await this.initializeUtils();
            
            // Step 2: Initialize API service
            await this.initializeAPI();
            
            // Step 3: Initialize Authentication
            await this.initializeAuth();
            
            // Step 4: Initialize Chat service
            await this.initializeChat();
            
            // Step 5: Setup event listeners
            this.setupEventListeners();
            
            // Step 6: Load configuration
            await this.loadConfiguration();
            
            // Step 7: Check backend connection
            await this.checkBackendConnection();
            
            // Step 8: Initialize UI
            await this.initializeUI();
            
            // Step 9: Final setup
            await this.finalizeSetup();
            
            this.isInitialized = true;
            console.log('✅ LegalSwami Application initialized successfully');
            
            // Dispatch initialization complete event
            this.dispatchEvent('appInitialized', {
                config: this.config,
                services: {
                    api: !!this.api,
                    auth: !!this.auth,
                    chat: !!this.chat,
                    utils: !!this.utils
                }
            });
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showError('Failed to initialize application', error);
        } finally {
            // Hide loading screen
            setTimeout(() => {
                this.hideLoadingScreen();
            }, 1000);
        }
    }

    /**
     * Initialize utility functions
     */
    async initializeUtils() {
        try {
            // Check if utils already loaded
            if (window.LegalSwamiUtils) {
                this.utils = window.LegalSwamiUtils;
                console.log('✅ Using existing LegalSwamiUtils');
            } else {
                // Load utils dynamically
                await this.loadScript('js/utils.js');
                this.utils = window.LegalSwamiUtils;
                console.log('✅ LegalSwamiUtils loaded');
            }
        } catch (error) {
            console.warn('⚠️ Utils initialization failed, using fallback:', error);
            this.utils = this.createFallbackUtils();
        }
    }

    /**
     * Initialize API service
     */
    async initializeAPI() {
        try {
            // Check if API already loaded
            if (window.legalSwamiAPI) {
                this.api = window.legalSwamiAPI;
                console.log('✅ Using existing LegalSwamiAPI');
            } else {
                // Load API dynamically
                await this.loadScript('js/api.js');
                this.api = window.legalSwamiAPI;
                console.log('✅ LegalSwamiAPI loaded');
            }
        } catch (error) {
            console.warn('⚠️ API initialization failed, using fallback:', error);
            this.api = this.createFallbackAPI();
        }
    }

    /**
     * Initialize Authentication service
     */
    async initializeAuth() {
        try {
            // Check if auth already loaded
            if (window.legalSwamiAuth) {
                this.auth = window.legalSwamiAuth;
                console.log('✅ Using existing LegalSwamiAuth');
            } else {
                // Load auth dynamically
                await this.loadScript('js/auth.js');
                this.auth = window.legalSwamiAuth;
                console.log('✅ LegalSwamiAuth loaded');
            }
            
            // Listen for auth events
            this.auth.on('authStateChange', (data) => {
                this.handleAuthStateChange(data);
            });
            
        } catch (error) {
            console.warn('⚠️ Auth initialization failed:', error);
            // Create minimal auth fallback
            this.auth = {
                isAuthenticated: () => false,
                getCurrentUser: () => ({ id: 'guest' }),
                on: () => {},
                showToast: (msg, type) => this.showToast(msg, type)
            };
        }
    }

    /**
     * Initialize Chat service
     */
    async initializeChat() {
        try {
            // Check if chat already loaded
            if (window.legalSwamiChat) {
                this.chat = window.legalSwamiChat;
                console.log('✅ Using existing LegalSwamiChat');
            } else {
                // Load chat dynamically (only if needed)
                if (this.config.features.chat) {
                    await this.loadScript('js/chat.js');
                    this.chat = window.legalSwamiChat;
                    console.log('✅ LegalSwamiChat loaded');
                }
            }
        } catch (error) {
            console.warn('⚠️ Chat initialization failed:', error);
            this.chat = null;
        }
    }

    /**
     * Load application configuration
     */
    async loadConfiguration() {
        try {
            // Try to load from config file
            const response = await fetch('config/config.json');
            if (response.ok) {
                const fileConfig = await response.json();
                this.config = { ...this.config, ...fileConfig };
                console.log('✅ Configuration loaded from file');
            }
        } catch (error) {
            console.log('ℹ️ Using default configuration');
        }
        
        // Load from window config if available
        if (window.LEGAL_SWAMI_CONFIG) {
            this.config = { ...this.config, ...window.LEGAL_SWAMI_CONFIG };
            console.log('✅ Configuration loaded from window');
        }
        
        // Set environment based on URL
        if (window.location.hostname.includes('github.io')) {
            this.config.environment = 'production';
        } else if (window.location.hostname.includes('localhost')) {
            this.config.environment = 'development';
        }
        
        console.log('📋 App Configuration:', this.config);
    }

    /**
     * Check backend connection
     */
    async checkBackendConnection() {
        try {
            if (this.api && this.api.checkBackendStatus) {
                this.isBackendConnected = await this.api.checkBackendStatus();
                
                if (this.isBackendConnected) {
                    console.log('✅ Backend connected');
                    this.showToast('Connected to LegalSwami AI', 'success');
                } else {
                    console.log('⚠️ Backend offline, running in demo mode');
                    this.showToast('Running in demo mode', 'warning');
                    
                    // Show demo mode indicator
                    this.showDemoIndicator();
                }
                
                this.dispatchEvent('backendConnectionChange', {
                    connected: this.isBackendConnected
                });
            }
        } catch (error) {
            console.error('❌ Backend check failed:', error);
            this.isBackendConnected = false;
        }
    }

    /**
     * Initialize User Interface
     */
    async initializeUI() {
        // Setup theme
        this.setupTheme();
        
        // Update navigation based on auth state
        this.updateNavigation();
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Setup mobile menu
        this.setupMobileMenu();
        
        // Setup scroll effects
        this.setupScrollEffects();
        
        // Initialize modals
        this.initializeModals();
        
        // Update footer with version
        this.updateFooter();
        
        console.log('✅ UI initialized');
    }

    /**
     * Setup application event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        this.setupNavigationListeners();
        
        // Theme toggle
        this.setupThemeToggle();
        
        // Chat interface
        this.setupChatListeners();
        
        // Window events
        this.setupWindowEvents();
        
        // Form submissions
        this.setupFormListeners();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✅ Event listeners setup');
    }

    /**
     * Final setup steps
     */
    async finalizeSetup() {
        // Check for updates
        await this.checkForUpdates();
        
        // Initialize analytics (if enabled)
        this.initializeAnalytics();
        
        // Setup service worker for PWA
        this.setupServiceWorker();
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Dispatch ready event
        setTimeout(() => {
            this.dispatchEvent('appReady', {
                timestamp: new Date().toISOString(),
                user: this.auth.getCurrentUser(),
                backendConnected: this.isBackendConnected
            });
        }, 500);
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(data) {
        console.log('🔐 Auth state changed:', data.state);
        
        // Update navigation
        this.updateNavigation();
        
        // Update chat interface
        if (this.chat) {
            if (data.state === 'logged_in') {
                this.chat.loadChatHistory();
            } else if (data.state === 'logged_out') {
                this.chat.clearChat();
            }
        }
        
        // Show appropriate message
        if (data.state === 'logged_in') {
            this.showToast(`Welcome ${data.user.name}!`, 'success');
        } else if (data.state === 'logged_out') {
            this.showToast('Logged out successfully', 'info');
        }
        
        // Update UI
        this.updateUserInterface();
    }

    /**
     * Navigation management
     */
    setupNavigationListeners() {
        // Home button
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => this.navigateTo('home'));
        }
        
        // Chat button
        const chatBtn = document.getElementById('chatBtn');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => this.navigateTo('chat'));
        }
        
        // Features button
        const featuresBtn = document.getElementById('featuresBtn');
        if (featuresBtn) {
            featuresBtn.addEventListener('click', () => this.navigateTo('features'));
        }
        
        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => this.navigateBack());
        });
        
        // External links
        document.querySelectorAll('a[data-external]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(link.href, '_blank', 'noopener,noreferrer');
            });
        });
    }

    /**
     * Navigate to different views
     */
    navigateTo(view, params = {}) {
        if (this.currentView === view) return;
        
        const previousView = this.currentView;
        this.currentView = view;
        
        console.log(`🔄 Navigation: ${previousView} -> ${view}`);
        
        // Hide all views
        document.querySelectorAll('.app-view').forEach(view => {
            view.style.display = 'none';
        });
        
        // Show target view
        const targetView = document.getElementById(`${view}View`);
        if (targetView) {
            targetView.style.display = 'block';
            
            // Dispatch navigation event
            this.dispatchEvent('navigation', {
                from: previousView,
                to: view,
                params: params
            });
            
            // Update active navigation item
            this.updateActiveNavItem(view);
            
            // Handle specific view initialization
            this.handleViewNavigation(view, params);
        }
    }

    /**
     * Navigate back
     */
    navigateBack() {
        const views = ['home', 'chat', 'features', 'history', 'settings'];
        const currentIndex = views.indexOf(this.currentView);
        
        if (currentIndex > 0) {
            this.navigateTo(views[currentIndex - 1]);
        } else {
            this.navigateTo('home');
        }
    }

    /**
     * Handle specific view navigation
     */
    handleViewNavigation(view, params) {
        switch (view) {
            case 'chat':
                this.initializeChatInterface();
                break;
                
            case 'features':
                this.animateFeatures();
                break;
                
            case 'settings':
                this.loadSettings();
                break;
                
            case 'history':
                if (this.chat) {
                    this.chat.loadChatHistory();
                }
                break;
        }
    }

    /**
     * Update active navigation item
     */
    updateActiveNavItem(activeView) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === activeView) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Update navigation based on auth state
     */
    updateNavigation() {
        const isAuthenticated = this.auth.isAuthenticated();
        
        // Show/hide auth-dependent navigation items
        document.querySelectorAll('[data-auth-required]').forEach(item => {
            if (isAuthenticated) {
                item.style.display = item.dataset.authDisplay || 'block';
            } else {
                item.style.display = 'none';
            }
        });
        
        document.querySelectorAll('[data-guest-only]').forEach(item => {
            if (!isAuthenticated) {
                item.style.display = item.dataset.guestDisplay || 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Initialize chat interface
     */
    initializeChatInterface() {
        if (!this.chat || !this.config.features.chat) return;
        
        // Check if user needs to login
        if (!this.auth.isAuthenticated() && this.config.features.requireAuthForChat) {
            this.showToast('Please login to use chat', 'warning');
            this.auth.showLoginModal();
            return;
        }
        
        // Initialize chat if not already initialized
        if (typeof this.chat.initialize === 'function') {
            this.chat.initialize();
        }
    }

    /**
     * Setup theme
     */
    setupTheme() {
        // Check saved theme preference
        const savedTheme = localStorage.getItem('legal_swami_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        // Apply theme
        this.applyTheme();
    }

    /**
     * Apply current theme
     */
    applyTheme() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
        
        // Save preference
        localStorage.setItem('legal_swami_theme', this.darkMode ? 'dark' : 'light');
        
        // Dispatch theme change event
        this.dispatchEvent('themeChange', { darkMode: this.darkMode });
    }

    /**
     * Setup theme toggle
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.darkMode = !this.darkMode;
                this.applyTheme();
                
                // Update icon
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-moon');
                    icon.classList.toggle('fa-sun');
                }
                
                this.showToast(`Switched to ${this.darkMode ? 'dark' : 'light'} mode`, 'info');
            });
            
            // Set initial icon
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = this.darkMode ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    /**
     * Setup chat listeners
     */
    setupChatListeners() {
        // Start chat button
        const startChatBtn = document.getElementById('startChatBtn');
        if (startChatBtn) {
            startChatBtn.addEventListener('click', () => {
                if (this.chat) {
                    this.navigateTo('chat');
                } else {
                    this.showToast('Chat feature is not available', 'error');
                }
            });
        }
        
        // Quick question buttons
        document.querySelectorAll('.quick-question').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question;
                if (question && this.chat) {
                    this.navigateTo('chat');
                    // Simulate typing the question
                    setTimeout(() => {
                        const input = document.getElementById('messageInput');
                        if (input) {
                            input.value = question;
                            input.focus();
                            // Trigger resize
                            input.dispatchEvent(new Event('input'));
                        }
                    }, 500);
                }
            });
        });
    }

    /**
     * Setup mobile menu
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    mobileMenu.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
            
            // Close menu when clicking links
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.remove('active');
                    menuToggle.classList.remove('active');
                });
            });
        }
    }

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        // Header scroll effect
        let lastScroll = 0;
        const header = document.querySelector('.main-header');
        
        if (header) {
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset;
                
                if (currentScroll > 100) {
                    if (currentScroll > lastScroll) {
                        // Scrolling down
                        header.style.transform = 'translateY(-100%)';
                    } else {
                        // Scrolling up
                        header.style.transform = 'translateY(0)';
                        header.classList.add('scrolled');
                    }
                } else {
                    header.classList.remove('scrolled');
                    header.style.transform = 'translateY(0)';
                }
                
                lastScroll = currentScroll;
            });
        }
        
        // Lazy loading for images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        // Simple tooltip implementation
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - 40) + 'px';
                tooltip.style.zIndex = '10000';
                
                document.body.appendChild(tooltip);
                e.target.tooltipElement = tooltip;
            });
            
            element.addEventListener('mouseleave', (e) => {
                if (e.target.tooltipElement) {
                    e.target.tooltipElement.remove();
                    delete e.target.tooltipElement;
                }
            });
        });
    }

    /**
     * Initialize modals
     */
    initializeModals() {
        document.querySelectorAll('.modal-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const modalId = toggle.dataset.modal;
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'flex';
                }
            });
        });
        
        // Close modals
        document.querySelectorAll('.modal-close, .modal').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target === element || e.target.classList.contains('modal-close')) {
                    element.style.display = 'none';
                }
            });
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }

    /**
     * Setup window events
     */
    setupWindowEvents() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.showToast('You are back online', 'success');
            this.checkBackendConnection();
        });
        
        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may not work.', 'warning');
            this.isBackendConnected = false;
        });
        
        // Resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });
    }

    /**
     * Setup form listeners
     */
    setupFormListeners() {
        document.querySelectorAll('form[data-ajax]').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const submitBtn = form.querySelector('[type="submit"]');
                const originalText = submitBtn?.textContent;
                
                try {
                    // Show loading
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    }
                    
                    // Submit form
                    const response = await fetch(form.action, {
                        method: form.method,
                        body: formData
                    });
                    
                    if (response.ok) {
                        this.showToast('Form submitted successfully', 'success');
                        form.reset();
                    } else {
                        throw new Error('Form submission failed');
                    }
                    
                } catch (error) {
                    this.showToast('Failed to submit form', 'error');
                    console.error('Form error:', error);
                } finally {
                    // Reset button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Ctrl/Cmd + K for chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.navigateTo('chat');
            }
            
            // Ctrl/Cmd + / for search
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + D for dark mode
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.darkMode = !this.darkMode;
                this.applyTheme();
            }
        });
    }

    /**
     * Update user interface
     */
    updateUserInterface() {
        // Update user info in header
        this.updateUserInfo();
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Update feature availability
        this.updateFeatureAvailability();
    }

    /**
     * Update user info in header
     */
    updateUserInfo() {
        const user = this.auth.getCurrentUser();
        const userInfo = document.getElementById('userInfo');
        
        if (userInfo) {
            if (user.id !== 'guest') {
                userInfo.innerHTML = `
                    <div class="user-greeting">
                        Welcome, <strong>${user.name || 'User'}</strong>
                    </div>
                `;
            } else {
                userInfo.innerHTML = `
                    <div class="user-greeting">
                        Welcome to LegalSwami
                    </div>
                `;
            }
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        if (this.isBackendConnected) {
            statusElement.innerHTML = `
                <span class="status-dot connected"></span>
                <span class="status-text">Connected to AI</span>
            `;
            statusElement.className = 'connection-status connected';
        } else {
            statusElement.innerHTML = `
                <span class="status-dot disconnected"></span>
                <span class="status-text">Offline Mode</span>
            `;
            statusElement.className = 'connection-status disconnected';
        }
    }

    /**
     * Update feature availability
     */
    updateFeatureAvailability() {
        const features = this.config.features;
        
        // Disable unavailable features
        if (!features.chat) {
            document.querySelectorAll('.chat-feature').forEach(el => {
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
            });
        }
        
        if (!features.documents) {
            document.querySelectorAll('.document-feature').forEach(el => {
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
            });
        }
    }

    /**
     * Update footer with app info
     */
    updateFooter() {
        const footerVersion = document.getElementById('footerVersion');
        if (footerVersion) {
            footerVersion.textContent = `v${this.config.version}`;
        }
        
        const footerYear = document.getElementById('footerYear');
        if (footerYear) {
            footerYear.textContent = new Date().getFullYear();
        }
    }

    /**
     * Show demo mode indicator
     */
    showDemoIndicator() {
        const existingIndicator = document.getElementById('demoIndicator');
        if (existingIndicator) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'demoIndicator';
        indicator.innerHTML = `
            <i class="fas fa-flask"></i>
            <span>Demo Mode</span>
        `;
        
        document.body.appendChild(indicator);
    }

    /**
     * Show loading screen
     */
    showLoadingScreen(message = 'Loading...') {
        let loader = document.getElementById('appLoadingScreen');
        
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'appLoadingScreen';
            loader.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner">
                        <i class="fas fa-balance-scale"></i>
                    </div>
                    <h2>LegalSwami</h2>
                    <p class="loading-message">${message}</p>
                    <div class="loading-progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        
        loader.style.display = 'flex';
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loader = document.getElementById('appLoadingScreen');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show toast message
     */
    showToast(message, type = 'info') {
        if (this.utils && this.utils.showToast) {
            this.utils.showToast(message, type);
        } else if (this.api && this.api.showToast) {
            this.api.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Show error message
     */
    showError(title, error) {
        console.error(title, error);
        
        const errorModal = document.getElementById('errorModal') || this.createErrorModal();
        const errorDetails = document.getElementById('errorDetails');
        
        if (errorDetails) {
            errorDetails.textContent = error.message || 'An unknown error occurred';
        }
        
        errorModal.style.display = 'flex';
        
        // Log error for debugging
        if (this.config.environment === 'development') {
            console.error('Error details:', error);
        }
    }

    /**
     * Create error modal
     */
    createErrorModal() {
        const modal = document.createElement('div');
        modal.id = 'errorModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header error">
                    <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="errorDetails"></p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Reload Application
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Load script dynamically
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = resolve;
            script.onerror = reject;
            
            document.head.appendChild(script);
        });
    }

    /**
     * Create fallback utils
     */
    createFallbackUtils() {
        return {
            showToast: (msg, type) => this.showToast(msg, type),
            formatDate: (date) => new Date(date).toLocaleDateString(),
            truncateText: (text, length) => text.length > length ? text.substring(0, length) + '...' : text
        };
    }

    /**
     * Create fallback API
     */
    createFallbackAPI() {
        return {
            user: { id: 'guest' },
            token: null,
            checkBackendStatus: async () => false,
            showToast: (msg, type) => this.showToast(msg, type)
        };
    }

    /**
     * Check for updates
     */
    async checkForUpdates() {
        if (this.config.environment === 'development') return;
        
        try {
            const response = await fetch('version.json');
            if (response.ok) {
                const data = await response.json();
                if (data.version !== this.config.version) {
                    this.showToast('New update available!', 'info');
                    console.log('Update available:', data.version);
                }
            }
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Initialize analytics
     */
    initializeAnalytics() {
        // Only in production
        if (this.config.environment !== 'production') return;
        
        // Simple analytics - you can integrate Google Analytics or other here
        console.log('📊 Analytics initialized');
    }

    /**
     * Setup service worker for PWA
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator && this.config.environment === 'production') {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('⚠️ Service Worker registration failed:', error);
                });
        }
    }

    /**
     * Setup offline detection
     */
    setupOfflineDetection() {
        if (!navigator.onLine) {
            this.showToast('You are currently offline', 'warning');
            this.isBackendConnected = false;
        }
    }

    /**
     * Save app state
     */
    saveAppState() {
        const state = {
            currentView: this.currentView,
            darkMode: this.darkMode,
            timestamp: Date.now()
        };
        
        localStorage.setItem('legal_swami_app_state', JSON.stringify(state));
    }

    /**
     * Load app state
     */
    loadAppState() {
        try {
            const saved = localStorage.getItem('legal_swami_app_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.currentView = state.currentView || 'home';
                this.darkMode = state.darkMode || false;
            }
        } catch (error) {
            console.log('Failed to load app state:', error);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.dispatchEvent('resize', {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: window.innerWidth < 768
        });
    }

    /**
     * Animate features section
     */
    animateFeatures() {
        const features = document.querySelectorAll('.feature-card');
        features.forEach((feature, index) => {
            feature.style.animationDelay = `${index * 0.1}s`;
            feature.classList.add('animate-in');
        });
    }

    /**
     * Event system
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
        
        const eventData = {
            ...data,
            timestamp: new Date().toISOString(),
            app: this
        };
        
        this.events[event].forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                console.error(`Error in app event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Get app information
     */
    getAppInfo() {
        return {
            name: this.config.appName,
            version: this.config.version,
            environment: this.config.environment,
            user: this.auth.getCurrentUser(),
            backendConnected: this.isBackendConnected,
            darkMode: this.darkMode,
            currentView: this.currentView
        };
    }

    /**
     * Reset application (for debugging)
     */
    reset() {
        if (confirm('Reset the application? This will clear all local data.')) {
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the app
    window.legalSwamiApp = new LegalSwamiApp();
    
    // Make app available globally
    window.LegalSwami = window.legalSwamiApp;
    
    // Expose reset for debugging
    if (window.location.hostname === 'localhost') {
        window.resetApp = () => window.legalSwamiApp.reset();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LegalSwamiApp };
} 
