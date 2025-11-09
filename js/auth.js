/* Authentication System for Expense Tracker */

// OAuth Configuration - Replace with your actual credentials
const OAUTH_CONFIG = {
  google: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    // To get Google Client ID:
    // 1. Go to https://console.developers.google.com/
    // 2. Create a new project or select existing
    // 3. Enable Google+ API
    // 4. Create OAuth 2.0 credentials
    // 5. Add your domain to authorized origins
  },
  facebook: {
    appId: 'YOUR_FACEBOOK_APP_ID',
    // To get Facebook App ID:
    // 1. Go to https://developers.facebook.com/
    // 2. Create a new app
    // 3. Add Facebook Login product
    // 4. Configure OAuth redirect URIs
    // 5. Copy the App ID
  }
};

class AuthSystem {
  constructor() {
    this.users = this.loadUsers();
    this.currentUser = this.getCurrentUser();
    this.initializeAuth();
  }

  // Load users from localStorage
  loadUsers() {
    const users = localStorage.getItem('expense_tracker_users');
    if (!users) {
      // Create default demo user
      const defaultUsers = {
        'demo@expense.com': {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@expense.com',
          password: this.hashPassword('demo123'),
          createdAt: new Date().toISOString(),
          lastLogin: null
        }
      };
      this.saveUsers(defaultUsers);
      return defaultUsers;
    }
    return JSON.parse(users);
  }

  // Save users to localStorage
  saveUsers(users) {
    localStorage.setItem('expense_tracker_users', JSON.stringify(users));
  }

  // Simple password hashing (in production, use proper bcrypt)
  hashPassword(password) {
    return btoa(password + 'expense_tracker_salt');
  }

  // Verify password
  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  // Get current logged-in user
  getCurrentUser() {
    const session = localStorage.getItem('expense_tracker_session');
    if (session) {
      const sessionData = JSON.parse(session);
      // Check if session is still valid (24 hours)
      if (new Date().getTime() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
        return sessionData.user;
      } else {
        this.logout();
      }
    }
    return null;
  }

  // Create user session
  createSession(user) {
    const sessionData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      timestamp: new Date().getTime()
    };
    localStorage.setItem('expense_tracker_session', JSON.stringify(sessionData));
    
