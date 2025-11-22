import React, { createContext, useReducer, useEffect } from 'react';
import * as AuthService from '../services/authService';
import * as DatabaseService from '../services/databaseService';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

const initialState = {
  isLoading: true,
  userToken: null,
  user: null,
  session: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return {
        ...state,
        userToken: action.token,
        user: action.user,
        session: action.session,
        isLoading: false,
      };
    case 'SIGN_IN':
      return {
        ...state,
        userToken: action.token,
        user: action.user,
        session: action.session,
        isLoading: false,
      };
    case 'SIGN_OUT':
      return {
        ...state,
        userToken: null,
        user: null,
        session: null,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.user,
      };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Restore session on mount
    const bootstrap = async () => {
      try {
        const sessionResult = await AuthService.getCurrentSession();
        if (sessionResult.session && sessionResult.user) {
          // Get full user profile from database
          const profileResult = await DatabaseService.getUserProfile(sessionResult.user.id);
          const userData = {
            ...sessionResult.user,
            profile: profileResult.data || null,
          };

          dispatch({
            type: 'RESTORE_TOKEN',
            token: sessionResult.session.access_token,
            user: userData,
            session: sessionResult.session,
          });
        } else {
          dispatch({
            type: 'RESTORE_TOKEN',
            token: null,
            user: null,
            session: null,
          });
        }
      } catch (e) {
        console.warn('Auth bootstrap failed', e);
        dispatch({
          type: 'RESTORE_TOKEN',
          token: null,
          user: null,
          session: null,
        });
      }
    };

    bootstrap();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
          // Get user profile
          const profileResult = await DatabaseService.getUserProfile(session.user.id);
          const userData = {
            ...session.user,
            profile: profileResult.data || null,
          };

          dispatch({
            type: 'SIGN_IN',
            token: session.access_token,
            user: userData,
            session: session,
          });
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SIGN_OUT' });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update session on token refresh
          const profileResult = await DatabaseService.getUserProfile(session.user.id);
          const userData = {
            ...session.user,
            profile: profileResult.data || null,
          };

          dispatch({
            type: 'SIGN_IN',
            token: session.access_token,
            user: userData,
            session: session,
          });
        } else if (event === 'USER_UPDATED' && session) {
          dispatch({
            type: 'UPDATE_USER',
            user: session.user,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const authContext = {
    state,
    signIn: async (email, password) => {
      try {
        const result = await AuthService.signIn(email, password);
        
        if (result.error) {
          return { error: result.error, token: null, user: null };
        }

        if (result.session && result.user) {
          // Get user profile
          const profileResult = await DatabaseService.getUserProfile(result.user.id);
          const userData = {
            ...result.user,
            profile: profileResult.data || null,
          };

          dispatch({
            type: 'SIGN_IN',
            token: result.session.access_token,
            user: userData,
            session: result.session,
          });

          return {
            token: result.session.access_token,
            user: userData,
            session: result.session,
            error: null,
          };
        }

        return { error: 'Failed to sign in', token: null, user: null };
      } catch (error) {
        console.error('Sign in error:', error);
        return { error: error.message || 'Failed to sign in', token: null, user: null };
      }
    },
    signOut: async () => {
      try {
        const result = await AuthService.signOut();
        if (result.error) {
          return { error: result.error };
        }
        dispatch({ type: 'SIGN_OUT' });
        return { error: null };
      } catch (error) {
        console.error('Sign out error:', error);
        return { error: error.message || 'Failed to sign out' };
      }
    },
    signUp: async (name, email, password) => {
      try {
        const result = await AuthService.signUp(email, password, { name });
        
        if (result.error) {
          // Provide user-friendly error messages
          let errorMessage = result.error;
          if (result.error.includes('already registered')) {
            errorMessage = 'This email is already registered. Please sign in instead.';
          } else if (result.error.includes('invalid email')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (result.error.includes('Password')) {
            errorMessage = result.error;
          }
          return { error: errorMessage, token: null, user: null };
        }

        if (result.user) {
          try {
            // Create user profile (may fail if trigger already created it)
            const profileResult = await DatabaseService.createUserProfile({
              id: result.user.id,
              name: name,
              email: email,
              created_at: new Date().toISOString(),
            });
            
            // Only create wallet if profile creation succeeded (or if profile already exists)
            if (!profileResult.error || profileResult.error.includes('duplicate')) {
              // Create wallet for user (may also already exist from trigger)
              await DatabaseService.createWallet(result.user.id, 0).catch(() => {
                // Wallet might already exist from trigger
                console.log('Wallet might already exist');
              });
            }
          } catch (profileError) {
            console.log('Profile/wallet creation error (might already exist):', profileError);
            // Continue anyway - profile might already exist from trigger
          }

          if (result.session) {
            // User is immediately signed in (email confirmation disabled)
            const profileResult = await DatabaseService.getUserProfile(result.user.id);
            const userData = {
              ...result.user,
              profile: profileResult.data || null,
            };

            dispatch({
              type: 'SIGN_IN',
              token: result.session.access_token,
              user: userData,
              session: result.session,
            });

            return {
              token: result.session.access_token,
              user: userData,
              session: result.session,
              error: null,
            };
          } else {
            // Email confirmation required
            return {
              error: null,
              token: null,
              user: result.user,
              message: 'Please check your email to verify your account before signing in.',
            };
          }
        }

        return { error: 'Failed to create account', token: null, user: null };
      } catch (error) {
        console.error('Sign up error:', error);
        return { 
          error: error.message || 'Failed to sign up. Please try again.', 
          token: null, 
          user: null 
        };
      }
    },
    signInWithOTP: async (email) => {
      try {
        const result = await AuthService.sendOTP(email);
        return result;
      } catch (error) {
        console.error('Sign in with OTP error:', error);
        return { error: error.message || 'Failed to send OTP' };
      }
    },
    verifyOTP: async (email, token) => {
      try {
        const result = await AuthService.verifyOTP(email, token);
        
        if (result.error) {
          return result;
        }

        if (result.session && result.user) {
          const profileResult = await DatabaseService.getUserProfile(result.user.id);
          const userData = {
            ...result.user,
            profile: profileResult.data || null,
          };

          dispatch({
            type: 'SIGN_IN',
            token: result.session.access_token,
            user: userData,
            session: result.session,
          });

          return {
            token: result.session.access_token,
            user: userData,
            session: result.session,
            error: null,
          };
        }

        return { error: 'Failed to verify OTP', token: null, user: null };
      } catch (error) {
        console.error('Verify OTP error:', error);
        return { error: error.message || 'Failed to verify OTP' };
      }
    },
    signInWithOAuth: async (provider) => {
      try {
        const result = await AuthService.signInWithOAuth(provider);
        return result;
      } catch (error) {
        console.error('OAuth sign in error:', error);
        return { error: error.message || 'Failed to sign in with OAuth' };
      }
    },
    resetPassword: async (email) => {
      try {
        const result = await AuthService.resetPassword(email);
        return result;
      } catch (error) {
        console.error('Reset password error:', error);
        return { error: error.message || 'Failed to send password reset email' };
      }
    },
    updatePassword: async (newPassword) => {
      try {
        const result = await AuthService.updatePassword(newPassword);
        return result;
      } catch (error) {
        console.error('Update password error:', error);
        return { error: error.message || 'Failed to update password' };
      }
    },
    updateProfile: async (updates) => {
      try {
        // Update auth metadata
        const authResult = await AuthService.updateUserMetadata(updates);
        
        // Update database profile
        if (state.user?.id) {
          const dbResult = await DatabaseService.updateUserProfile(state.user.id, updates);
          if (dbResult.data) {
            const updatedUser = {
              ...state.user,
              profile: dbResult.data,
            };
            dispatch({ type: 'UPDATE_USER', user: updatedUser });
          }
        }

        return authResult;
      } catch (error) {
        console.error('Update profile error:', error);
        return { error: error.message || 'Failed to update profile' };
      }
    },
    refreshSession: async () => {
      try {
        const result = await AuthService.refreshSession();
        if (result.session && result.user) {
          dispatch({
            type: 'SIGN_IN',
            token: result.session.access_token,
            user: result.user,
            session: result.session,
          });
        }
        return result;
      } catch (error) {
        console.error('Refresh session error:', error);
        return { error: error.message || 'Failed to refresh session' };
      }
    },
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};
