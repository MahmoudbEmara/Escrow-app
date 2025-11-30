import React, { useState, useContext, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { StatusBar } from 'react-native';
import * as DatabaseService from '../../src/services/databaseService';
import { User, Lock, Mail, Eye, EyeOff, Check, X, ArrowRight, ArrowLeft } from 'lucide-react-native';

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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      // Validation
      if (!email.trim()) {
        setErr(isLogin ? 'Email or username is required' : 'Email is required');
        setLoading(false);
        return;
      }

      // Email format validation (only for signup)
      if (!isLogin) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setErr('Please enter a valid email address');
          setLoading(false);
          return;
        }
      }

      if (!password.trim()) {
        setErr('Password is required');
        setLoading(false);
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
          setLoading(false);
          return;
        }
        if (!lastName.trim()) {
          setErr('Last name is required');
          setLoading(false);
          return;
        }
        if (!username.trim()) {
          setErr('Username is required');
          setLoading(false);
          return;
        }
        if (usernameStatus !== 'available') {
          setErr('Please choose an available username');
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setErr('Email is required');
          setLoading(false);
          return;
        }
        // Email format validation for signup
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setErr('Please enter a valid email address');
          setLoading(false);
          return;
        }
        if (emailStatus === 'taken') {
          setErr('This email is already registered. Please sign in instead.');
          setLoading(false);
          return;
        }
        if (emailStatus === 'checking') {
          setErr('Please wait while we check email availability');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErr('Password must be at least 6 characters');
          setLoading(false);
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
    } catch (error) {
      setErr('An unexpected error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Background Elements */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Lock size={32} color="#4F46E5" />
                </View>
              </View>
              <Text style={[styles.mainTitle, isRTL && styles.textRTL]}>
                {t('loginOrSignUp')}
              </Text>
              <Text style={[styles.tagline, isRTL && styles.textRTL]}>
                {t('loginTagline')}
              </Text>
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
                      <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>{t('firstName') || 'First Name'}</Text>
                      <View style={[styles.inputFieldContainer, isRTL && styles.inputFieldContainerRTL]}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, isRTL && styles.inputRTL]}
                          placeholder={t('firstName') || 'First name'}
                          value={firstName}
                          onChangeText={setFirstName}
                          textAlign={isRTL ? 'right' : 'left'}
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                    <View style={[styles.inputWrapper, styles.nameFieldWrapper]}>
                      <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>{t('lastName') || 'Last Name'}</Text>
                      <View style={[styles.inputFieldContainer, isRTL && styles.inputFieldContainerRTL]}>
                        <User size={20} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, isRTL && styles.inputRTL]}
                          placeholder={t('lastName') || 'Last name'}
                          value={lastName}
                          onChangeText={setLastName}
                          textAlign={isRTL ? 'right' : 'left'}
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>{t('username') || 'Username'}</Text>
                    <View style={[
                      styles.inputFieldContainer,
                      isRTL && styles.inputFieldContainerRTL,
                      usernameStatus === 'available' && styles.inputValid,
                      (usernameStatus === 'taken' || usernameStatus === 'invalid') && styles.inputInvalid
                    ]}>
                      <User size={20} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, isRTL && styles.inputRTL]}
                        placeholder="Username"
                        value={username}
                        onChangeText={(text) => {
                          const cleaned = text.toLowerCase().replace(/\s/g, '');
                          setUsername(cleaned);
                        }}
                        textAlign={isRTL ? 'right' : 'left'}
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {usernameStatus === 'checking' && <ActivityIndicator size="small" color="#64748b" />}
                      {usernameStatus === 'available' && <Check size={20} color="#22c55e" />}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X size={20} color="#ef4444" />}
                    </View>
                    {usernameStatus && usernameStatus !== 'checking' && usernameStatus !== 'available' && (
                      <Text style={[styles.errorHelperText, isRTL && styles.textRTL]}>{usernameError}</Text>
                    )}
                  </View>
                </>
              )}

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
                  {isLogin ? (t('emailOrUsername') || 'Email or Username') : (t('email') || 'Email')}
                </Text>
                <View style={[
                  styles.inputFieldContainer,
                  isRTL && styles.inputFieldContainerRTL,
                  !isLogin && emailStatus === 'available' && styles.inputValid,
                  !isLogin && (emailStatus === 'taken' || emailStatus === 'invalid') && styles.inputInvalid
                ]}>
                  <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={isLogin ? "Email or Username" : "Email"}
                    value={email}
                    onChangeText={setEmail}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor="#94a3b8"
                    keyboardType={isLogin ? "default" : "email-address"}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {!isLogin && emailStatus === 'checking' && <ActivityIndicator size="small" color="#64748b" />}
                  {!isLogin && emailStatus === 'available' && <Check size={20} color="#22c55e" />}
                  {!isLogin && (emailStatus === 'taken' || emailStatus === 'invalid') && <X size={20} color="#ef4444" />}
                </View>
                {!isLogin && emailStatus && emailStatus !== 'checking' && emailStatus !== 'available' && (
                  <Text style={[styles.errorHelperText, isRTL && styles.textRTL]}>{emailError}</Text>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>{t('password') || 'Password'}</Text>
                <View style={[styles.inputFieldContainer, isRTL && styles.inputFieldContainerRTL]}>
                  <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('password') || 'Password'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textAlign={isRTL ? 'right' : 'left'}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Error Message */}
            {err && (
              <View style={styles.errorContainer}>
                <X size={16} color="#ef4444" />
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{err}</Text>
              </View>
            )}

            {/* Options Row */}
            {isLogin && (
              <View style={[styles.optionsRow, isRTL && styles.optionsRowRTL]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setSaveLoginInfo(!saveLoginInfo)}
                >
                  <View style={[styles.checkbox, saveLoginInfo && styles.checkboxChecked]}>
                    {saveLoginInfo && <Check size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.checkboxLabel, isRTL && styles.checkboxLabelRTL]}>{t('saveLoginInfo')}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.forgotPassword}>{t('forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Primary Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>{isLogin ? t('loginButton') : t('signUpButton')}</Text>
                  {isRTL ? <ArrowLeft size={20} color="#ffffff" /> : <ArrowRight size={20} color="#ffffff" />}
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
  },
  toggleContainerRTL: {
    flexDirection: 'row-reverse',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#0f172a',
  },
  inputContainer: {
    marginBottom: 24,
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
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputFieldContainerRTL: {
    flexDirection: 'row-reverse',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    height: '100%',
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputValid: {
    borderColor: '#22c55e',
    backgroundColor: '#F0FDF4',
  },
  inputInvalid: {
    borderColor: '#ef4444',
    backgroundColor: '#FEF2F2',
  },
  errorHelperText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
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
    borderColor: '#CBD5E1',
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#334155',
  },
  checkboxLabelRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
