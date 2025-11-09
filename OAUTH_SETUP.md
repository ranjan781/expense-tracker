# Social Authentication Setup Guide

## 🚀 Quick Setup for Social Login

This expense tracker includes Google and Facebook OAuth authentication with both **Demo Mode** and **Direct OAuth** options.

### 🎮 Demo Mode vs Direct OAuth

- **Demo Mode (Default)**: Uses simulated social login for testing without requiring OAuth credentials
- **Direct OAuth**: Uses real Google/Facebook authentication with your configured credentials

You can toggle between modes using the "Authentication Mode" toggle on the login page.

### 📧 Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.developers.google.com/
   - Create a new project or select an existing one

2. **Enable Google Sign-In API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sign-In API" or "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add your domain to "Authorized JavaScript origins":
     - `http://localhost:8000` (for development)
     - `https://yourdomain.com` (for production)

4. **Update Configuration**
   - Copy your Client ID
   - Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in `js/auth.js`
   - Also update the data-client_id in `login.html`

### 📘 Facebook OAuth Setup

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Create a new app or select existing

2. **Add Facebook Login Product**
   - In your app dashboard, click "Add Product"
   - Find "Facebook Login" and click "Set Up"

3. **Configure OAuth Settings**
   - Go to "Facebook Login" > "Settings"
   - Add your Valid OAuth Redirect URIs:
     - `http://localhost:8000/login.html` (for development)
     - `https://yourdomain.com/login.html` (for production)

4. **Update Configuration**
   - Copy your App ID from the app dashboard
   - Replace `YOUR_FACEBOOK_APP_ID` in `js/auth.js`

### 🔧 Configuration File

Update the `OAUTH_CONFIG` object in `js/auth.js`:

```javascript
const OAUTH_CONFIG = {
  google: {
    clientId: 'your-actual-google-client-id.apps.googleusercontent.com'
  },
  facebook: {
    appId: 'your-actual-facebook-app-id'
  }
};
```

### 🧪 Demo Mode vs Direct OAuth

The app supports two authentication modes:

#### Demo Mode (Default)
- Uses simulated social login with fake user data
- Perfect for testing and development
- No OAuth credentials required
- Users: `demo.google@example.com` and `demo.facebook@example.com`

#### Direct OAuth Mode
- Uses real Google/Facebook authentication
- Requires proper OAuth credentials configuration
- Users log in with their actual social accounts
- Toggle this mode using the "Enable Real OAuth" button on login page

**To switch to Direct OAuth:**
1. Configure your OAuth credentials (see above)
2. On the login page, click "Enable Real OAuth (requires setup)"
3. The buttons will change to use real authentication
4. Users can now log in with their actual Google/Facebook accounts

**Authentication Mode is remembered** - your choice persists across browser sessions.

### 🔒 Security Notes

- Never commit real OAuth credentials to public repositories
- Use environment variables for production deployments
- Regularly rotate your OAuth secrets
- Restrict OAuth origins to your actual domains

### 📝 Testing

1. **Demo Mode**: Default testing with simulated social accounts
   - Google Demo: Creates user "Demo Google User" 
   - Facebook Demo: Creates user "Demo Facebook User"
   
2. **Direct OAuth Mode**: With real credentials configured
   - Google: Users log in with actual Google accounts
   - Facebook: Users log in with actual Facebook accounts
   
3. **Automatic Fallback**: If OAuth APIs fail to load in Direct mode, individual buttons fall back to demo login

**Switch modes anytime** using the toggle button on the login page!

### 🛠️ Troubleshooting

**Google Login Issues:**
- Check that your domain is in authorized origins
- Verify the Client ID is correct
- Ensure Google Sign-In API is enabled

**Facebook Login Issues:**
- Check OAuth redirect URIs are correct
- Verify App ID is correct
- Ensure your app is not in development mode for public use

**General Issues:**
- Check browser console for detailed error messages
- Verify internet connection for loading OAuth SDKs
- Test with demo buttons first to ensure base functionality works