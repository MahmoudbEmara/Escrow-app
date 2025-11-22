import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { t, isRTL } = useContext(LanguageContext);

  const handleContinue = () => {
    // Navigate back to login page
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>

        {/* Success Message */}
        <Text style={[styles.title, isRTL && styles.textRTL]}>
          {t('accountCreated') || 'Account Created Successfully!'}
        </Text>

        {/* Verification Message */}
        <Text style={[styles.message, isRTL && styles.textRTL]}>
          {t('emailVerificationRequired') || 'Please check your email to verify your account. We\'ve sent a verification link to your email address.'}
        </Text>

        <Text style={[styles.subMessage, isRTL && styles.textRTL]}>
          {t('emailVerificationNote') || 'Once you verify your email, you can log in to your account.'}
        </Text>

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {t('continueToLogin') || 'Continue to Login'}
          </Text>
        </TouchableOpacity>

        {/* Resend Email Option */}
        <TouchableOpacity 
          style={styles.resendButton}
          onPress={() => {
            // TODO: Implement resend verification email
            alert(t('resendEmailSent') || 'Verification email sent!');
          }}
        >
          <Text style={styles.resendButtonText}>
            {t('resendVerificationEmail') || 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  checkIcon: {
    fontSize: 50,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  subMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

