import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function HomeScreen() {
  const { signOut, state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <Text style={[styles.title, isRTL && styles.titleRTL]}>
        {t('welcome')}{state.user ? `, ${state.user.name}` : ''}!
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/transactions')}>
        <Text style={styles.buttonText}>{t('goToTransactions')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/wallet')}>
        <Text style={styles.buttonText}>{t('goToWallet')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/profile')}>
        <Text style={styles.buttonText}>{t('profile')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={signOut}>
        <Text style={[styles.buttonText, styles.signOutText]}>{t('signOut')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f3f7f3',
  },
  containerRTL: {
    direction: 'rtl',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#0f5132',
  },
  titleRTL: {
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#0f5132',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    marginTop: 20,
  },
  signOutText: {
    color: '#ffffff',
  },
});

