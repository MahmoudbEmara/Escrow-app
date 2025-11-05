import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { signOut, state } = useContext(AuthContext);
  const { t, language, changeLanguage, getLanguageDisplayName, isRTL } = useContext(LanguageContext);
  const router = useRouter();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {state.user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{state.user?.name || t('user')}</Text>
        <Text style={styles.email}>{state.user?.email || t('noEmail')}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]}>
          <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('editProfile')}</Text>
          <Text style={styles.menuArrow}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.menuItem, isRTL && styles.menuItemRTL]}
          onPress={() => setShowLanguageModal(true)}
        >
          <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('language')}</Text>
          <Text style={styles.menuArrow}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]}>
          <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('helpSupport')}</Text>
          <Text style={styles.menuArrow}>{isRTL ? '‹' : '›'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('signOut')}</Text>
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{t('language')}</Text>
            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionActive]}
              onPress={() => {
                changeLanguage('en');
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.flag}>🇬🇧</Text>
              <Text style={[styles.languageOptionText, language === 'en' && styles.languageOptionTextActive]}>
                {t('english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, language === 'ar' && styles.languageOptionActive]}
              onPress={() => {
                changeLanguage('ar');
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.flag}>🇸🇦</Text>
              <Text style={[styles.languageOptionText, language === 'ar' && styles.languageOptionTextActive]}>
                {t('arabic')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7f3',
    paddingTop: 60,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f5132',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuText: {
    fontSize: 16,
    color: '#0f172a',
  },
  menuArrow: {
    fontSize: 20,
    color: '#64748b',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  containerRTL: {
    direction: 'rtl',
  },
  menuItemRTL: {
    flexDirection: 'row-reverse',
  },
  menuTextRTL: {
    textAlign: 'right',
  },
  // Language Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#1e40af',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 12,
    fontWeight: '500',
  },
  languageOptionTextActive: {
    color: '#1e40af',
    fontWeight: 'bold',
  },
  flag: {
    fontSize: 20,
  },
});

