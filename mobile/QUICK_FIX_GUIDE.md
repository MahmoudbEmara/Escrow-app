# Quick Fix Guide - Getting Auth Working

## ✅ What Has Been Fixed

1. **React Version**: Downgraded from 19.2.0 to 19.1.0 ✅
2. **Supabase Configuration**: Added to `app.json` with proper URL format ✅
3. **Error Handling**: Fixed error messages in login/signup page ✅
4. **Supabase Client**: Improved error handling and validation ✅

## 🔧 Important: Supabase Dashboard Configuration

### Disable Email Confirmation (Recommended for Testing)

If users are getting errors during signup, you may need to disable email confirmation:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Settings**
3. Scroll down to **Email Auth**
4. Find **"Enable email confirmations"**
5. **Disable** this setting for now (you can enable it later for production)

This will allow users to sign up and immediately sign in without email verification.

### Alternative: Keep Email Confirmation Enabled

If you want to keep email confirmation enabled:

1. Users will receive an email after signup
2. They need to click the verification link
3. Then they can sign in

The app will show a message: "Please check your email to verify your account before signing in."

## 🔍 Verify Your Supabase Configuration

### 1. Check Your Supabase URL

Your Supabase URL should be in this format:
```
https://rmpbbesldyrbxbwgdxxz.supabase.co
```

**NOT** like this:
```
https://supabase.com/dashboard/project/...
```

### 2. Update app.json if Needed

The current configuration in `app.json` should be:
```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://rmpbbesldyrbxbwgdxxz.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**To get your actual credentials:**
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → use for `supabaseUrl`
   - **anon public** key → use for `supabaseAnonKey`

### 3. Restart Expo After Changes

After updating `app.json`, you must restart Expo:
```bash
# Stop the current Expo server (Ctrl+C)
# Then restart:
npm start
# Or
expo start
```

## 🧪 Testing Authentication

### Test Sign Up

1. Open the app
2. Tap "Sign Up"
3. Enter:
   - Name
   - Email (use a real email format, e.g., test@example.com)
   - Password (at least 6 characters)
4. Tap "Sign Up"

**Expected Results:**
- ✅ If email confirmation is **disabled**: User is immediately signed in and redirected to home
- ✅ If email confirmation is **enabled**: Message shows "Please check your email to verify your account"

### Test Sign In

1. Use an account that was already created
2. Enter email and password
3. Tap "Login"

**Expected Results:**
- ✅ User is signed in and redirected to home

### Common Errors and Fixes

**Error: "This email is already registered"**
- ✅ Solution: Use the "Login" tab instead, or use a different email

**Error: "Invalid email"**
- ✅ Solution: Make sure email format is correct (e.g., user@example.com)

**Error: "Password must be at least 6 characters"**
- ✅ Solution: Use a password with 6+ characters

**Error: Network/CORS issues**
- ✅ Solution: Check your Supabase URL in app.json is correct
- ✅ Solution: Restart Expo after changing app.json

**Error: "Failed to sign up" / "Failed to sign in"**
- ✅ Check the console logs for detailed error messages
- ✅ Verify Supabase credentials in app.json
- ✅ Check if email confirmation is causing issues (try disabling it)

## 📱 Running the App

1. **Install dependencies** (if not done):
   ```bash
   cd mobile
   npm install
   ```

2. **Start Expo**:
   ```bash
   npm start
   # Or
   expo start
   ```

3. **Test on device/emulator**:
   - Scan QR code with Expo Go app (for physical device)
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator

## 🔄 If Still Having Issues

1. **Clear Expo cache**:
   ```bash
   expo start -c
   ```

2. **Check console logs**:
   - Look for Supabase connection errors
   - Check for any red error messages
   - Verify the Supabase URL is correct

3. **Verify Supabase tables exist**:
   - Go to Supabase Dashboard → Table Editor
   - Ensure you have: `profiles`, `wallets` tables
   - If missing, run the SQL from `SUPABASE_SETUP.md`

4. **Check Supabase Auth settings**:
   - Authentication → Settings
   - Ensure "Email" provider is enabled
   - Check email templates are configured

## 📝 Notes

- The app now uses **React 19.1.0** (compatible with Expo)
- Supabase credentials are configured in `app.json` (extra section)
- Error messages are now more user-friendly
- Email validation happens on both client and server

---

**Next Steps:**
1. Disable email confirmation in Supabase Dashboard (for testing)
2. Restart Expo
3. Test sign up with a new email
4. Test sign in with existing account

If issues persist, check the console logs for detailed error messages!

