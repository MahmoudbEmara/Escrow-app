import { supabase } from '../lib/supabase';

/**
 * Authentication Service
 * Handles all authentication operations using Supabase Auth
 */

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - Additional user metadata (name, etc.)
 * @returns {Promise<object>} - User session and user object
 */
export const signUp = async (email, password, metadata = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // Store additional user info like name
        emailRedirectTo: undefined, // Don't redirect for mobile apps
      },
    });

    if (error) {
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Password')) {
        errorMessage = error.message;
      } else if (error.message.includes('email')) {
        errorMessage = 'Email validation failed. Please check your email address.';
      }
      throw new Error(errorMessage);
    }

    return {
      user: data.user,
      session: data.session, // Will be null if email confirmation is required
      error: null,
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Failed to sign up',
    };
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - User session and user object
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Failed to sign in',
    };
  }
};

/**
 * Sign out current user
 * @returns {Promise<object>} - Success status
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: error.message || 'Failed to sign out' };
  }
};

/**
 * Get current session
 * @returns {Promise<object>} - Current session and user
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return {
      session,
      user: session?.user || null,
      error: null,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return {
      session: null,
      user: null,
      error: error.message || 'Failed to get session',
    };
  }
};

/**
 * Get current user
 * @returns {Promise<object>} - Current user object
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return {
      user,
      error: null,
    };
  } catch (error) {
    console.error('Get user error:', error);
    return {
      user: null,
      error: error.message || 'Failed to get user',
    };
  }
};

/**
 * Update user metadata
 * @param {object} updates - User metadata updates
 * @returns {Promise<object>} - Updated user object
 */
export const updateUserMetadata = async (updates) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      error: null,
    };
  } catch (error) {
    console.error('Update user metadata error:', error);
    return {
      user: null,
      error: error.message || 'Failed to update user metadata',
    };
  }
};

/**
 * Reset password - sends password reset email
 * @param {string} email - User email
 * @returns {Promise<object>} - Success status
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'myapp://reset-password', // Deep link for password reset
    });

    if (error) {
      throw error;
    }

    return { error: null, message: 'Password reset email sent' };
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      error: error.message || 'Failed to send password reset email',
    };
  }
};

/**
 * Update password (requires authenticated user)
 * @param {string} newPassword - New password
 * @returns {Promise<object>} - Success status
 */
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    return { error: null, message: 'Password updated successfully' };
  } catch (error) {
    console.error('Update password error:', error);
    return {
      error: error.message || 'Failed to update password',
    };
  }
};

/**
 * Send OTP via email
 * @param {string} email - User email
 * @param {string} type - OTP type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'
 * @returns {Promise<object>} - Success status
 */
export const sendOTP = async (email, type = 'magiclink') => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'myapp://auth-callback',
      },
    });

    if (error) {
      throw error;
    }

    return {
      error: null,
      message: `OTP sent to ${email}`,
    };
  } catch (error) {
    console.error('Send OTP error:', error);
    return {
      error: error.message || 'Failed to send OTP',
    };
  }
};

/**
 * Verify OTP
 * @param {string} email - User email
 * @param {string} token - OTP token received via email
 * @param {string} type - OTP type: 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'
 * @returns {Promise<object>} - User session and user object
 */
export const verifyOTP = async (email, token, type = 'magiclink') => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Failed to verify OTP',
    };
  }
};

/**
 * OAuth Sign In (Google, Apple, etc.)
 * @param {string} provider - OAuth provider: 'google' | 'apple' | 'facebook' | 'github' | etc.
 * @returns {Promise<object>} - Redirect URL or error
 */
export const signInWithOAuth = async (provider) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'myapp://auth-callback',
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      throw error;
    }

    // For React Native, you'll need to handle the redirect differently
    // This typically requires a deep link handler
    return {
      url: data.url,
      error: null,
    };
  } catch (error) {
    console.error('OAuth sign in error:', error);
    return {
      url: null,
      error: error.message || 'Failed to sign in with OAuth',
    };
  }
};

/**
 * Phone number authentication - Send OTP to phone
 * @param {string} phone - Phone number with country code (e.g., '+1234567890')
 * @returns {Promise<object>} - Success status
 */
export const sendPhoneOTP = async (phone) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw error;
    }

    return {
      error: null,
      message: `OTP sent to ${phone}`,
    };
  } catch (error) {
    console.error('Send phone OTP error:', error);
    return {
      error: error.message || 'Failed to send phone OTP',
    };
  }
};

/**
 * Verify phone OTP
 * @param {string} phone - Phone number
 * @param {string} token - OTP token received via SMS
 * @returns {Promise<object>} - User session and user object
 */
export const verifyPhoneOTP = async (phone, token) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    return {
      user: null,
      session: null,
      error: error.message || 'Failed to verify phone OTP',
    };
  }
};

/**
 * Listen to auth state changes
 * @param {function} callback - Callback function to handle auth state changes
 * @returns {function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

/**
 * Refresh session
 * @returns {Promise<object>} - Refreshed session
 */
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
    return {
      session: data.session,
      user: data.session?.user || null,
      error: null,
    };
  } catch (error) {
    console.error('Refresh session error:', error);
    return {
      session: null,
      user: null,
      error: error.message || 'Failed to refresh session',
    };
  }
};