    // Update last login
    this.users[user.email].lastLogin = new Date().toISOString();
    this.saveUsers(this.users);
  }

  // Login user
  async login(email, password, rememberMe = false) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = this.users[email.toLowerCase()];
      if (!user) {
        throw new Error('User not found');
      }

      if (!this.verifyPassword(password, user.password)) {
        throw new Error('Invalid password');
      }

      this.createSession(user);
      this.currentUser = user;

      if (rememberMe) {
        localStorage.setItem('expense_tracker_remember', 'true');
      }

      return { success: true, user: user };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Register new user
  async register(userData) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { name, email, password } = userData;
      
      if (this.users[email.toLowerCase()]) {
        throw new Error('User already exists');
      }

      const newUser = {
        id: 'user-' + Date.now(),
        name: name,
        email: email.toLowerCase(),
        password: this.hashPassword(password),
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      this.users[email.toLowerCase()] = newUser;
      this.saveUsers(this.users);

      return { success: true, user: newUser };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Update user profile
  async updateProfile(userId, updates) {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find user by ID
      const userEmail = Object.keys(this.users).find(email => 
        this.users[email].id === userId
      );
      
      if (!userEmail) {
        throw new Error('User not found');
      }
      
      // Update user data
      const user = this.users[userEmail];
      if (updates.name) user.name = updates.name;
      if (updates.email && updates.email !== userEmail) {
        // Handle email change (would need more complex logic in production)
        const newEmail = updates.email.toLowerCase();
        if (this.users[newEmail]) {
          throw new Error('Email already exists');
        }
        // Move user to new email key
        this.users[newEmail] = { ...user, email: newEmail };
        delete this.users[userEmail];
        userEmail = newEmail;
      }
      
      this.saveUsers(this.users);
      
      // Update current session
      this.createSession(user);
      this.currentUser = user;
      
      return { success: true, user: user };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find user by ID
      const userEmail = Object.keys(this.users).find(email => 
        this.users[email].id === userId
      );
      
      if (!userEmail) {
        throw new Error('User not found');
      }
      
      const user = this.users[userEmail];
      
      // Verify current password
      if (!this.verifyPassword(currentPassword, user.password)) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      user.password = this.hashPassword(newPassword);
      this.saveUsers(this.users);
      
      return { success: true };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Session management methods
  getAllSessions() {
    // In a real app, this would fetch from server
    const sessions = localStorage.getItem('expense_tracker_sessions');
    if (!sessions) {
      const defaultSessions = [{
        id: 'current',
        userId: this.currentUser?.id,
        device: 'Current Session',
        browser: this.getBrowserInfo(),
        location: 'Unknown',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isActive: true
      }];
      localStorage.setItem('expense_tracker_sessions', JSON.stringify(defaultSessions));
      return defaultSessions;
    }
    return JSON.parse(sessions);
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  revokeSession(sessionId) {
    const sessions = this.getAllSessions();
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    localStorage.setItem('expense_tracker_sessions', JSON.stringify(updatedSessions));
    return true;
  }

  revokeAllSessions() {
    localStorage.removeItem('expense_tracker_sessions');
    localStorage.removeItem('expense_tracker_session');
    return true;
  }

  // Privacy and data management
  exportUserData() {
    if (!this.currentUser) return null;
    
    return {
      user: {
        id: this.currentUser.id,
        name: this.currentUser.name,
        email: this.currentUser.email,
        createdAt: this.currentUser.createdAt,
        lastLogin: this.currentUser.lastLogin
      },
      sessions: this.getAllSessions().filter(s => s.userId === this.currentUser.id),
      exportDate: new Date().toISOString()
    };
  }

  deleteUserData(userId) {
    // Remove user from users list
    const userEmail = Object.keys(this.users).find(email => 
      this.users[email].id === userId
    );
    
    if (userEmail) {
      delete this.users[userEmail];
      this.saveUsers(this.users);
    }

    // Clear all user-related data from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes(userId)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessions
    this.revokeAllSessions();
    
    return true;
  }

  // Logout user
  logout() {
    localStorage.removeItem('expense_tracker_session');
    localStorage.removeItem('expense_tracker_remember');
    this.currentUser = null;
    window.location.href = 'login.html';
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Protect routes (redirect to login if not authenticated)
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // Initialize authentication system
  initializeAuth() {
    // Initialize social login APIs
    this.initializeSocialAPIs();
    
    // Check if we're on login page
    if (window.location.pathname.includes('login.html')) {
      // If already logged in, redirect to main app
      if (this.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
      }
      this.initializeLoginPage();
    } else {
      // Protect main app
      this.requireAuth();
    }
  }

  // Initialize Social Login APIs
  initializeSocialAPIs() {
    // Initialize Facebook SDK
    window.fbAsyncInit = () => {
      FB.init({
        appId: OAUTH_CONFIG.facebook.appId, // Use config
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      
      FB.AppEvents.logPageView();
      console.log('Facebook SDK initialized');
    };

    // Initialize Google API when the page loads
    window.addEventListener('load', () => {
      if (typeof google !== 'undefined') {
        console.log('Google API loaded');
        // Update the client ID from config if available
        const googleOnload = document.getElementById('g_id_onload');
        if (googleOnload && OAUTH_CONFIG.google.clientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
          googleOnload.setAttribute('data-client_id', OAUTH_CONFIG.google.clientId);
        }
      }
    });
  }

  // Handle Google Login Response
  async handleGoogleLogin(response) {
    console.log('Processing Google login response...');
    try {
      // Check if we're in direct OAuth mode
      const isDirectMode = this.isDirectOAuthMode();
      
      if (!response || !response.credential) {
        if (isDirectMode) {
          throw new Error('No credential received from Google');
        } else {
          console.log('No credential - using demo mode');
          await this.demoSocialLogin('google');
          return;
        }
      }
      
      console.log('Google login response:', response);
      
      // Decode the JWT token to get user information
      const payload = this.parseJwt(response.credential);
      console.log('Google user data:', payload);
      
      if (!payload.email) {
        throw new Error('No email received from Google');
      }
      
      const userData = {
        id: 'google-' + payload.sub,
        name: payload.name || 'Google User',
        email: payload.email,
        picture: payload.picture,
        provider: 'google'
      };
      
      this.showNotification('Processing Google login...', 'info');
      
      // Create or update user in our system
      await this.socialLogin(userData);
      
    } catch (error) {
      console.error('Google login error:', error);
      this.showNotification('Google login failed: ' + error.message, 'error');
      
      // Only fallback to demo if not in direct mode
      if (!this.isDirectOAuthMode()) {
        console.log('Falling back to Google demo login');
        await this.demoSocialLogin('google');
      }
    }
  }

  // Handle Facebook Login
  async handleFacebookLogin() {
    return new Promise((resolve, reject) => {
      FB.login((response) => {
        if (response.authResponse) {
          console.log('Facebook login response:', response);
          
          // Get user information
          FB.api('/me', { fields: 'name,email,picture' }, async (userInfo) => {
            try {
              console.log('Facebook user data:', userInfo);
              
              const userData = {
                id: 'facebook-' + userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                picture: userInfo.picture?.data?.url,
                provider: 'facebook'
              };
              
              await this.socialLogin(userData);
              resolve(userData);
              
            } catch (error) {
              console.error('Facebook user data error:', error);
              this.showNotification('Facebook login failed: ' + error.message, 'error');
              reject(error);
            }
          });
        } else {
          console.log('Facebook login cancelled');
          this.showNotification('Facebook login was cancelled', 'info');
          reject(new Error('Login cancelled'));
        }
      }, { scope: 'email' });
    });
  }

  // Handle social login (Google/Facebook)
  async socialLogin(userData) {
    try {
      // Check if user already exists
      let existingUser = this.users[userData.email?.toLowerCase()];
      
      if (existingUser) {
        // Update existing user with social data
        existingUser.name = userData.name;
        existingUser.picture = userData.picture;
        existingUser.provider = userData.provider;
        existingUser.lastLogin = new Date().toISOString();
      } else {
        // Create new user
        existingUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email?.toLowerCase() || `${userData.provider}_user_${Date.now()}@temp.com`,
          password: null, // Social login users don't have passwords
          picture: userData.picture,
          provider: userData.provider,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        
        this.users[existingUser.email] = existingUser;
      }
      
      this.saveUsers(this.users);
      this.createSession(existingUser);
      this.currentUser = existingUser;
      
      this.showNotification(`Welcome ${userData.name}! Redirecting...`, 'success');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
      
      return { success: true, user: existingUser };
      
    } catch (error) {
      throw new Error('Social login failed: ' + error.message);
    }
  }

  // Parse JWT token
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Demo social login for testing
  async demoSocialLogin(provider) {
    const demoUsers = {
      google: {
        id: 'google-demo-123',
        name: 'Demo Google User',
        email: 'demo.google@example.com',
        picture: 'https://via.placeholder.com/150x150/4285f4/ffffff?text=G',
        provider: 'google'
      },
      facebook: {
        id: 'facebook-demo-123',
        name: 'Demo Facebook User',
        email: 'demo.facebook@example.com',
        picture: 'https://via.placeholder.com/150x150/1877f2/ffffff?text=F',
        provider: 'facebook'
      }
    };

    try {
      console.log(`Starting ${provider} demo login...`);
      this.showNotification(`Signing in with ${provider} (Demo Mode)...`, 'info');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.socialLogin(demoUsers[provider]);
    } catch (error) {
      console.error('Demo login error:', error);
      this.showNotification('Demo login failed: ' + error.message, 'error');
    }
  }

  // Initialize login page functionality
  initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    const createAccountLink = document.getElementById('createAccount');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    const googleLoginBtn = document.getElementById('googleLogin');
    const facebookLoginBtn = document.getElementById('facebookLogin');

    // Auto-fill demo credentials
    document.getElementById('email').value = 'demo@expense.com';
    document.getElementById('password').value = 'demo123';

    // Login form submission
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        this.showLoading(true);

        try {
          await this.login(email, password, rememberMe);
          this.showNotification('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        } catch (error) {
          this.showNotification(error.message, 'error');
        } finally {
          this.showLoading(false);
        }
      });
    }

    // Registration form submission
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (password !== confirmPassword) {
          this.showNotification('Passwords do not match', 'error');
          return;
        }

        try {
          await this.register({ name, email, password });
          this.showNotification('Account created successfully! Please login.', 'success');
          bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
          document.getElementById('email').value = email;
          registerForm.reset();
        } catch (error) {
          this.showNotification(error.message, 'error');
        }
      });
    }

    // Forgot password form
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        
        // Simulate sending reset email
        this.showNotification('Password reset link sent to ' + email, 'success');
        bootstrap.Modal.getInstance(document.getElementById('forgotModal')).hide();
        forgotForm.reset();
      });
    }

    // Modal triggers
    if (createAccountLink) {
      createAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        new bootstrap.Modal(document.getElementById('registerModal')).show();
      });
    }

    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        new bootstrap.Modal(document.getElementById('forgotModal')).show();
      });
    }

    // Initialize OAuth mode on page load
    this.initializeOAuthMode();

    // Social login buttons
    this.initializeSocialButtons();

    // OAuth toggle
    const toggleOAuthBtn = document.getElementById('toggleRealOAuth');
    if (toggleOAuthBtn) {
      toggleOAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleOAuthMode();
      });
    }

    // Facebook button - default to demo mode
    if (facebookLoginBtn) {
      facebookLoginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        this.showLoading(true);
        try {
          if (typeof FB !== 'undefined' && FB.getLoginStatus && OAUTH_CONFIG.facebook.appId !== 'YOUR_FACEBOOK_APP_ID') {
            // Real Facebook OAuth is configured
            await this.handleFacebookLogin();
          } else {
            // Use demo mode
            console.log('Using Facebook demo mode');
            await this.demoSocialLogin('facebook');
          }
        } catch (error) {
          console.error('Facebook login error:', error);
          this.showNotification('Facebook login failed, using demo mode', 'warning');
          await this.demoSocialLogin('facebook');
        } finally {
          this.showLoading(false);
        }
      });
    }

    // Toggle real OAuth functionality
    const toggleRealOAuth = document.getElementById('toggleRealOAuth');
    if (toggleRealOAuth) {
      toggleRealOAuth.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleOAuthMode();
      });
    }

    // Add timeout check for Google API
    setTimeout(() => {
      if (typeof google === 'undefined') {
        console.log('Google API not loaded after timeout - using demo mode');
      }
    }, 5000);
  }

  // Initialize OAuth mode based on stored preference
  initializeOAuthMode() {
    const mode = localStorage.getItem('oauth_mode') || 'demo';
    const googleContainer = document.getElementById('googleSignInContainer');
    const googleDemo = document.getElementById('googleLoginDemo');
    const facebookBtn = document.getElementById('facebookLogin');
    const toggleLink = document.getElementById('toggleRealOAuth');
    const statusMsg = document.getElementById('oauthModeStatus');
    
    if (googleContainer && googleDemo && toggleLink) {
      if (mode === 'direct' && this.isOAuthConfigured()) {
        // Direct OAuth mode
        googleContainer.style.display = 'block';
        googleDemo.style.display = 'none';
        toggleLink.textContent = 'Switch to Demo Mode';
        toggleLink.className = 'btn btn-sm btn-outline-secondary';
        
        // Update button text to indicate real OAuth
        this.updateButtonText(googleDemo, 'Continue with Google', false);
        this.updateButtonText(facebookBtn, 'Continue with Facebook', false);
        
        if (statusMsg) {
          statusMsg.textContent = 'Using real OAuth authentication';
        }
      } else {
        // Demo mode (default)
        googleContainer.style.display = 'none';
        googleDemo.style.display = 'flex';
        toggleLink.textContent = 'Enable Real OAuth (requires setup)';
        toggleLink.className = 'btn btn-sm btn-outline-primary';
        
        // Update button text to indicate demo mode
        this.updateButtonText(googleDemo, 'Continue with Google (Demo)', true);
        this.updateButtonText(facebookBtn, 'Continue with Facebook (Demo)', true);
        
        if (statusMsg) {
          statusMsg.textContent = 'Currently using demo authentication for testing';
        }
        localStorage.setItem('oauth_mode', 'demo');
      }
    }
  }

  // Update button text helper
  updateButtonText(button, text, isDemo) {
    if (!button) return;
    
    const textNode = button.querySelector('svg') ? 
      button.childNodes[button.childNodes.length - 1] : 
      button;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      textNode.textContent = text;
    } else {
      // Find text content and update it
      const walker = document.createTreeWalker(
        button,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode = walker.nextNode();
      while (textNode) {
        if (textNode.textContent.trim()) {
          textNode.textContent = text;
          break;
        }
        textNode = walker.nextNode();
      }
    }
  }

  // Initialize social login buttons
  initializeSocialButtons() {
    // Google demo button
    const googleLoginDemo = document.getElementById('googleLoginDemo');
    if (googleLoginDemo) {
      googleLoginDemo.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleGoogleButtonClick();
      });
    }

    // Facebook button
    const facebookLoginBtn = document.getElementById('facebookLogin');
    if (facebookLoginBtn) {
      facebookLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleFacebookButtonClick();
      });
    }
  }

  // Handle Google button click (demo or direct)
  async handleGoogleButtonClick() {
    try {
      const isDirectMode = this.isDirectOAuthMode();
      const googleDemo = document.getElementById('googleLoginDemo');
      
      if (isDirectMode) {
        // In direct mode, update button text and trigger real Google OAuth
        if (googleDemo) {
          const originalText = googleDemo.innerHTML;
          googleDemo.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              Connecting to Google...
            </div>
          `;
          
          // Reset button after timeout
          setTimeout(() => {
            googleDemo.innerHTML = originalText;
          }, 3000);
        }
        
        this.showNotification('Connecting to Google OAuth...', 'info');
        // The actual Google sign-in will be handled by Google's library
        // This is just feedback for the user
      } else {
        // Demo mode
        if (googleDemo) {
          const originalText = googleDemo.innerHTML;
          googleDemo.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              Demo Login...
            </div>
          `;
          
          setTimeout(async () => {
            try {
              await this.demoSocialLogin('google');
            } finally {
              googleDemo.innerHTML = originalText;
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Google button click error:', error);
      this.showNotification('Google login failed: ' + error.message, 'error');
    }
  }

  // Handle Facebook button click (demo or direct)
  async handleFacebookButtonClick() {
    try {
      const isDirectMode = this.isDirectOAuthMode();
      const facebookBtn = document.getElementById('facebookLogin');
      
      if (isDirectMode) {
        // In direct mode, trigger real Facebook login
        if (facebookBtn) {
          const originalText = facebookBtn.innerHTML;
          facebookBtn.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              Connecting to Facebook...
            </div>
          `;
          
          setTimeout(() => {
            facebookBtn.innerHTML = originalText;
          }, 3000);
        }
        
        this.showNotification('Connecting to Facebook...', 'info');
        await this.handleFacebookLogin();
      } else {
        // Demo mode
        if (facebookBtn) {
          const originalText = facebookBtn.innerHTML;
          facebookBtn.innerHTML = `
            <div class="d-flex align-items-center justify-content-center">
              <div class="spinner-border spinner-border-sm me-2" role="status"></div>
              Demo Login...
            </div>
          `;
          
          setTimeout(async () => {
            try {
              await this.demoSocialLogin('facebook');
            } finally {
              facebookBtn.innerHTML = originalText;
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Facebook button click error:', error);
      this.showNotification('Facebook login failed: ' + error.message, 'error');
    }
  }

  // Check if OAuth is properly configured
  isOAuthConfigured() {
    return OAUTH_CONFIG.google.clientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' ||
           OAUTH_CONFIG.facebook.appId !== 'YOUR_FACEBOOK_APP_ID';
  }

  // Toggle between demo and real OAuth
  toggleOAuthMode() {
    const googleContainer = document.getElementById('googleSignInContainer');
    const googleDemo = document.getElementById('googleLoginDemo');
    const facebookBtn = document.getElementById('facebookLogin');
    const toggleLink = document.getElementById('toggleRealOAuth');
    const statusMsg = document.getElementById('oauthModeStatus');
    
    if (googleContainer && googleDemo && toggleLink) {
      const currentMode = localStorage.getItem('oauth_mode') || 'demo';
      
      if (currentMode === 'demo') {
        // Switch to direct mode
        if (!this.isOAuthConfigured()) {
          this.showNotification('Please configure OAuth credentials first. See OAUTH_SETUP.md', 'warning');
          return;
        }
        localStorage.setItem('oauth_mode', 'direct');
        googleContainer.style.display = 'block';
        googleDemo.style.display = 'none';
        toggleLink.textContent = 'Switch to Demo Mode';
        toggleLink.className = 'btn btn-sm btn-outline-secondary';
        
        // Update button text to indicate real OAuth
        this.updateButtonText(googleDemo, 'Continue with Google', false);
        this.updateButtonText(facebookBtn, 'Continue with Facebook', false);
        
        if (statusMsg) {
          statusMsg.textContent = 'Using real OAuth authentication';
        }
        this.showNotification('Switched to direct OAuth mode', 'success');
      } else {
        // Switch to demo mode
        localStorage.setItem('oauth_mode', 'demo');
        googleContainer.style.display = 'none';
        googleDemo.style.display = 'flex';
        toggleLink.textContent = 'Enable Real OAuth (requires setup)';
        toggleLink.className = 'btn btn-sm btn-outline-primary';
        
        // Update button text to indicate demo mode
        this.updateButtonText(googleDemo, 'Continue with Google (Demo)', true);
        this.updateButtonText(facebookBtn, 'Continue with Facebook (Demo)', true);
        
        if (statusMsg) {
          statusMsg.textContent = 'Currently using demo authentication for testing';
        }
        this.showNotification('Switched to demo mode', 'info');
      }
    }
  }

  // Show loading state
  showLoading(show) {
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.loading-spinner');
    const submitBtn = document.querySelector('button[type="submit"]');

    if (show) {
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';
      submitBtn.disabled = true;
    } else {
      btnText.style.display = 'inline';
      spinner.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} notification fade-in`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Get user data for main app
  getUserData() {
    return this.currentUser;
  }
}

// Initialize authentication system
const auth = new AuthSystem();

// Global function for Google login callback - ensure it's accessible
window.handleGoogleLogin = function(response) {
  console.log('Google login callback triggered:', response);
  try {
    auth.handleGoogleLogin(response);
  } catch (error) {
    console.error('Error in Google login callback:', error);
    auth.showNotification('Google login failed: ' + error.message, 'error');
  }
};

// Export for use in main app
window.auth = auth;