# Testing Google OAuth Fix

## Before Testing:

1. **Clear browser data** (important!):
   - Open DevTools (F12)
   - Go to Application tab
   - Clear all localStorage items
   - Clear all cookies for your domain
   - Or use Incognito/Private mode

2. **Restart your dev server**:
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

## Testing Steps:

1. Go to your app (http://localhost:3000)
2. Click "Get Started" or "Continue with Google"
3. Authorize with Google
4. You should be redirected back to your app at http://localhost:3000
5. The auth modal should close and you should see the canvas interface

## If it still doesn't work:

### Check Supabase Dashboard Configuration:

1. Go to: https://supabase.com/dashboard/project/qatbhzxltelouewghxid/auth/url-configuration

2. Make sure these are set:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: 
     ```
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```

3. Go to: https://supabase.com/dashboard/project/qatbhzxltelouewghxid/auth/providers

4. Make sure Google OAuth is enabled

### Check Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Make sure **Authorized redirect URIs** includes:
   ```
   https://qatbhzxltelouewghxid.supabase.co/auth/v1/callback
   ```

### Check Browser Console:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for any errors
4. You should see: "Auth state changed: SIGNED_IN [your-email]"

### Still stuck?

Check the Network tab in DevTools:
- Look for the `/auth/callback` request
- Check if it returns a 307 redirect to `/`
- Check if cookies are being set (look for `sb-` prefixed cookies)
