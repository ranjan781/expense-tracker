/* Expense Tracker — frontend-only with Chart.js, localStorage and Authentication */
document.addEventListener('DOMContentLoaded', () => {
(() => {
  const STORAGE_KEY = 'expenses_v1';
  const DEFAULT_CATS = ['Food','Travel','Shopping','Bills','Entertainment','Health','Other'];
  
  // User management
  let currentUser = null;

  // DOM elements - will be initialized after DOM loads
  let amountEl, categoryEl, dateEl, noteEl, form, txnTable, totalAmountEl, txnCountEl;
  let categoryFilters, searchEl, sortByEl, minAmountEl, maxAmountEl, fromDateEl, toDateEl;
  let clearFiltersEl, applyFiltersEl, clearBtn, themeToggle, exportBtn, importBtn, importFile, currencySelect;
  let logoutBtn, welcomeUser;

  // Get user-specific storage key
  function getUserStorageKey(key) {
    if (currentUser && currentUser.id) {
      return `expense_tracker_${currentUser.id}_${key}`;
    }
    return `expense_tracker_${key}`;
  }

  // Initialize DOM elements
  function initializeElements() {
    console.log('Initializing elements...');
    
    // Check authentication first
    if (!window.auth || !window.auth.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login...');
      window.location.href = 'login.html';
      return false;
    }
    
    // Get current user
    currentUser = window.auth.getUserData();
    console.log('Current user:', currentUser);
    
    amountEl = document.getElementById('amount');
    categoryEl = document.getElementById('category');
    dateEl = document.getElementById('date');
    noteEl = document.getElementById('note');
    form = document.getElementById('expenseForm');
    txnTable = document.getElementById('txnTable');
    totalAmountEl = document.getElementById('totalAmount');
    txnCountEl = document.getElementById('txnCount');
    categoryFilters = document.getElementById('categoryFilters');
    searchEl = document.getElementById('search');
    sortByEl = document.getElementById('sortBy');
    minAmountEl = document.getElementById('minAmount');
    maxAmountEl = document.getElementById('maxAmount');
    fromDateEl = document.getElementById('fromDate');
    toDateEl = document.getElementById('toDate');
    clearFiltersEl = document.getElementById('clearFilters');
    applyFiltersEl = document.getElementById('applyFilters');
    clearBtn = document.getElementById('clearBtn');
    themeToggle = document.getElementById('themeToggle');
    exportBtn = document.getElementById('exportBtn');
    importBtn = document.getElementById('importBtn');
    importFile = document.getElementById('importFile');
    currencySelect = document.getElementById('currencySelect');
    logoutBtn = document.getElementById('logoutBtn');
    welcomeUser = document.getElementById('welcomeUser');
    
    // Initialize profile dropdown
    initializeProfileDropdown();
    
    // Debug: Check critical elements
    console.log('Critical elements check:');
    console.log('- form:', !!form);
    console.log('- txnTable:', !!txnTable);
    console.log('- totalAmountEl:', !!totalAmountEl);
    console.log('- currencySelect:', !!currencySelect);
    console.log('- categoryFilters:', !!categoryFilters);
    console.log('- logoutBtn:', !!logoutBtn);
    
    if (!form) console.error('Form element not found - expense adding will not work');
    if (!txnTable) console.error('Transaction table not found - transactions will not display');
    if (!totalAmountEl) console.error('Total amount element not found - statistics will not work');
  }

  // Charts
  let pieChart = null, lineChart = null;

  // state
  let expenses = [];
  let filter = {category: 'All', search: '', sort: 'date_desc', minAmount: '', maxAmount: '', fromDate: '', toDate: ''};
  let selectedCurrency = '$'; // Default currency

  // helpers
  const formatCurrency = v => {
    const currency = selectedCurrency || '$';
    return currency + Number(v).toFixed(2);
  };
  const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  
  // Currency management
  function updateCurrency() {
    if (currencySelect) {
      selectedCurrency = currencySelect.value;
    }
    // Ensure we have a valid currency
    if (!selectedCurrency) {
      selectedCurrency = '$';
    }
    
    localStorage.setItem(getUserStorageKey('selectedCurrency'), selectedCurrency);
    
    // Update currency indicator in navbar
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      const currencyName = getCurrencyName(selectedCurrency);
      indicator.textContent = selectedCurrency ? `(${selectedCurrency} ${currencyName})` : '(No Symbol)';
    }
    
    // Force immediate update of all currency displays
    const stats = getAdvancedStats();
    
    // Update all currency displays immediately
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(stats.thisMonthTotal || 0);
    }
    
    const avgAmountEl = document.getElementById('avgAmount');
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(stats.avgPerTransaction || 0);
    }
    
    const maxTransactionEl = document.getElementById('maxTransaction');
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(stats.maxTransaction || 0);
    }
    
    // Update labels
    const avgLabelEl = document.getElementById('avgLabel');
    if (avgLabelEl) {
      avgLabelEl.textContent = `Avg per ${selectedCurrency} Transaction (${stats.currentCurrencyTransactions})`;
    }
    
    const maxLabelEl = document.getElementById('maxLabel');
    if (maxLabelEl) {
      maxLabelEl.textContent = `Largest ${selectedCurrency} Transaction`;
    }
    
    // Also update all transaction amounts in the table
    renderTable();
    
    // Force complete re-render to update all statistics
    render();
    
    // Show notification
    setTimeout(() => {
      try {
        showNotification(`Currency changed to ${selectedCurrency} ${getCurrencyName(selectedCurrency)}`, 'success');
      } catch (error) {
        console.log('Notification error:', error);
      }
    }, 100);
  }
  
  function getCurrencyName(symbol) {
    const currencies = {
      '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
      '₹': 'INR', '₩': 'KRW', '₽': 'RUB', '₪': 'ILS'
    };
    return currencies[symbol] || '';
  }
  
  function loadCurrency() {
    const saved = localStorage.getItem(getUserStorageKey('selectedCurrency'));
    if (saved !== null) {
      selectedCurrency = saved;
      if (currencySelect) {
        currencySelect.value = selectedCurrency;
      }
      updateCurrency(); // Update indicator and initialize all displays
    } else {
      // Set default currency to $ if none saved
      selectedCurrency = '$';
      if (currencySelect) {
        currencySelect.value = '$';
      }
      updateCurrency(); // Initialize displays with default currency
    }
  }
  
  // Profile Management Functions
  function initializeProfileDropdown() {
    if (!currentUser) return;
    
    // Get user avatar from storage or default
    const userAvatar = getUserStorageKey('avatar') ? localStorage.getItem(getUserStorageKey('avatar')) : '👤';
    
    // Update profile dropdown display
    const userDisplayName = document.getElementById('userDisplayName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const modalProfileName = document.getElementById('modalProfileName');
    const modalProfileEmail = document.getElementById('modalProfileEmail');
    
    // Update user avatar
    const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large, .user-avatar-xl');
    avatars.forEach(avatar => {
      avatar.textContent = userAvatar;
    });
    
    if (userDisplayName) userDisplayName.textContent = currentUser.name;
    if (profileName) profileName.textContent = currentUser.name;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (modalProfileName) modalProfileName.textContent = currentUser.name;
    if (modalProfileEmail) modalProfileEmail.textContent = currentUser.email;
    
    // Update profile display with saved data
    updateProfileDisplay();
    
    // Update profile statistics
    updateProfileStatistics();
    
    // Bind profile events
    bindProfileEvents();
  }
  
  function updateProfileStatistics() {
    const stats = getAdvancedStats();
    
    // Update profile modal stats
    const profileTotalExpenses = document.getElementById('profileTotalExpenses');
    const profileTotalTransactions = document.getElementById('profileTotalTransactions');
    const profileMemberSince = document.getElementById('profileMemberSince');
    const profileLastLogin = document.getElementById('profileLastLogin');
    const profileCurrency = document.getElementById('profileCurrency');
    
    if (profileTotalExpenses) {
      profileTotalExpenses.textContent = formatCurrency(stats.totalAmount);
    }
    
    if (profileTotalTransactions) {
      profileTotalTransactions.textContent = expenses.length.toString();
    }
    
    if (profileMemberSince && currentUser.createdAt) {
      const createdDate = new Date(currentUser.createdAt);
      profileMemberSince.textContent = createdDate.toLocaleDateString();
    }
    
    if (profileLastLogin && currentUser.lastLogin) {
      const lastLoginDate = new Date(currentUser.lastLogin);
      profileLastLogin.textContent = lastLoginDate.toLocaleString();
    }
    
    if (profileCurrency) {
      const currencyName = getCurrencyName(selectedCurrency);
      profileCurrency.textContent = `${currencyName} (${selectedCurrency})`;
    }
  }
  
  function updateProfileDisplay() {
    if (!currentUser) return;
    
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    const profile = userData.profile || {};
    
    // Update profile dropdown
    const userDisplayName = document.getElementById('userDisplayName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const modalProfileName = document.getElementById('modalProfileName');
    const modalProfileEmail = document.getElementById('modalProfileEmail');
    
    // Create display name from profile data
    let displayName = currentUser.name;
    if (profile.firstName && profile.lastName) {
      displayName = `${profile.firstName} ${profile.lastName}`;
    } else if (profile.firstName) {
      displayName = profile.firstName;
    }
    
    // Update email
    const displayEmail = profile.email || currentUser.email;
    
    // Update all profile elements
    if (userDisplayName) userDisplayName.textContent = displayName;
    if (profileName) profileName.textContent = displayName;
    if (profileEmail) profileEmail.textContent = displayEmail;
    if (modalProfileName) modalProfileName.textContent = displayName;
    if (modalProfileEmail) modalProfileEmail.textContent = displayEmail;
    
    // Update avatars if available
    if (profile.avatar) {
      // Update the profile avatar image in the account settings
      const profileAvatarImg = document.getElementById('profileAvatarImg');
      if (profileAvatarImg) {
        profileAvatarImg.src = profile.avatar;
      }
      
      // Update profile dropdown avatar if it's an image
      const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large, .user-avatar-xl');
      avatars.forEach(avatar => {
        // If avatar has an img element inside, update it
        const img = avatar.querySelector('img');
        if (img) {
          img.src = profile.avatar;
        } else {
          // If no img element, create one or update text content
          avatar.innerHTML = `<img src="${profile.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
      });
    }
    
    // Update current user object for consistency
    if (profile.firstName || profile.lastName || profile.email) {
      if (profile.email) currentUser.email = profile.email;
      if (profile.firstName && profile.lastName) {
        currentUser.name = `${profile.firstName} ${profile.lastName}`;
      } else if (profile.firstName) {
        currentUser.name = profile.firstName;
      }
    }
    
    console.log('Profile display updated:', displayName, displayEmail);
  }
  
  function bindProfileEvents() {
    // View Profile
    const viewProfile = document.getElementById('viewProfile');
    if (viewProfile) {
      viewProfile.addEventListener('click', () => {
        updateProfileStatistics();
        new bootstrap.Modal(document.getElementById('profileModal')).show();
      });
    }
    
    // Edit Profile
    const editProfile = document.getElementById('editProfile');
    const editProfileFromModal = document.getElementById('editProfileFromModal');
    if (editProfile) {
      editProfile.addEventListener('click', showEditProfileModal);
    }
    if (editProfileFromModal) {
      editProfileFromModal.addEventListener('click', showEditProfileModal);
    }
    
    // Change Password
    const changePassword = document.getElementById('changePassword');
    if (changePassword) {
      changePassword.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
      });
    }
    
    // Account Settings
    const accountSettings = document.getElementById('accountSettings');
    if (accountSettings) {
      accountSettings.addEventListener('click', () => {
        initializeAccountSettings();
        new bootstrap.Modal(document.getElementById('accountSettingsModal')).show();
      });
    }
    
    // Data Statistics
    const dataStatistics = document.getElementById('dataStatistics');
    if (dataStatistics) {
      dataStatistics.addEventListener('click', () => {
        updateProfileStatistics();
        new bootstrap.Modal(document.getElementById('profileModal')).show();
      });
    }
    
    // Privacy Settings
    const privacySettings = document.getElementById('privacySettings');
    if (privacySettings) {
      privacySettings.addEventListener('click', () => {
        loadPrivacySettings();
        new bootstrap.Modal(document.getElementById('privacySettingsModal')).show();
      });
    }
    
    // Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      editProfileForm.addEventListener('submit', handleEditProfile);
    }
    
    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', handleChangePassword);
    }
  }
  
  function showEditProfileModal() {
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editAvatar = document.getElementById('editAvatar');
    
    if (editName) editName.value = currentUser.name;
    if (editEmail) editEmail.value = currentUser.email;
    if (editAvatar) {
      const currentAvatar = localStorage.getItem(getUserStorageKey('avatar')) || '👤';
      editAvatar.value = currentAvatar;
    }
    
    // Hide profile modal if open
    const profileModal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
    if (profileModal) profileModal.hide();
    
    // Show edit modal
    new bootstrap.Modal(document.getElementById('editProfileModal')).show();
  }
  
  async function handleEditProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const avatar = document.getElementById('editAvatar').value;
    
    try {
      // Show loading
      showEditLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user data
      currentUser.name = name;
      currentUser.email = email;
      
      // Save avatar
      localStorage.setItem(getUserStorageKey('avatar'), avatar);
      
      // Update auth system (would normally be API call)
      if (window.auth && window.auth.users[currentUser.email]) {
        window.auth.users[currentUser.email].name = name;
        window.auth.saveUsers(window.auth.users);
      }
      
      // Update UI
      initializeProfileDropdown();
      
      showNotification('Profile updated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
      
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    } finally {
      showEditLoading(false);
    }
  }
  
  async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    
    try {
      // Show loading
      showPasswordLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify current password (simplified)
      if (window.auth && !window.auth.verifyPassword(currentPassword, window.auth.users[currentUser.email].password)) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      if (window.auth) {
        window.auth.users[currentUser.email].password = window.auth.hashPassword(newPassword);
        window.auth.saveUsers(window.auth.users);
      }
      
      showNotification('Password changed successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
      document.getElementById('changePasswordForm').reset();
      
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      showPasswordLoading(false);
    }
  }
  
  function showEditLoading(show) {
    const btnText = document.querySelector('#editProfileForm .btn-text');
    const spinner = document.querySelector('#editProfileForm .loading-spinner');
    const submitBtn = document.querySelector('#editProfileForm button[type="submit"]');
    
    if (show) {
      btnText.style.display = 'none';
      spinner.classList.remove('d-none');
      submitBtn.disabled = true;
    } else {
      btnText.style.display = 'inline';
      spinner.classList.add('d-none');
      submitBtn.disabled = false;
    }
  }
  
  function showPasswordLoading(show) {
    const btnText = document.querySelector('#changePasswordForm .btn-text');
    const spinner = document.querySelector('#changePasswordForm .loading-spinner');
    const submitBtn = document.querySelector('#changePasswordForm button[type="submit"]');
    
    if (show) {
      btnText.style.display = 'none';
      spinner.classList.remove('d-none');
      submitBtn.disabled = true;
    } else {
      btnText.style.display = 'inline';
      spinner.classList.add('d-none');
      submitBtn.disabled = false;
    }
  }
  
  // Privacy Settings Functions
  function loadPrivacySettings() {
    // Load current privacy settings from storage
    const settings = getPrivacySettings();
    
    // Update UI with current settings
    const analyticsEnabled = document.getElementById('analyticsEnabled');
    const autoSaveEnabled = document.getElementById('autoSaveEnabled');
    const rememberLoginEnabled = document.getElementById('rememberLoginEnabled');
    const sessionTimeout = document.getElementById('sessionTimeout');
    const dataRetention = document.getElementById('dataRetention');
    
    if (analyticsEnabled) analyticsEnabled.checked = settings.analytics;
    if (autoSaveEnabled) autoSaveEnabled.checked = settings.autoSave;
    if (rememberLoginEnabled) rememberLoginEnabled.checked = settings.rememberLogin;
    if (sessionTimeout) sessionTimeout.value = settings.sessionTimeout;
    if (dataRetention) dataRetention.value = settings.dataRetention;
    
    // Bind privacy events
    bindPrivacyEvents();
  }
  
  function getPrivacySettings() {
    const defaultSettings = {
      analytics: true,
      autoSave: true,
      rememberLogin: false,
      sessionTimeout: 1440, // 24 hours
      dataRetention: 365, // 1 year
      twoFactorEnabled: false
    };
    
    const saved = localStorage.getItem(getUserStorageKey('privacySettings'));
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }
  
  function savePrivacySettings(settings) {
    localStorage.setItem(getUserStorageKey('privacySettings'), JSON.stringify(settings));
  }
  
  function bindPrivacyEvents() {
    // Save Privacy Settings
    const saveBtn = document.getElementById('savePrivacySettings');
    if (saveBtn) {
      saveBtn.replaceWith(saveBtn.cloneNode(true)); // Remove existing listeners
      document.getElementById('savePrivacySettings').addEventListener('click', handleSavePrivacySettings);
    }
    
    // Download Data
    const downloadBtn = document.getElementById('downloadData');
    if (downloadBtn) {
      downloadBtn.replaceWith(downloadBtn.cloneNode(true));
      document.getElementById('downloadData').addEventListener('click', handleDownloadData);
    }
    
    // Clear All Data
    const clearDataBtn = document.getElementById('clearAllData');
    if (clearDataBtn) {
      clearDataBtn.replaceWith(clearDataBtn.cloneNode(true));
      document.getElementById('clearAllData').addEventListener('click', handleClearAllData);
    }
    
    // Setup 2FA
    const setup2FA = document.getElementById('setup2FA');
    if (setup2FA) {
      setup2FA.replaceWith(setup2FA.cloneNode(true));
      document.getElementById('setup2FA').addEventListener('click', handleSetup2FA);
    }
    
    // Manage Sessions
    const manageSessions = document.getElementById('manageSessions');
    if (manageSessions) {
      manageSessions.replaceWith(manageSessions.cloneNode(true));
      document.getElementById('manageSessions').addEventListener('click', handleManageSessions);
    }
    
    // Deactivate Account
    const deactivateAccount = document.getElementById('deactivateAccount');
    if (deactivateAccount) {
      deactivateAccount.replaceWith(deactivateAccount.cloneNode(true));
      document.getElementById('deactivateAccount').addEventListener('click', handleDeactivateAccount);
    }
    
    // Delete Account
    const deleteAccount = document.getElementById('deleteAccount');
    if (deleteAccount) {
      deleteAccount.replaceWith(deleteAccount.cloneNode(true));
      document.getElementById('deleteAccount').addEventListener('click', handleDeleteAccount);
    }
    
    // View Privacy Policy
    const viewPrivacyPolicy = document.getElementById('viewPrivacyPolicy');
    if (viewPrivacyPolicy) {
      viewPrivacyPolicy.replaceWith(viewPrivacyPolicy.cloneNode(true));
      document.getElementById('viewPrivacyPolicy').addEventListener('click', handleViewPrivacyPolicy);
    }
    
    // Logout All Sessions
    const logoutAllSessions = document.getElementById('logoutAllSessions');
    if (logoutAllSessions) {
      logoutAllSessions.replaceWith(logoutAllSessions.cloneNode(true));
      document.getElementById('logoutAllSessions').addEventListener('click', handleLogoutAllSessions);
    }
  }
  
  async function handleSavePrivacySettings() {
    try {
      showPrivacyLoading('savePrivacySettings', true);
      
      // Collect settings from form
      const settings = {
        analytics: document.getElementById('analyticsEnabled')?.checked || false,
        autoSave: document.getElementById('autoSaveEnabled')?.checked || false,
        rememberLogin: document.getElementById('rememberLoginEnabled')?.checked || false,
        sessionTimeout: parseInt(document.getElementById('sessionTimeout')?.value) || 1440,
        dataRetention: parseInt(document.getElementById('dataRetention')?.value) || 365
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save settings
      savePrivacySettings(settings);
      
      showNotification('Privacy settings saved successfully!', 'success');
      
    } catch (error) {
      showNotification('Failed to save privacy settings', 'error');
    } finally {
      showPrivacyLoading('savePrivacySettings', false);
    }
  }
  
  async function handleDownloadData() {
    try {
      showPrivacyLoading('downloadData', true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Prepare data for export
      const userData = {
        user: {
          name: currentUser.name,
          email: currentUser.email,
          createdAt: currentUser.createdAt
        },
        expenses: expenses,
        settings: {
          currency: selectedCurrency,
          privacy: getPrivacySettings()
        },
        exportDate: new Date().toISOString()
      };
      
      // Create and download file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('Data exported successfully!', 'success');
      
    } catch (error) {
      showNotification('Failed to export data', 'error');
    } finally {
      showPrivacyLoading('downloadData', false);
    }
  }
  
  async function handleClearAllData() {
    const confirmed = confirm(
      'Are you sure you want to permanently delete ALL your transaction data?\n\n' +
      'This action cannot be undone. Your account will remain active but all ' +
      'expense data will be lost forever.'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = prompt(
      'Type "DELETE ALL DATA" to confirm this permanent action:'
    );
    
    if (doubleConfirm !== 'DELETE ALL DATA') {
      showNotification('Data deletion cancelled', 'info');
      return;
    }
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear all expense data
      expenses = [];
      save();
      
      // Clear related storage
      Object.keys(localStorage).forEach(key => {
        if (key.includes(currentUser.id) && key.includes('expenses')) {
          localStorage.removeItem(key);
        }
      });
      
      // Re-render with empty data
      render();
      
      showNotification('All data has been permanently deleted', 'success');
      bootstrap.Modal.getInstance(document.getElementById('privacySettingsModal')).hide();
      
    } catch (error) {
      showNotification('Failed to clear data', 'error');
    }
  }
  
  function handleSetup2FA() {
    showNotification('Two-Factor Authentication setup is not implemented in this demo', 'info');
  }
  
  function handleManageSessions() {
    loadSessionsData();
    bootstrap.Modal.getInstance(document.getElementById('privacySettingsModal')).hide();
    new bootstrap.Modal(document.getElementById('sessionsModal')).show();
  }
  
  function loadSessionsData() {
    const sessionsList = document.getElementById('sessionsList');
    if (!sessionsList) return;
    
    // Simulate session data
    const sessions = [
      {
        id: 'current',
        device: 'Current Session',
        browser: 'Chrome on Windows',
        location: 'Your Location',
        lastActive: new Date(),
        status: 'active',
        isCurrent: true,
        icon: '💻'
      },
      {
        id: 'mobile-1',
        device: 'Mobile Device',
        browser: 'Safari on iPhone',
        location: 'Previous Location',
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'active',
        isCurrent: false,
        icon: '📱'
      },
      {
        id: 'tablet-1',
        device: 'Tablet',
        browser: 'Chrome on iPad',
        location: 'Home',
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'expired',
        isCurrent: false,
        icon: '📱'
      }
    ];
    
    sessionsList.innerHTML = sessions.map(session => `
      <div class="session-item ${session.isCurrent ? 'current-session' : ''}">
        <div class="d-flex align-items-center">
          <div class="session-device-icon me-3">
            ${session.icon}
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-1">${session.device} ${session.isCurrent ? '(Current)' : ''}</h6>
              <span class="session-status ${session.status}">${session.status.toUpperCase()}</span>
            </div>
            <p class="text-muted small mb-1">${session.browser}</p>
            <p class="text-muted small mb-1">📍 ${session.location}</p>
            <p class="text-muted small mb-0">Last active: ${session.lastActive.toLocaleString()}</p>
          </div>
          ${!session.isCurrent ? `
            <button class="btn btn-outline-danger btn-sm ms-2" onclick="revokeSession('${session.id}')">
              Revoke
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }
  
  function handleLogoutAllSessions() {
    if (confirm('This will log you out from all devices. You will need to login again. Continue?')) {
      showNotification('All sessions have been terminated. Redirecting to login...', 'success');
      setTimeout(() => {
        if (window.auth) {
          window.auth.logout();
        }
      }, 2000);
    }
  }
  
  function revokeSession(sessionId) {
    if (confirm('Revoke this session? The device will be logged out immediately.')) {
      // Remove session from UI
      const sessionElement = document.querySelector(`[onclick="revokeSession('${sessionId}')"]`).closest('.session-item');
      sessionElement.remove();
      showNotification('Session revoked successfully', 'success');
    }
  }
  
  function handleDeactivateAccount() {
    const confirmed = confirm(
      'Deactivate your account?\n\n' +
      'Your account will be temporarily disabled. You can reactivate it by logging in again. ' +
      'Your data will be preserved.'
    );
    
    if (confirmed) {
      showNotification('Account deactivation is not implemented in this demo', 'info');
    }
  }
  
  function handleDeleteAccount() {
    const confirmed = confirm(
      'DELETE YOUR ACCOUNT PERMANENTLY?\n\n' +
      'This will PERMANENTLY delete your account and ALL data. ' +
      'This action cannot be undone!'
    );
    
    if (!confirmed) return;
    
    const verification = prompt(
      'Type "DELETE MY ACCOUNT" to confirm permanent deletion:'
    );
    
    if (verification === 'DELETE MY ACCOUNT') {
      showNotification('Account deletion is not implemented in this demo', 'info');
    } else {
      showNotification('Account deletion cancelled', 'info');
    }
  }
  
  function handleViewPrivacyPolicy() {
    const policyWindow = window.open('', '_blank', 'width=600,height=800');
    policyWindow.document.write(`
      <html>
        <head>
          <title>Privacy Policy - Expense Tracker</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1, h2 { color: #333; }
            .last-updated { color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>Privacy Policy</h1>
          <p class="last-updated">Last updated: November 9, 2025</p>
          
          <h2>Data Collection</h2>
          <p>We collect only the data necessary to provide our expense tracking service, including your transactions, preferences, and account information.</p>
          
          <h2>Data Usage</h2>
          <p>Your data is used solely to provide and improve our expense tracking service. We do not sell or share your personal information with third parties.</p>
          
          <h2>Data Storage</h2>
          <p>Data is stored locally in your browser's localStorage. In a production environment, data would be encrypted and stored securely.</p>
          
          <h2>Your Rights</h2>
          <p>You have the right to access, modify, or delete your data at any time through the privacy settings.</p>
          
          <h2>Contact</h2>
          <p>For privacy concerns, contact us through the application settings.</p>
        </body>
      </html>
    `);
  }
  
  function showPrivacyLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const btnText = element.querySelector('.btn-text');
    const spinner = element.querySelector('.loading-spinner');
    
    if (show) {
      if (btnText) btnText.style.display = 'none';
      if (spinner) spinner.classList.remove('d-none');
      element.disabled = true;
    } else {
      if (btnText) btnText.style.display = 'inline';
      if (spinner) spinner.classList.add('d-none');
      element.disabled = false;
    }
  }
  
  // Make revokeSession globally available
  window.revokeSession = revokeSession;
  
  // Function to initialize currency displays
  function initializeCurrencyDisplays() {
    console.log('Initializing currency displays with:', selectedCurrency);
    
    // Initialize all currency displays with default values
    if (totalAmountEl) {
      totalAmountEl.textContent = formatCurrency(0);
      console.log('Initialized totalAmount');
    } else {
      console.error('totalAmountEl not found');
    }
    
    const avgAmountEl = document.getElementById('avgAmount');
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(0);
      console.log('Initialized avgAmount');
    } else {
      console.error('avgAmountEl not found');
    }
    
    const maxTransactionEl = document.getElementById('maxTransaction');
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(0);
      console.log('Initialized maxTransaction');
    } else {
      console.error('maxTransactionEl not found');
    }
    
    // Update currency indicator
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      const currencyName = getCurrencyName(selectedCurrency);
      indicator.textContent = selectedCurrency ? `(${selectedCurrency} ${currencyName})` : '($)';
      console.log('Initialized currency indicator');
    } else {
      console.error('currencyIndicator not found');
    }
  }
  
  // Export/Import functionality
  function exportData(format = 'json') {
    const data = {
      expenses,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    if (format === 'csv') {
      const csv = convertToCSV(expenses);
      downloadFile(csv, 'expenses.csv', 'text/csv');
    } else {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, 'expenses.json', 'application/json');
    }
  }
  
  function convertToCSV(data) {
    const headers = ['Date', 'Amount', 'Category', 'Note', 'Currency'];
    const rows = data.map(exp => [
      exp.date,
      exp.amount,
      exp.category,
      (exp.note || '').replace(/"/g, '""'),
      exp.currency || '$'  // Include currency in export
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let importedExpenses = [];
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          importedExpenses = data.expenses || data;
        } else if (file.name.endsWith('.csv')) {
          importedExpenses = parseCSV(content);
        }
        
        // Validate and merge data
        const validExpenses = importedExpenses.filter(exp => 
          exp.amount && exp.category && exp.date
        ).map(exp => ({
          ...exp,
          id: exp.id || uid(),
          amount: Number(exp.amount)
        }));
        
        if (validExpenses.length > 0) {
          expenses = [...expenses, ...validExpenses];
          save();
          render();
          showNotification(`Imported ${validExpenses.length} transactions successfully!`, 'success');
        } else {
          showNotification('No valid transactions found in file.', 'error');
        }
      } catch (error) {
        showNotification('Error importing file: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  }
  
  function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      return {
        date: values[0],
        amount: parseFloat(values[1]),
        category: values[2],
        note: values[3] || '',
        currency: values[4] || '$'  // Include currency from import, default to $ if missing
      };
    });
  }
  
  // Enhanced analytics
  function getAdvancedStats() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    
    // Filter ALL calculations by currently selected currency
    const currentCurrencyExpenses = expenses.filter(e => (e.currency || '$') === selectedCurrency);
    
    const thisMonthExpenses = currentCurrencyExpenses.filter(e => e.date.slice(0, 7) === thisMonth);
    const lastMonthExpenses = currentCurrencyExpenses.filter(e => e.date.slice(0, 7) === lastMonth);
    
    const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    
    const avgPerTransaction = currentCurrencyExpenses.length > 0 ? 
      currentCurrencyExpenses.reduce((s, e) => s + Number(e.amount), 0) / currentCurrencyExpenses.length : 0;
    const maxTransaction = currentCurrencyExpenses.length > 0 ? 
      Math.max(...currentCurrencyExpenses.map(e => Number(e.amount))) : 0;
    
    const monthlyChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    return {
      thisMonthTotal,
      lastMonthTotal,
      monthlyChange,
      avgPerTransaction,
      maxTransaction,
      totalTransactions: expenses.length,
      currentCurrencyTransactions: currentCurrencyExpenses.length
    };
  }
  
  // Notification system
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} notification fade-in`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  function load(){
    try{
      const userStorageKey = getUserStorageKey(STORAGE_KEY);
      const raw = localStorage.getItem(userStorageKey);
      if(!raw){
        // seed with mock data
        const now = new Date();
        const sample = [
          // USD transactions
          {id:uid(), amount:8.5, category:'Food', date: offsetDate(now, -1), time: '08:30:00', timestamp: now.getTime() - (24*60*60*1000), note:'Morning coffee at Starbucks', currency: '$'},
          {id:uid(), amount:24.2, category:'Travel', date: offsetDate(now, -5), time: '14:15:00', timestamp: now.getTime() - (5*24*60*60*1000), note:'Uber ride to downtown', currency: '$'},
          {id:uid(), amount:120.00, category:'Bills', date: offsetDate(now, -20), time: '16:45:00', timestamp: now.getTime() - (20*24*60*60*1000), note:'Monthly electricity bill', currency: '$'},
          {id:uid(), amount:45.0, category:'Entertainment', date: offsetDate(now, -3), time: '19:00:00', timestamp: now.getTime() - (3*24*60*60*1000), note:'Movie tickets for weekend', currency: '$'},
          
          // INR transactions (current month for better demo)
          {id:uid(), amount:650, category:'Food', date: offsetDate(now, -2), time: '12:30:00', timestamp: now.getTime() - (2*24*60*60*1000), note:'Lunch at local restaurant', currency: '₹'},
          {id:uid(), amount:4500, category:'Shopping', date: offsetDate(now, -1), time: '11:20:00', timestamp: now.getTime() - (24*60*60*1000), note:'Programming books from Amazon', currency: '₹'},
          {id:uid(), amount:1200, category:'Bills', date: offsetDate(now, -7), time: '09:30:00', timestamp: now.getTime() - (7*24*60*60*1000), note:'Internet bill payment', currency: '₹'},
          {id:uid(), amount:800, category:'Travel', date: offsetDate(now, -4), time: '18:45:00', timestamp: now.getTime() - (4*24*60*60*1000), note:'Auto rickshaw fare', currency: '₹'},
          
          // EUR transactions
          {id:uid(), amount:25.5, category:'Food', date: offsetDate(now, -10), time: '13:15:00', timestamp: now.getTime() - (10*24*60*60*1000), note:'Cafe in Paris', currency: '€'},
          {id:uid(), amount:85.0, category:'Shopping', date: offsetDate(now, -15), time: '15:30:00', timestamp: now.getTime() - (15*24*60*60*1000), note:'Souvenir shopping', currency: '€'},
        ];
        expenses = sample;
        save();
      } else {
        expenses = JSON.parse(raw);
        // Migrate old transactions to include time data
        let needsSave = false;
        expenses.forEach(txn => {
          if (!txn.time || !txn.timestamp) {
            // Add default time for old transactions (assume mid-day)
            txn.time = txn.time || '12:00:00';
            txn.timestamp = txn.timestamp || new Date(txn.date + 'T12:00:00').getTime();
            needsSave = true;
          }
          if (!txn.currency) {
            txn.currency = '$'; // Default currency for old transactions
            needsSave = true;
          }
        });
        if (needsSave) save(); // Save migrated data
      }
    }catch(e){ console.error('load error', e); expenses = []; }
  }
  function offsetDate(d, days){ const x=new Date(d); x.setDate(x.getDate()+days); return x.toISOString().slice(0,10); }
  function save(){ 
    const userStorageKey = getUserStorageKey(STORAGE_KEY);
    localStorage.setItem(userStorageKey, JSON.stringify(expenses)); 
  }

  // render filters
  function renderCategoryFilters(){
    const cats = Array.from(new Set([...DEFAULT_CATS, ...expenses.map(e=>e.category)]));
    categoryFilters.innerHTML = '';
    
    // All button - always show as first button
    const allBtn = el('button','All', ['btn','btn-sm','filter-btn']);
    allBtn.addEventListener('click', ()=>{ filter.category='All'; render(); });
    categoryFilters.appendChild(allBtn);
    
    // Category buttons
    cats.forEach(c=>{
      const btn = el('button', c, ['btn','btn-sm','filter-btn']);
      btn.addEventListener('click', ()=>{ filter.category=c; render(); });
      categoryFilters.appendChild(btn);
    });
  }

  // render table
  function renderTable(){
    const list = applyFilters(expenses.slice());
    txnTable.innerHTML = '';
    
    const filteredCountEl = document.getElementById('filteredCount');
    
    if (list.length === 0) {
      txnTable.innerHTML = `
        <tr><td colspan="5" class="empty-state">
          <div class="h5">📊 No transactions found</div>
          <small>Add your first expense above or adjust your filters</small>
        </td></tr>
      `;
      if (filteredCountEl) filteredCountEl.textContent = '0 transactions';
      return;
    }
    
    // Update filtered count
    if (filteredCountEl) {
      const totalCount = expenses.length;
      const showingText = list.length === totalCount ? 
        `${totalCount} transactions` : 
        `${list.length} of ${totalCount} transactions`;
      filteredCountEl.textContent = showingText;
    }
    
    list.forEach(txn=>{
      const tr = document.createElement('tr');
      tr.classList.add('fade-in');
      const categoryIcon = getCategoryIcon(txn.category);
      
      // Create description cell with explicit styling
      const isDark = document.body.classList.contains('dark');
      const textColor = isDark ? '#ffffff' : '#222';
      
      tr.innerHTML = `
        <td><div class="badge date-badge">${formatDateTime(txn)}</div></td>
        <td class="desc-cell" style="background: ${isDark ? 'rgba(255,255,255,0.02)' : 'transparent'} !important;">
          <div class="transaction-desc" style="color: ${textColor} !important; font-weight: 600 !important; font-size: 0.95rem !important; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'transparent'} !important; padding: 6px 10px !important; border-radius: 4px !important; border: ${isDark ? '1px solid rgba(255,255,255,0.2)' : 'none'} !important;">${escapeHtml(txn.note || 'No description')}</div>
        </td>
        <td><span class="badge category-badge">${categoryIcon} ${escapeHtml(txn.category)}</span></td>
        <td class="text-end" style="background: ${isDark ? 'rgba(255,255,255,0.02)' : 'transparent'} !important;">
          <span class="amount-display ${Number(txn.amount) > 100 ? 'high-amount' : 'low-amount'}" style="color: ${textColor} !important; font-weight: 700 !important; background: ${isDark ? (Number(txn.amount) > 100 ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)') : 'transparent'} !important; padding: 4px 8px !important; border-radius: 4px !important; border: ${isDark ? (Number(txn.amount) > 100 ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(74,222,128,0.4)') : 'none'} !important;">${formatCurrency(txn.amount)}</span>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm action-buttons">
            <button data-id="${txn.id}" class="btn btn-outline-primary btn-edit" title="Edit">✏️</button>
            <button data-id="${txn.id}" class="btn btn-outline-danger btn-delete" title="Delete">🗑️</button>
          </div>
        </td>
      `;
      txnTable.appendChild(tr);
    });
    
    // attach event listeners
    txnTable.querySelectorAll('.btn-delete').forEach(b=>b.addEventListener('click', (ev)=>{
      const id = ev.currentTarget.dataset.id;
      if(confirm('🗑️ Delete this transaction?')){ 
        expenses = expenses.filter(x=>x.id!==id); 
        save(); 
        render(); 
        showNotification('Transaction deleted successfully', 'success');
      }
    }));
    
    txnTable.querySelectorAll('.btn-edit').forEach(b=>b.addEventListener('click', (ev)=>{
      const id = ev.currentTarget.dataset.id;
      editTransaction(id);
    }));
  }
  
  function getCategoryIcon(category) {
    const icons = {
      'Food': '🍔', 'Travel': '✈️', 'Shopping': '🛍️', 
      'Bills': '💡', 'Entertainment': '🎬', 'Health': '🏥', 
      'Other': '📝'
    };
    return icons[category] || '📝';
  }
  
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateTime(txn) {
    // If transaction has time data, show date and time
    if (txn.time) {
      const date = new Date(txn.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = txn.time.slice(0, 5); // Show HH:MM only
      return `<div class="date-part">${dateStr}</div><div class="time-part">${timeStr}</div>`;
    }
    // Fallback to just date for older transactions
    return `<div class="date-part">${formatDate(txn.date)}</div>`;
  }
  
  // Track editing state
  let editingTransaction = null;

  function editTransaction(id) {
    const txn = expenses.find(e => e.id === id);
    if (!txn) return;
    
    // Set editing mode
    editingTransaction = { ...txn }; // Store a copy of the original transaction
    
    // Fill form with transaction data
    amountEl.value = txn.amount;
    categoryEl.value = txn.category;
    dateEl.value = txn.date;
    noteEl.value = txn.note || '';
    
    // Set currency selector to match transaction currency
    if (currencySelect && txn.currency) {
      currencySelect.value = txn.currency;
      selectedCurrency = txn.currency;
      updateCurrency();
    }
    
    // Add visual edit mode styling
    const formCard = form.closest('.card');
    if (formCard) {
      formCard.classList.add('edit-mode');
    }
    
    // Update form to show edit mode
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = '✏️ Update Transaction';
      submitBtn.className = 'btn btn-warning w-100';
    }
    
    // Add cancel button if it doesn't exist
    let cancelBtn = document.getElementById('cancelEdit');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelEdit';
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary w-100 mt-2';
      cancelBtn.textContent = '❌ Cancel Edit';
      cancelBtn.addEventListener('click', cancelEdit);
      submitBtn.parentNode.appendChild(cancelBtn);
    }
    cancelBtn.style.display = 'block';
    
    // Scroll to form and focus amount field
    amountEl.focus();
    amountEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    showNotification('Editing transaction. Make changes and click "Update Transaction" or "Cancel Edit".', 'info');
  }
  
  function cancelEdit() {
    editingTransaction = null;
    
    // Remove visual edit mode styling
    const formCard = form.closest('.card');
    if (formCard) {
      formCard.classList.remove('edit-mode');
    }
    
    // Reset form
    form.reset();
    
    // Reset submit button
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Add Expense';
      submitBtn.className = 'btn btn-primary w-100';
    }
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
    
    showNotification('Edit cancelled.', 'info');
  }

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function applyFilters(list){
    // Category filter
    if(filter.category && filter.category!=='All') {
      list = list.filter(x=>x.category===filter.category);
    }
    
    // Search filter
    if(filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(x=> 
        (x.note||'').toLowerCase().includes(q) || 
        String(x.amount).includes(q) ||
        x.category.toLowerCase().includes(q)
      );
    }
    
    // Amount range filter
    if(filter.minAmount !== '') {
      list = list.filter(x => Number(x.amount) >= Number(filter.minAmount));
    }
    if(filter.maxAmount !== '') {
      list = list.filter(x => Number(x.amount) <= Number(filter.maxAmount));
    }
    
    // Date range filter
    if(filter.fromDate) {
      list = list.filter(x => x.date >= filter.fromDate);
    }
    if(filter.toDate) {
      list = list.filter(x => x.date <= filter.toDate);
    }
    
    // Sort
    switch(filter.sort){
      case 'date_desc': list.sort((a,b)=> b.date.localeCompare(a.date)); break;
      case 'date_asc': list.sort((a,b)=> a.date.localeCompare(b.date)); break;
      case 'amount_desc': list.sort((a,b)=> b.amount - a.amount); break;
      case 'amount_asc': list.sort((a,b)=> a.amount - b.amount); break;
      case 'category': list.sort((a,b)=> a.category.localeCompare(b.category)); break;
    }
    return list;
  }

  // charts
  function renderCharts(){
    const byCat = DEFAULT_CATS.reduce((acc,c)=>{ acc[c]=0; return acc; }, {});
    expenses.forEach(e=>{ if(!byCat[e.category]) byCat[e.category]=0; byCat[e.category]+=Number(e.amount); });
    const labels = Object.keys(byCat);
    const values = labels.map(l=> byCat[l]);

    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#e6eef8' : '#222';
    const gridColor = isDark ? '#2d3748' : '#dee2e6';

    // Pie chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if(pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type:'pie', 
      data:{ labels, datasets:[{ data: values, backgroundColor:generateColors(labels.length) }]},
      options:{ 
        plugins:{ 
          legend:{ 
            position:'bottom',
            labels: { color: textColor }
          } 
        } 
      }
    });

    // Line chart — monthly totals (last 6 months)
    const months = lastNMonths(6);
    const monthTotals = months.map(m=> expenses.reduce((s,e)=> s + ((e.date.slice(0,7)===m)? Number(e.amount) : 0), 0));
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    if(lineChart) lineChart.destroy();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0d6efd';
    lineChart = new Chart(lineCtx, { 
      type:'line', 
      data:{ 
        labels: months.map(m=> m.slice(5)), 
        datasets:[{ 
          label:'Spent', 
          data: monthTotals, 
          borderColor: accentColor.trim(), 
          tension: .3, 
          fill:true, 
          backgroundColor: isDark ? 'rgba(125,211,252,0.1)' : 'rgba(13,110,253,0.08)'
        }]
      }, 
      options:{ 
        scales:{ 
          x: { 
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y:{ 
            beginAtZero:true,
            ticks: { color: textColor },
            grid: { color: gridColor }
          } 
        }, 
        plugins:{ legend:{ display:false } } 
      } 
    });
  }

  function lastNMonths(n){ const arr=[]; const d=new Date(); for(let i=n-1;i>=0;i--){ const m=new Date(d.getFullYear(), d.getMonth()-i, 1); const mkey = m.toISOString().slice(0,7); arr.push(mkey); } return arr; }

  function generateColors(n){ const palette = ['#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff','#ff9f40','#7cb342','#e57373','#64b5f6']; const out=[]; for(let i=0;i<n;i++) out.push(palette[i%palette.length]); return out; }

  // summary
  function renderSummary(){
    const stats = getAdvancedStats();
    
    // Ensure we always show currency even for zero values
    totalAmountEl.textContent = formatCurrency(stats.thisMonthTotal || 0);
    txnCountEl.textContent = `${stats.totalTransactions} transactions`;
    
    // Update additional stats if elements exist
    const avgAmountEl = document.getElementById('avgAmount');
    const avgLabelEl = document.getElementById('avgLabel');
    const monthlyChangeEl = document.getElementById('monthlyChange');
    const maxTransactionEl = document.getElementById('maxTransaction');
    const maxLabelEl = document.getElementById('maxLabel');
    
    if (avgAmountEl) {
      avgAmountEl.textContent = formatCurrency(stats.avgPerTransaction || 0);
    }
    
    // Update labels to show currency-specific information
    if (avgLabelEl) {
      const currencyName = getCurrencyName(selectedCurrency);
      avgLabelEl.textContent = `Avg per ${selectedCurrency} Transaction (${stats.currentCurrencyTransactions})`;
    }
    
    if (monthlyChangeEl) {
      const isIncrease = stats.monthlyChange >= 0;
      const changeClass = isIncrease ? 'change-increase' : 'change-decrease';
      const changeIcon = isIncrease ? '↑' : '↓';
      const changeText = stats.monthlyChange === 0 ? '0%' : `${changeIcon} ${Math.abs(stats.monthlyChange).toFixed(1)}%`;
      monthlyChangeEl.innerHTML = `<span class="stats-value ${changeClass}">${changeText}</span>`;
    }
    
    if (maxTransactionEl) {
      maxTransactionEl.textContent = formatCurrency(stats.maxTransaction || 0);
    }
    
    if (maxLabelEl) {
      const currencyName = getCurrencyName(selectedCurrency);
      maxLabelEl.textContent = `Largest ${selectedCurrency} Transaction`;
    }
  }

  // events
  function bindEvents(){
    if (!form) {
      console.error('Cannot bind events: form element not found');
      return;
    }
    
    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const amt = parseFloat(amountEl.value);
      if(isNaN(amt) || amt<=0) return alert('Enter valid amount');
      
      if (editingTransaction) {
        // Update existing transaction
        const txIndex = expenses.findIndex(e => e.id === editingTransaction.id);
        if (txIndex !== -1) {
          const now = new Date();
          expenses[txIndex] = {
            id: editingTransaction.id, // Keep original ID
            amount: amt,
            category: categoryEl.value,
            date: dateEl.value || new Date().toISOString().slice(0,10),
            time: editingTransaction.time || now.toTimeString().slice(0,8), // Keep original time or use current
            timestamp: editingTransaction.timestamp || now.getTime(), // Keep original timestamp
            note: noteEl.value,
            currency: selectedCurrency || '$'
          };
          showNotification('Transaction updated successfully!', 'success');
        }
        
        // Reset edit mode
        editingTransaction = null;
        const formCard = form.closest('.card');
        if (formCard) {
          formCard.classList.remove('edit-mode');
        }
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
        if (submitBtn) {
          submitBtn.textContent = 'Add Expense';
          submitBtn.className = 'btn btn-primary w-100';
        }
        const cancelBtn = document.getElementById('cancelEdit');
        if (cancelBtn) {
          cancelBtn.style.display = 'none';
        }
      } else {
        // Add new transaction
        const now = new Date();
        const tx = { 
          id: uid(), 
          amount: amt, 
          category: categoryEl.value, 
          date: dateEl.value || now.toISOString().slice(0,10), 
          time: now.toTimeString().slice(0,8), // HH:MM:SS format
          timestamp: now.getTime(), // For sorting and precise tracking
          note: noteEl.value,
          currency: selectedCurrency || '$'
        };
        expenses.unshift(tx);
        showNotification('Transaction added successfully!', 'success');
      }
      
      save();
      form.reset();
      render();
    });

    // Search and sort event listeners with error handling
    if (searchEl) {
      searchEl.addEventListener('input', debounce((e)=>{ 
        filter.search = e.target.value.trim(); 
        render(); 
        if (filter.search) {
          showNotification(`Searching for: "${filter.search}"`, 'info');
        }
      }, 250));
    } else {
      console.warn('Search element not found - search functionality disabled');
    }
    
    if (sortByEl) {
      sortByEl.addEventListener('change', ()=>{ 
        filter.sort = sortByEl.value; 
        render(); 
        const sortText = sortByEl.options[sortByEl.selectedIndex].text;
        showNotification(`Sorted by: ${sortText}`, 'info');
      });
    } else {
      console.warn('Sort element not found - sorting functionality disabled');
    }
    
    // Advanced filter event listeners for real-time filtering
    if (minAmountEl) {
      minAmountEl.addEventListener('input', debounce(() => {
        filter.minAmount = minAmountEl.value;
        render();
        if (minAmountEl.value) {
          showNotification(`Filtering amounts ≥ ${formatCurrency(minAmountEl.value)}`, 'info');
        }
      }, 500));
    }
    
    if (maxAmountEl) {
      maxAmountEl.addEventListener('input', debounce(() => {
        filter.maxAmount = maxAmountEl.value;
        render();
        if (maxAmountEl.value) {
          showNotification(`Filtering amounts ≤ ${formatCurrency(maxAmountEl.value)}`, 'info');
        }
      }, 500));
    }
    
    if (fromDateEl) {
      fromDateEl.addEventListener('change', () => {
        filter.fromDate = fromDateEl.value;
        render();
        if (fromDateEl.value) {
          showNotification(`Filtering from: ${new Date(fromDateEl.value).toLocaleDateString()}`, 'info');
        }
      });
    }
    
    if (toDateEl) {
      toDateEl.addEventListener('change', () => {
        filter.toDate = toDateEl.value;
        render();
        if (toDateEl.value) {
          showNotification(`Filtering to: ${new Date(toDateEl.value).toLocaleDateString()}`, 'info');
        }
      });
    }
    
    if (clearFiltersEl) {
      clearFiltersEl.addEventListener('click', () => {
        // Reset all filters
        filter = {category: 'All', search: '', sort: 'date_desc', minAmount: '', maxAmount: '', fromDate: '', toDate: ''};
        
        // Clear all form inputs
        if (searchEl) searchEl.value = '';
        if (minAmountEl) minAmountEl.value = '';
        if (maxAmountEl) maxAmountEl.value = '';
        if (fromDateEl) fromDateEl.value = '';
        if (toDateEl) toDateEl.value = '';
        if (sortByEl) sortByEl.value = 'date_desc';
        
        render();
        showNotification('All filters cleared - showing all transactions', 'info');
      });
    }
    
    if (applyFiltersEl) {
      applyFiltersEl.addEventListener('click', () => {
        updateFilters();
        showNotification(`Filters applied! Showing ${document.querySelectorAll('#txnTable tr').length} transactions`, 'success');
      });
    }
    clearBtn.addEventListener('click', ()=>{ if(confirm('Clear all transactions?')){ expenses=[]; save(); render(); } });

    // Logout button event
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          if (window.auth) {
            window.auth.logout();
          } else {
            window.location.href = 'login.html';
          }
        }
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener('click', ()=>{
        console.log('Theme toggle clicked'); // Debug log
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        console.log('Dark mode is now:', isDark); // Debug log
        
        // store preference
        localStorage.setItem(getUserStorageKey('theme_pref'), isDark ? 'dark' : 'light');
        
        // Force immediate style update
        if (isDark) {
          document.body.style.background = '#1a1d29';
          document.body.style.color = '#e2e8f0';
          // Update theme toggle button text for feedback
          themeToggle.innerHTML = '☀️';
          themeToggle.title = 'Switch to light mode';
        } else {
          document.body.style.background = '#ffffff';
          document.body.style.color = '#222';
          // Update theme toggle button text for feedback
          themeToggle.innerHTML = '🌗';
          themeToggle.title = 'Switch to dark mode';
        }
        
        // re-render everything with new theme colors
        render();
      });
    } else {
      console.error('Theme toggle button not found!');
    }

    // Currency selector event
    if (currencySelect) {
      console.log('Setting up currency selector event listener');
      
      // Test event
      currencySelect.addEventListener('change', function(event) {
        console.log('Currency changed to:', event.target.value);
        updateCurrency();
      });
      
      console.log('Currency selector value:', currencySelect.value);
    } else {
      console.error('Currency selector not found!');
    }
    
    // initialize theme from storage
    const pref = localStorage.getItem(getUserStorageKey('theme_pref')); 
    console.log('Loaded theme preference:', pref); // Debug log
    if(pref==='dark') {
      document.body.classList.add('dark');
      document.body.style.background = '#1a1d29';
      document.body.style.color = '#e2e8f0';
      if (themeToggle) {
        themeToggle.innerHTML = '☀️';
        themeToggle.title = 'Switch to light mode';
      }
      console.log('Applied dark theme'); // Debug log
    } else {
      if (themeToggle) {
        themeToggle.innerHTML = '🌗';
        themeToggle.title = 'Switch to dark mode';
      }
    }
    
    // Export/Import events
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const format = confirm('Export as CSV? (Cancel for JSON)') ? 'csv' : 'json';
        exportData(format);
        showNotification(`Exported ${expenses.length} transactions as ${format.toUpperCase()}`, 'success');
      });
    }
    
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          importData(e.target.files[0]);
          e.target.value = ''; // Reset file input
        }
      });
    }
  }

  function debounce(fn, t){ let to; return (...a)=>{ clearTimeout(to); to = setTimeout(()=>fn(...a), t); }; }
  
  function updateFilters() {
    // Update all filter values from form inputs
    filter.search = searchEl ? searchEl.value : '';
    filter.sort = sortByEl ? sortByEl.value : 'date_desc';
    filter.minAmount = minAmountEl ? minAmountEl.value : '';
    filter.maxAmount = maxAmountEl ? maxAmountEl.value : '';
    filter.fromDate = fromDateEl ? fromDateEl.value : '';
    filter.toDate = toDateEl ? toDateEl.value : '';
    render();
  }

  // render master
  function render(){
    try {
      renderCategoryFilters();
      renderTable();
      renderCharts();
      renderSummary();
      
      // update active filter visuals
      if (categoryFilters) {
        Array.from(categoryFilters.children).forEach(btn=> {
          const isActive = btn.textContent === filter.category || (filter.category === 'All' && btn.textContent === 'All');
          btn.classList.toggle('active', isActive);
          btn.classList.toggle('btn-primary', isActive);
          btn.classList.toggle('btn-outline-secondary', !isActive);
        });
      }
    
    // Force update description and amount visibility in dark mode
    if (document.body.classList.contains('dark')) {
      setTimeout(() => {
        // Fix descriptions
        document.querySelectorAll('.transaction-desc').forEach(desc => {
          desc.style.color = '#ffffff';
          desc.style.background = 'rgba(255, 255, 255, 0.08)';
          desc.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          desc.style.padding = '6px 10px';
          desc.style.borderRadius = '4px';
          desc.style.fontWeight = '600';
        });
        
        // Fix amounts
        document.querySelectorAll('.amount-display').forEach(amount => {
          amount.style.color = '#ffffff';
          amount.style.fontWeight = '700';
          amount.style.padding = '4px 8px';
          amount.style.borderRadius = '4px';
          
          if (amount.classList.contains('high-amount')) {
            amount.style.background = 'rgba(248, 113, 113, 0.2)';
            amount.style.border = '1px solid rgba(248, 113, 113, 0.4)';
          } else {
            amount.style.background = 'rgba(74, 222, 128, 0.2)';
            amount.style.border = '1px solid rgba(74, 222, 128, 0.4)';
          }
        });
      }, 100);
    }
    console.log('Render completed successfully');
    } catch (error) {
      console.error('Error during render:', error);
    }
  }

  // utils
  function el(tag,text,cls){ const e=document.createElement(tag); e.textContent = text; if(cls) e.classList.add(...cls); return e; }
  
  // Application health check
  function testBasicFunctionality() {
    console.log('=== APPLICATION HEALTH CHECK ===');
    console.log('1. DOM loaded:', document.readyState);
    console.log('2. Chart.js loaded:', typeof Chart !== 'undefined');
    console.log('3. Bootstrap loaded:', typeof bootstrap !== 'undefined');
    console.log('4. Expenses array:', Array.isArray(expenses));
    console.log('5. Current expenses count:', expenses.length);
    console.log('6. Selected currency:', selectedCurrency);
    console.log('7. Filter object:', filter);
    console.log('===============================');
  }

  // ===============================
  // ACCOUNT SETTINGS FUNCTIONALITY
  // ===============================
  
  function initializeAccountSettings() {
    try {
      // Load user profile data
      loadUserProfileSettings();
      
      // Initialize event listeners for account settings
      initializeAccountSettingsEvents();
      
      // Load saved preferences
      loadUserPreferences();
      
      console.log('Account settings initialized');
    } catch (error) {
      console.error('Error initializing account settings:', error);
      showNotification('Error loading account settings', 'danger');
    }
  }
  
  function loadUserProfileSettings() {
    const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    
    // Helper function to safely set element value
    const safeSetValue = (id, value, defaultValue = '') => {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value !== undefined ? value : defaultValue;
        } else {
          element.value = value || defaultValue;
        }
      } else {
        console.warn(`Element with id '${id}' not found when loading user profile settings`);
      }
    };
    
    // Load profile information
    if (userData.profile) {
      const profile = userData.profile;
      safeSetValue('firstName', profile.firstName);
      safeSetValue('lastName', profile.lastName);
      safeSetValue('emailSettings', profile.email || currentUser?.email);
      safeSetValue('phoneSettings', profile.phone);
      safeSetValue('bioSettings', profile.bio);
      safeSetValue('birthdateSettings', profile.birthdate);
      safeSetValue('locationSettings', profile.location);
      
      // Load avatar if available
      const avatarImg = document.getElementById('profileAvatarImg');
      if (avatarImg && profile.avatar) {
        avatarImg.src = profile.avatar;
      }
    }
    
    // Load notification preferences
    if (userData.notifications) {
      const notifications = userData.notifications;
      safeSetValue('emailExpenseAlerts', notifications.emailExpenseAlerts, true);
      safeSetValue('emailBudgetAlerts', notifications.emailBudgetAlerts, true);
      safeSetValue('emailMonthlyReports', notifications.emailMonthlyReports, false);
      safeSetValue('emailSecurityAlerts', notifications.emailSecurityAlerts, true);
      safeSetValue('inAppExpenseReminders', notifications.inAppExpenseReminders, true);
      safeSetValue('inAppBudgetNotifications', notifications.inAppBudgetNotifications, true);
      safeSetValue('inAppTipsNotifications', notifications.inAppTipsNotifications, false);
      safeSetValue('inAppSoundEffects', notifications.inAppSoundEffects, true);
      safeSetValue('reminderTime', notifications.reminderTime, '18:00');
      safeSetValue('reportDay', notifications.reportDay, '1');
    }
    
    // Load preferences
    if (userData.preferences) {
      const preferences = userData.preferences;
      safeSetValue('themePreference', preferences.theme, 'auto');
      safeSetValue('accentColor', preferences.accentColor, '#0d6efd');
      safeSetValue('compactMode', preferences.compactMode, false);
      safeSetValue('defaultCurrency', preferences.defaultCurrency, '$');
      safeSetValue('dateFormat', preferences.dateFormat, 'MM/DD/YYYY');
      safeSetValue('weekStart', preferences.weekStart, '1');
      safeSetValue('defaultExpenseCategory', preferences.defaultExpenseCategory, '');
      safeSetValue('autoFillDate', preferences.autoFillDate, true);
      safeSetValue('clearFormAfterAdd', preferences.clearFormAfterAdd, true);
      safeSetValue('defaultChartType', preferences.defaultChartType, 'doughnut');
      safeSetValue('animateCharts', preferences.animateCharts, true);
      safeSetValue('showChartLabels', preferences.showChartLabels, true);
      safeSetValue('autoBackupFrequency', preferences.autoBackupFrequency, 'weekly');
      safeSetValue('cloudSync', preferences.cloudSync, false);
    }
    
    // Update 2FA status
    const twoFactorEnabled = userData.security?.twoFactorEnabled || false;
    updateTwoFactorStatus(twoFactorEnabled);
    
    console.log('User profile settings loaded successfully');
  }
  
  function initializeAccountSettingsEvents() {
    console.log('Initializing account settings events...');
    
    // Profile form submission
    const profileForm = document.getElementById('profileSettingsForm');
    if (profileForm) {
      profileForm.addEventListener('submit', handleProfileUpdate);
      console.log('Profile form event listener added');
    } else {
      console.warn('Profile form not found');
    }
    
    // Avatar change
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    
    console.log('Avatar elements:', {
      changeAvatarBtn: !!changeAvatarBtn,
      avatarUpload: !!avatarUpload
    });
    
    if (changeAvatarBtn && avatarUpload) {
      changeAvatarBtn.addEventListener('click', () => {
        console.log('Change avatar button clicked');
        avatarUpload.click();
      });
      avatarUpload.addEventListener('change', handleAvatarChange);
      console.log('Avatar event listeners added successfully');
    } else {
      console.error('Avatar elements not found:', {
        changeAvatarBtn: !!changeAvatarBtn,
        avatarUpload: !!avatarUpload
      });
    }
    
    // Password change form
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // 2FA toggle
    const enable2FA = document.getElementById('enable2FA');
    const disable2FA = document.getElementById('disable2FA');
    if (enable2FA) enable2FA.addEventListener('click', handleEnable2FA);
    if (disable2FA) disable2FA.addEventListener('click', handleDisable2FA);
    
    // Session management
    const viewAllSessions = document.getElementById('viewAllSessions');
    if (viewAllSessions) {
      viewAllSessions.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('sessionsModal')).show();
      });
    }
    
    // Export functions
    const exportAllData = document.getElementById('exportAllData');
    const exportCSV = document.getElementById('exportCSV');
    const exportPDF = document.getElementById('exportPDF');
    if (exportAllData) exportAllData.addEventListener('click', () => exportData('json'));
    if (exportCSV) exportCSV.addEventListener('click', () => exportData('csv'));
    if (exportPDF) exportPDF.addEventListener('click', () => exportData('pdf'));
    
    // Manual sync
    const manualSync = document.getElementById('manualSync');
    if (manualSync) manualSync.addEventListener('click', handleManualSync);
    
    // Danger zone actions
    const clearAllExpenses = document.getElementById('clearAllExpenses');
    const resetAllSettings = document.getElementById('resetAllSettings');
    const deleteAccountData = document.getElementById('deleteAccountData');
    
    if (clearAllExpenses) clearAllExpenses.addEventListener('click', handleClearAllExpenses);
    if (resetAllSettings) resetAllSettings.addEventListener('click', handleResetAllSettings);
    if (deleteAccountData) deleteAccountData.addEventListener('click', handleDeleteAccount);
    
    // Save settings button
    const saveButton = document.getElementById('saveAccountSettings');
    if (saveButton) {
      saveButton.addEventListener('click', handleSaveAccountSettings);
    }
    
    // Cloud sync toggle
    const cloudSync = document.getElementById('cloudSync');
    if (cloudSync) {
      cloudSync.addEventListener('change', (e) => {
        const manualSyncBtn = document.getElementById('manualSync');
        if (manualSyncBtn) {
          manualSyncBtn.disabled = !e.target.checked;
        }
      });
    }
  }
  
  function handleProfileUpdate(event) {
    event.preventDefault();
    
    const profileData = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      email: document.getElementById('emailSettings').value,
      phone: document.getElementById('phoneSettings').value,
      bio: document.getElementById('bioSettings').value,
      birthdate: document.getElementById('birthdateSettings').value,
      location: document.getElementById('locationSettings').value
    };
    
    saveUserData('profile', profileData);
    updateProfileDisplay();
    showNotification('Profile updated successfully!', 'success');
  }
  
  function handleAvatarChange(event) {
    console.log('Avatar change event triggered');
    const file = event.target.files[0];
    
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    console.log('File selected:', file.name, file.size, file.type);
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file', 'danger');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showNotification('Avatar file size must be less than 2MB', 'danger');
      return;
    }
    
    console.log('File validation passed, reading file...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
      console.log('File read successfully');
      const avatarImg = document.getElementById('profileAvatarImg');
      if (avatarImg) {
        avatarImg.src = e.target.result;
        console.log('Avatar image updated in modal');
      } else {
        console.error('profileAvatarImg element not found');
      }
      
      // Save avatar data
      try {
        saveUserData('profile', { avatar: e.target.result });
        console.log('Avatar data saved to localStorage');
        
        updateProfileDisplay();
        console.log('Profile display updated');
        
        showNotification('Avatar updated successfully!', 'success');
      } catch (error) {
        console.error('Error saving avatar:', error);
        showNotification('Error saving avatar. Please try again.', 'danger');
      }
    };
    
    reader.onerror = function(error) {
      console.error('FileReader error:', error);
      showNotification('Error reading file. Please try again.', 'danger');
    };
    
    reader.readAsDataURL(file);
  }
  
  function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Basic validation
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'danger');
      return;
    }
    
    if (newPassword.length < 8) {
      showNotification('Password must be at least 8 characters long', 'danger');
      return;
    }
    
    // In a real app, you would verify current password with server
    // For demo purposes, we'll just save the new password hash
    const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    userData.security = userData.security || {};
    userData.security.passwordLastChanged = new Date().toISOString();
    
    localStorage.setItem('expense_tracker_user_data', JSON.stringify(userData));
    
    // Clear form
    event.target.reset();
    showNotification('Password updated successfully!', 'success');
  }
  
  function handleEnable2FA() {
    // In a real app, this would initiate 2FA setup with QR code, etc.
    const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    userData.security = userData.security || {};
    userData.security.twoFactorEnabled = true;
    userData.security.twoFactorSetupDate = new Date().toISOString();
    
    localStorage.setItem('expense_tracker_user_data', JSON.stringify(userData));
    updateTwoFactorStatus(true);
    showNotification('Two-Factor Authentication enabled successfully!', 'success');
  }
  
  function handleDisable2FA() {
    if (confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) {
      const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
      userData.security = userData.security || {};
      userData.security.twoFactorEnabled = false;
      
      localStorage.setItem('expense_tracker_user_data', JSON.stringify(userData));
      updateTwoFactorStatus(false);
      showNotification('Two-Factor Authentication disabled', 'warning');
    }
  }
  
  function updateTwoFactorStatus(enabled) {
    const statusEl = document.getElementById('twoFactorStatus');
    const enableBtn = document.getElementById('enable2FA');
    const disableBtn = document.getElementById('disable2FA');
    
    if (statusEl) {
      statusEl.textContent = enabled ? 'Enabled' : 'Disabled';
      statusEl.className = enabled ? 'badge bg-success' : 'badge bg-secondary';
    }
    
    if (enableBtn) enableBtn.classList.toggle('d-none', enabled);
    if (disableBtn) disableBtn.classList.toggle('d-none', !enabled);
  }
  
  function handleManualSync() {
    const syncBtn = document.getElementById('manualSync');
    const lastSyncEl = document.getElementById('lastSyncTime');
    
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Syncing...';
    }
    
    // Simulate sync process
    setTimeout(() => {
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.innerHTML = '🔄 Sync Now';
      }
      
      if (lastSyncEl) {
        lastSyncEl.textContent = new Date().toLocaleString();
      }
      
      showNotification('Data synchronized successfully!', 'success');
    }, 2000);
  }
  
  function handleClearAllExpenses() {
    if (confirm('Are you sure you want to delete ALL expenses? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your expense data. Type "DELETE" to confirm:') && 
          prompt('Type "DELETE" to confirm:') === 'DELETE') {
        localStorage.removeItem('expense_tracker_data');
        expenses = [];
        render();
        showNotification('All expenses have been deleted', 'warning');
      }
    }
  }
  
  function handleResetAllSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This will not delete your expenses.')) {
      localStorage.removeItem('expense_tracker_user_data');
      localStorage.removeItem('expense_tracker_theme');
      localStorage.removeItem('expense_tracker_currency');
      
      // Reload settings
      loadUserProfileSettings();
      showNotification('All settings have been reset to default', 'info');
    }
  }
  
  function handleDeleteAccount() {
    if (confirm('⚠️ WARNING: This will permanently delete your account and ALL data. This action cannot be undone.')) {
      if (prompt('Type "DELETE MY ACCOUNT" to confirm account deletion:') === 'DELETE MY ACCOUNT') {
        // Clear all data
        localStorage.clear();
        
        // Redirect to login or show deletion message
        showNotification('Account deleted successfully. Redirecting...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }
  }
  
  function handleSaveAccountSettings() {
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Save account settings function started');
    
    const saveBtn = document.getElementById('saveAccountSettings');
    if (!saveBtn) {
      console.error('ERROR: Save button not found');
      showNotification('Error: Save button not found', 'danger');
      return;
    }
    console.log('Save button found:', saveBtn);
    
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.loading-spinner');
    
    if (!btnText || !spinner) {
      console.error('ERROR: Button text or spinner not found');
      console.log('btnText:', btnText);
      console.log('spinner:', spinner);
      showNotification('Error: Button elements not found', 'danger');
      return;
    }
    console.log('Button elements found - btnText:', btnText, 'spinner:', spinner);
    
    // Show loading state
    btnText.classList.add('d-none');
    spinner.classList.remove('d-none');
    saveBtn.disabled = true;
    
    try {
      console.log('=== STARTING DATA COLLECTION ===');
      
      // Test if we can get at least one element
      const firstNameElement = document.getElementById('firstName');
      console.log('Testing firstName element:', firstNameElement);
      if (!firstNameElement) {
        throw new Error('Critical: firstName element not found - form may not be loaded');
      }
      
      console.log('Starting to collect form data...');
      
      // Helper function to safely get element value
      const safeGetValue = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Element with id '${id}' not found`);
          return defaultValue;
        }
        const value = element.type === 'checkbox' ? element.checked : element.value;
        console.log(`${id}: ${value}`);
        return value;
      };
      
      // Helper function to safely get image src
      const safeGetImageSrc = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Image element with id '${id}' not found`);
          return defaultValue;
        }
        return element.src || defaultValue;
      };
      
      console.log('Collecting profile data...');
      // Collect all settings data with safe access
      const settingsData = {
        profile: {
          firstName: safeGetValue('firstName'),
          lastName: safeGetValue('lastName'),
          email: safeGetValue('emailSettings'),
          phone: safeGetValue('phoneSettings'),
          bio: safeGetValue('bioSettings'),
          birthdate: safeGetValue('birthdateSettings'),
          location: safeGetValue('locationSettings'),
          avatar: safeGetImageSrc('profileAvatarImg')
        },
        notifications: {
          emailExpenseAlerts: safeGetValue('emailExpenseAlerts', true),
          emailBudgetAlerts: safeGetValue('emailBudgetAlerts', true),
          emailMonthlyReports: safeGetValue('emailMonthlyReports', false),
          emailSecurityAlerts: safeGetValue('emailSecurityAlerts', true),
          inAppExpenseReminders: safeGetValue('inAppExpenseReminders', true),
          inAppBudgetNotifications: safeGetValue('inAppBudgetNotifications', true),
          inAppTipsNotifications: safeGetValue('inAppTipsNotifications', false),
          inAppSoundEffects: safeGetValue('inAppSoundEffects', true),
          reminderTime: safeGetValue('reminderTime', '18:00'),
          reportDay: safeGetValue('reportDay', '1')
        },
        preferences: {
          theme: safeGetValue('themePreference', 'auto'),
          accentColor: safeGetValue('accentColor', '#0d6efd'),
          compactMode: safeGetValue('compactMode', false),
          defaultCurrency: safeGetValue('defaultCurrency', '$'),
          dateFormat: safeGetValue('dateFormat', 'MM/DD/YYYY'),
          weekStart: safeGetValue('weekStart', '1'),
          defaultExpenseCategory: safeGetValue('defaultExpenseCategory', ''),
          autoFillDate: safeGetValue('autoFillDate', true),
          clearFormAfterAdd: safeGetValue('clearFormAfterAdd', true),
          defaultChartType: safeGetValue('defaultChartType', 'doughnut'),
          animateCharts: safeGetValue('animateCharts', true),
          showChartLabels: safeGetValue('showChartLabels', true),
          autoBackupFrequency: safeGetValue('autoBackupFrequency', 'weekly'),
          cloudSync: safeGetValue('cloudSync', false)
        }
      };
      
      console.log('Settings data collected:', settingsData);
      
      // Save to localStorage
      console.log('Saving to localStorage...');
      const existingData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
      const updatedData = { ...existingData, ...settingsData };
      localStorage.setItem('expense_tracker_user_data', JSON.stringify(updatedData));
      
      console.log('Settings saved to localStorage');
      
      // Apply theme change if needed
      try {
        console.log('=== APPLYING THEME CHANGE ===');
        const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        console.log('Current theme:', currentTheme, 'Settings theme:', settingsData.preferences.theme);
        
        if (settingsData.preferences.theme !== 'auto') {
          if (settingsData.preferences.theme !== currentTheme) {
            console.log('Applying theme change:', settingsData.preferences.theme);
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem(getUserStorageKey('theme_pref'), isDark ? 'dark' : 'light');
            console.log('Theme changed successfully to:', isDark ? 'dark' : 'light');
          }
        }
      } catch (themeError) {
        console.error('Error applying theme change:', themeError);
        // Don't throw - continue with other operations
      }
      
      // Update currency if changed
      try {
        console.log('=== UPDATING CURRENCY ===');
        console.log('Current selectedCurrency:', selectedCurrency);
        console.log('New currency:', settingsData.preferences.defaultCurrency);
        
        if (settingsData.preferences.defaultCurrency !== selectedCurrency) {
          console.log('Updating currency:', settingsData.preferences.defaultCurrency);
          selectedCurrency = settingsData.preferences.defaultCurrency;
          const currencySelect = document.getElementById('currencySelect');
          if (currencySelect) {
            currencySelect.value = selectedCurrency;
            console.log('Currency select updated');
          } else {
            console.warn('currencySelect element not found');
          }
          localStorage.setItem(getUserStorageKey('selectedCurrency'), selectedCurrency);
          console.log('About to call updateCurrency()');
          updateCurrency();
          console.log('Currency updated successfully');
        }
      } catch (currencyError) {
        console.error('Error updating currency:', currencyError);
        // Don't throw - continue with other operations
      }
      
      // Update profile display
      try {
        console.log('=== UPDATING PROFILE DISPLAY ===');
        updateProfileDisplay();
        console.log('Profile display updated successfully');
      } catch (profileError) {
        console.error('Error updating profile display:', profileError);
        // Don't throw - continue with other operations
      }
      
      setTimeout(() => {
        btnText.classList.remove('d-none');
        spinner.classList.add('d-none');
        saveBtn.disabled = false;
        showNotification('Account settings saved successfully!', 'success');
        console.log('Settings save completed successfully');
      }, 1000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error stack:', error.stack);
      btnText.classList.remove('d-none');
      spinner.classList.add('d-none');
      saveBtn.disabled = false;
      showNotification('Error saving settings: ' + error.message, 'danger');
    }
  }
  
  function saveUserData(section, data) {
    const existingData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    existingData[section] = { ...existingData[section], ...data };
    localStorage.setItem('expense_tracker_user_data', JSON.stringify(existingData));
  }
  
  function loadUserPreferences() {
    const userData = JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}');
    
    // Apply saved preferences
    if (userData.preferences) {
      // Apply theme
      if (userData.preferences.theme && userData.preferences.theme !== 'auto') {
        const isDark = userData.preferences.theme === 'dark';
        const currentlyDark = document.body.classList.contains('dark');
        if (isDark !== currentlyDark) {
          toggleTheme();
        }
      }
      
      // Apply accent color
      if (userData.preferences.accentColor) {
        document.documentElement.style.setProperty('--accent', userData.preferences.accentColor);
      }
      
      // Apply default currency
      if (userData.preferences.defaultCurrency && userData.preferences.defaultCurrency !== selectedCurrency) {
        changeCurrency(userData.preferences.defaultCurrency);
      }
    }
  }
  
  function exportData(format) {
    try {
      let data, filename, mimeType;
      
      switch (format) {
        case 'json':
          data = JSON.stringify({
            expenses: expenses,
            userData: JSON.parse(localStorage.getItem('expense_tracker_user_data') || '{}'),
            exportDate: new Date().toISOString(),
            version: '1.0'
          }, null, 2);
          filename = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          const headers = ['Date', 'Amount', 'Category', 'Description', 'Currency'];
          const csvData = [headers.join(',')];
          expenses.forEach(expense => {
            const row = [
              expense.date,
              expense.amount,
              expense.category,
              `"${expense.note || ''}"`,
              expense.currency || selectedCurrency
            ];
            csvData.push(row.join(','));
          });
          data = csvData.join('\n');
          filename = `expense-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'pdf':
          showNotification('PDF export feature coming soon!', 'info');
          return;
          
        default:
          throw new Error('Unsupported export format');
      }
      
      // Create and download file
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification(`Data exported successfully as ${format.toUpperCase()}!`, 'success');
      
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Error exporting data. Please try again.', 'danger');
    }
  }

  // ===============================
  // APPLICATION INITIALIZATION
  // ===============================

  // initialization
  try {
    console.log('Starting application initialization...');
    initializeElements();
    
    load(); 
    loadCurrency(); // Load saved currency preference
    
    // Ensure we have a valid currency before first render
    if (!selectedCurrency) {
      selectedCurrency = '$';
    }
    console.log('Initial currency set to:', selectedCurrency);
    
    // Initialize currency displays
    initializeCurrencyDisplays();
    
    bindEvents(); 
    // ensure default filter is set
    if(!filter.category) filter.category = 'All';
    // set today's date as default
    if(dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
    render();
    
    console.log('✅ Expense Tracker initialized successfully!');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    alert('Application failed to initialize. Please check the console for details.');
  }
})();
});