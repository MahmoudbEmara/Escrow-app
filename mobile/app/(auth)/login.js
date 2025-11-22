import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { StatusBar } from 'react-native';
import * as DatabaseService from '../../src/services/databaseService';

export default function LoginRoute() {
  const { signIn, signUp } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // null, 'checking', 'available', 'taken', 'invalid'
  const [usernameError, setUsernameError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null); // null, 'checking', 'available', 'taken', 'invalid'
  const [emailError, setEmailError] = useState('');
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saveLoginInfo, setSaveLoginInfo] = useState(false);

  // Debounced username check
  useEffect(() => {
    if (isLogin || !username.trim()) {
      setUsernameStatus(null);
      setUsernameError('');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    
    // Basic validation
    if (trimmedUsername.length < 3) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (trimmedUsername.length > 30) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 30 characters or less');
      return;
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setUsernameStatus('invalid');
      setUsernameError('Only lowercase letters, numbers, and underscores allowed');
      return;
    }

    // Debounce the API call
    setUsernameStatus('checking');
    setUsernameError('');

    const timeoutId = setTimeout(async () => {
      const result = await DatabaseService.checkUsernameAvailability(trimmedUsername);
      if (result.available) {
        setUsernameStatus('available');
        setUsernameError('');
      } else {
        setUsernameStatus('taken');
        setUsernameError(result.error || 'Username is not available');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [username, isLogin]);

  // Debounced email check (only for signup)
  useEffect(() => {
    if (isLogin || !email.trim()) {
      setEmailStatus(null);
      setEmailError('');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailStatus('invalid');
      setEmailError('Please enter a valid email address');
      return;
    }

    // Debounce the API call
    setEmailStatus('checking');
    setEmailError('');

    const timeoutId = setTimeout(async () => {
      const result = await DatabaseService.checkEmailAvailability(trimmedEmail);
      if (result.available) {
        setEmailStatus('available');
        setEmailError('');
      } else {
        setEmailStatus('taken');
        setEmailError(result.error || 'This email is already registered');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [email, isLogin]);

  const handleSubmit = async () => {
    setErr(null);
    
    // Validation
    if (!email.trim()) {
      setErr(isLogin ? 'Email or username is required' : 'Email is required');
      return;
    }
    
    // Email format validation (only for signup)
    if (!isLogin) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErr('Please enter a valid email address');
        return;
      }
    }
    
    if (!password.trim()) {
      setErr('Password is required');
      return;
    }
    
    if (isLogin) {
      const res = await signIn(email.trim(), password);
      if (res?.error) {
        setErr(res.error);
      } else if (res?.token) {
        router.replace('/(app)/home');
      } else {
        setErr(res?.message || t('loginFailed') || 'Login failed');
      }
    } else {
      if (!firstName.trim()) {
        setErr('First name is required');
        return;
      }
      if (!lastName.trim()) {
        setErr('Last name is required');
        return;
      }
      if (!username.trim()) {
        setErr('Username is required');
        return;
      }
      if (usernameStatus !== 'available') {
        setErr('Please choose an available username');
        return;
      }
      if (!email.trim()) {
        setErr('Email is required');
        return;
      }
      // Email format validation for signup
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErr('Please enter a valid email address');
        return;
      }
      if (emailStatus === 'taken') {
        setErr('This email is already registered. Please sign in instead.');
        return;
      }
      if (emailStatus === 'checking') {
        setErr('Please wait while we check email availability');
        return;
      }
      if (password.length < 6) {
        setErr('Password must be at least 6 characters');
        return;
      }
      
      const res = await signUp(firstName.trim(), lastName.trim(), username.trim(), email.trim(), password);
      if (res?.error) {
        setErr(res.error);
      } else if (res?.token) {
        // If token exists, user is logged in (email verification might not be required)
        router.replace('/(app)/home');
      } else if (res?.user) {
        // User created but email verification required
        router.replace('/(auth)/email-verification');
      } else if (res?.message) {
        // Email verification required
        router.replace('/(auth)/email-verification');
      } else {
        setErr('Sign up failed');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.mainTitle, isRTL && styles.mainTitleRTL]}>{t('loginOrSignUp')}</Text>
          <Text style={[styles.tagline, isRTL && styles.taglineRTL]}>{t('loginTagline')}</Text>
        </View>

        {/* Login/SignUp Toggle */}
        <View style={[styles.toggleContainer, isRTL && styles.toggleContainerRTL]}>
          <TouchableOpacity
            style={[styles.toggleOption, isLogin && styles.toggleOptionActive]}
            onPress={() => {
              setIsLogin(true);
              setErr(null);
              setFirstName('');
              setLastName('');
              setUsername('');
              setUsernameStatus(null);
              setUsernameError('');
            }}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>{t('login')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, !isLogin && styles.toggleOptionActive]}
            onPress={() => {
              setIsLogin(false);
              setErr(null);
            }}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>{t('signUp')}</Text>
          </TouchableOpacity>
        </View>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          {!isLogin && (
            <>
              <View style={[styles.nameRow, isRTL && styles.nameRowRTL]}>
                <View style={[styles.inputWrapper, styles.nameFieldWrapper]}>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('First Name') || 'First name'}
                    value={firstName}
                    onChangeText={setFirstName}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.inputWrapper, styles.nameFieldWrapper]}>
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('Last Name') || 'Last name'}
                    value={lastName}
                    onChangeText={setLastName}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <View style={styles.usernameContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      isRTL && styles.inputRTL,
                      usernameStatus === 'available' && styles.inputValid,
                      (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.inputInvalid
                    ]}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                      // Convert to lowercase and remove spaces
                      const cleaned = text.toLowerCase().replace(/\s/g, '');
                      setUsername(cleaned);
                    }}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {usernameStatus === 'checking' && (
                    <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                      <ActivityIndicator size="small" color="#64748b" />
                    </View>
                  )}
                  {usernameStatus === 'available' && (
                    <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                      <Text style={styles.usernameCheckIcon}>✓</Text>
                    </View>
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                      <Text style={styles.usernameErrorIcon}>✕</Text>
                    </View>
                  )}
                </View>
                {usernameStatus && usernameStatus !== 'checking' && usernameStatus !== 'available' && (
                  <Text style={[styles.usernameErrorText, isRTL && styles.textRTL]}>
                    {usernameError}
                  </Text>
                )}
                {usernameStatus === 'available' && (
                  <Text style={[styles.usernameSuccessText, isRTL && styles.textRTL]}>
                    Username is available
                  </Text>
                )}
              </View>
            </>
          )}

          <View style={styles.inputWrapper}>
            <View style={!isLogin ? styles.emailContainer : null}>
              <TextInput
                style={[
                  styles.input, 
                  isRTL && styles.inputRTL,
                  !isLogin && emailStatus === 'available' && styles.inputValid,
                  !isLogin && (emailStatus === 'taken' || emailStatus === 'invalid') && styles.inputInvalid
                ]}
                placeholder={isLogin ? "Email or Username" : "Email"}
                value={email}
                onChangeText={setEmail}
                textAlign={isRTL ? 'right' : 'left'}
                placeholderTextColor="#94a3b8"
                keyboardType={isLogin ? "default" : "email-address"}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!isLogin && emailStatus === 'checking' && (
                <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                  <ActivityIndicator size="small" color="#64748b" />
                </View>
              )}
              {!isLogin && emailStatus === 'available' && (
                <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                  <Text style={styles.usernameCheckIcon}>✓</Text>
                </View>
              )}
              {!isLogin && (emailStatus === 'taken' || emailStatus === 'invalid') && (
                <View style={[styles.usernameIndicator, isRTL && styles.usernameIndicatorRTL]}>
                  <Text style={styles.usernameErrorIcon}>✕</Text>
                </View>
              )}
              {isLogin && email.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearButton, isRTL && styles.clearButtonRTL]}
                  onPress={() => setEmail('')}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {!isLogin && emailStatus && emailStatus !== 'checking' && emailStatus !== 'available' && (
              <Text style={[styles.usernameErrorText, isRTL && styles.textRTL]}>
                {emailError}
              </Text>
            )}
            {!isLogin && emailStatus === 'available' && (
              <Text style={[styles.usernameSuccessText, isRTL && styles.textRTL]}>
                Email is available
              </Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('password') || 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign={isRTL ? 'right' : 'left'}
              placeholderTextColor="#94a3b8"
            />
            <View style={[styles.passwordActions, isRTL && styles.passwordActionsRTL]}>
              {password.length > 0 && (
                <>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPassword('')} style={styles.passwordClearButton}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Error Message */}
        {err && <Text style={[styles.errorText, isRTL && styles.errorTextRTL]}>{err}</Text>}

        {/* Options Row */}
        {isLogin && (
          <View style={[styles.optionsRow, isRTL && styles.optionsRowRTL]}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSaveLoginInfo(!saveLoginInfo)}
            >
              <View style={[styles.checkbox, saveLoginInfo && styles.checkboxChecked]}>
                {saveLoginInfo && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, isRTL && styles.checkboxLabelRTL]}>{t('saveLoginInfo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Primary Button */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>{isLogin ? t('loginButton') : t('signUpButton')}</Text>
        </TouchableOpacity>

        {/* Test Hint */}
        <Text style={[styles.testHint, isRTL && styles.testHintRTL]}>{t('testHint')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonRTL: {
    alignSelf: 'flex-end',
  },
  backArrow: {
    fontSize: 24,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  mainTitleRTL: {
    textAlign: 'right',
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  taglineRTL: {
    textAlign: 'right',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  toggleContainerRTL: {
    flexDirection: 'row-reverse',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nameRowRTL: {
    flexDirection: 'row-reverse',
  },
  nameFieldWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  inputRTL: {
    textAlign: 'right',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonRTL: {
    right: 'auto',
    left: 12,
  },
  clearIcon: {
    fontSize: 14,
    color: '#94a3b8',
  },
  passwordActions: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    flexDirection: 'row',
    gap: 8,
  },
  passwordActionsRTL: {
    right: 'auto',
    left: 12,
  },
  eyeButton: {
    width: 24,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordClearButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorTextRTL: {
    textAlign: 'right',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  optionsRowRTL: {
    flexDirection: 'row-reverse',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#0f172a',
  },
  checkboxLabelRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  testHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testHintRTL: {
    textAlign: 'right',
  },
  usernameContainer: {
    position: 'relative',
  },
  emailContainer: {
    position: 'relative',
  },
  usernameIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameIndicatorRTL: {
    right: 'auto',
    left: 12,
  },
  usernameCheckIcon: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  usernameErrorIcon: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  inputValid: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  inputInvalid: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  usernameErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  usernameSuccessText: {
    color: '#22c55e',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
});
