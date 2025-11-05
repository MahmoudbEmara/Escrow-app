import React, { createContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

const initialState = {
  isLoading: true,
  userToken: null,
  user: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return { ...state, userToken: action.token, isLoading: false, user: action.user };
    case 'SIGN_IN':
      return { ...state, userToken: action.token, user: action.user, isLoading: false };
    case 'SIGN_OUT':
      return { ...state, userToken: null, user: null, isLoading: false };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // optionally fetch user profile
          const user = await api.getProfile(token).catch(() => null);
          dispatch({ type: 'RESTORE_TOKEN', token, user });
        } else {
          dispatch({ type: 'RESTORE_TOKEN', token: null, user: null });
        }
      } catch (e) {
        console.warn('Auth bootstrap failed', e);
        dispatch({ type: 'RESTORE_TOKEN', token: null, user: null });
      }
    };
    bootstrap();
  }, []);

  const authContext = {
    state,
    signIn: async (email, password) => {
      // Test account bypass
      if (email.toLowerCase() === 'test' && password === 'test') {
        const testToken = 'test-token-123';
        const testUser = { name: 'Test User', email: 'test@test.com' };
        await AsyncStorage.setItem('userToken', testToken);
        dispatch({ type: 'SIGN_IN', token: testToken, user: testUser });
        return { token: testToken, user: testUser };
      }
      
      const res = await api.login(email, password);
      if (res?.token) {
        await AsyncStorage.setItem('userToken', res.token);
        dispatch({ type: 'SIGN_IN', token: res.token, user: res.user || null });
      }
      return res;
    },
    signOut: async () => {
      await AsyncStorage.removeItem('userToken');
      dispatch({ type: 'SIGN_OUT' });
    },
    signUp: async (name, email, password) => {
      const res = await api.register(name, email, password);
      if (res?.token) {
        await AsyncStorage.setItem('userToken', res.token);
        dispatch({ type: 'SIGN_IN', token: res.token, user: res.user || null });
      }
      return res;
    }
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};
