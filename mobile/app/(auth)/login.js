import React, { useState, useContext } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { StatusBar } from 'react-native';

export default function LoginRoute() {
  const { signIn, signUp } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saveLoginInfo, setSaveLoginInfo] = useState(false);

  const handleSubmit = async () => {
    setErr(null);
    
    // Validation
    if (!email.trim()) {
      setErr('Email is required');
      return;
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
      if (!name.trim()) {
        setErr('Name is required');
        return;
      }
      if (password.length < 6) {
        setErr('Password must be at least 6 characters');
        return;
      }
      
      const res = await signUp(name.trim(), email.trim(), password);
      if (res?.error) {
        setErr(res.error);
      } else if (res?.token) {
        router.replace('/(app)/home');
      } else if (res?.message) {
        // Email verification required
        setErr(res.message);
      } else {
        setErr('Sign up failed');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('name')}
                value={name}
                onChangeText={setName}
                textAlign={isRTL ? 'right' : 'left'}
                placeholderTextColor="#94a3b8"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('emailOrUsername')}
              value={email}
              onChangeText={setEmail}
              textAlign={isRTL ? 'right' : 'left'}
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && (
              <TouchableOpacity
                style={[styles.clearButton, isRTL && styles.clearButtonRTL]}
                onPress={() => setEmail('')}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={t('password')}
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
                  <TouchableOpacity onPress={() => setPassword('')} style={styles.clearButton}>
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
    </View>
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
    paddingBottom: 40,
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
});
