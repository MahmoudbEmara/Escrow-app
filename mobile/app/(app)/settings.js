import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, Bell, HelpCircle, Shield, ChevronRight, LogOut, FileText } from 'lucide-react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function SettingsScreen() {
  const { signOut, state } = useContext(AuthContext);
  const { t, isRTL, language, changeLanguage, getLanguageDisplayName } = useContext(LanguageContext);
  const router = useRouter();

  const [biometricLogin, setBiometricLogin] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const kycStatus = 'Verified'; // This would come from your backend

  const getUserInitials = (name) => {
    if (!name) return 'JD';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const SettingItem = ({ Icon, title, subtitle, onPress, rightComponent, showChevron = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, isRTL && styles.settingItemRTL]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
        <View style={styles.settingIcon}>
          {Icon && <Icon size={20} color="#4b5563" />} {/* w-5 h-5 text-gray-600 from Figma */}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showChevron && <ChevronRight size={20} color="#9ca3af" />)} {/* w-5 h-5 text-gray-400 from Figma */}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('settings')}</Text>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSectionContainer}>
          <View style={[styles.profileSection, isRTL && styles.profileSectionRTL]}>
            <LinearGradient
              colors={['#2563eb', '#9333ea']} // blue-600 to purple-700 from Figma
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileImage}
            >
              <Text style={styles.profileInitials}>
                {getUserInitials(state.user?.profile?.name || state.user?.email || 'User')}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, isRTL && styles.textRTL]}>
                {state.user?.profile?.name || state.user?.email || 'User'}
              </Text>
              <Text style={[styles.profileEmail, isRTL && styles.textRTL]}>
                {state.user?.email || state.user?.profile?.email || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                // Navigate to edit profile
                Alert.alert(t('editProfile'), t('updatePersonalDetails'));
              }}
            >
              <Text style={styles.editButtonText}>{t('editProfile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Account</Text>
            <View style={styles.sectionItems}>
              <SettingItem
                Icon={User}
                title={t('editProfile')}
                subtitle={t('updatePersonalDetails')}
                onPress={() => Alert.alert(t('editProfile'), t('updatePersonalDetails'))}
              />
              <SettingItem
                Icon={Shield}
                title={t('identityVerification')}
                subtitle={`${t('status')}: ${t('verified')}`}
                onPress={() => Alert.alert('KYC', `${t('status')}: ${t('verified')}`)}
                rightComponent={
                  <View style={[styles.statusBadge, kycStatus === 'Verified' && styles.statusBadgeVerified]}>
                    <Text style={[styles.statusText, kycStatus === 'Verified' && styles.statusTextVerified]}>
                      {t('verified')}
                    </Text>
                  </View>
                }
              />
              <SettingItem
                Icon={Lock}
                title={t('changePassword')}
                subtitle={t('updatePassword')}
                onPress={() => Alert.alert(t('changePassword'), t('updatePassword'))}
              />
              <SettingItem
                Icon={Bell}
                title={t('language')}
                subtitle={`${t('current')}: ${getLanguageDisplayName(language)}`}
                onPress={() => {
                  const newLanguage = language === 'en' ? 'ar' : 'en';
                  changeLanguage(newLanguage);
                  Alert.alert(
                    t('language'),
                    `${t('language')} ${getLanguageDisplayName(newLanguage)}`,
                    [{ text: 'OK' }]
                  );
                }}
                rightComponent={
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageText}>{getLanguageDisplayName(language)}</Text>
                  </View>
                }
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Security</Text>
            <View style={styles.sectionItems}>
              <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
                <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
                  <View style={styles.settingIcon}>
                    <Lock size={20} color="#4b5563" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('biometricLogin')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('useFingerprint')}</Text>
                  </View>
                </View>
                <Switch
                  value={biometricLogin}
                  onValueChange={setBiometricLogin}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>
              <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
                <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
                  <View style={styles.settingIcon}>
                    <Shield size={20} color="#4b5563" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('twoFactorAuth')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('extraSecurity')}</Text>
                  </View>
                </View>
                <Switch
                  value={twoFactorAuth}
                  onValueChange={setTwoFactorAuth}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Notifications</Text>
            <View style={styles.sectionItems}>
              <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
                <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
                  <View style={styles.settingIcon}>
                    <Bell size={20} color="#4b5563" /> {/* w-5 h-5 text-gray-600 from Figma */}
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('pushNotifications')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('receiveNotifications')}</Text>
                  </View>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Help</Text>
            <View style={styles.sectionItems}>
              <SettingItem
                Icon={HelpCircle}
                title={t('helpCenter')}
                subtitle={t('getHelp')}
                onPress={() => Alert.alert(t('helpCenter'), t('getHelp'))}
              />
              <SettingItem
                Icon={Bell}
                title={t('contactSupport')}
                subtitle={t('getInTouch')}
                onPress={() => Alert.alert(t('contactSupport'), t('getInTouch'))}
              />
            </View>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Legal</Text>
            <View style={styles.sectionItems}>
              <SettingItem
                Icon={FileText}
                title={t('termsConditions')}
                subtitle={t('readTerms')}
                onPress={() => Alert.alert(t('termsConditions'), t('readTerms'))}
              />
              <SettingItem
                Icon={Shield}
                title={t('privacyPolicy')}
                subtitle={t('readPrivacy')}
                onPress={() => Alert.alert(t('privacyPolicy'), t('readPrivacy'))}
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to ensure content is not hidden under bottom bar
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827', // gray-900 from Figma
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24, // p-6 from Figma
    paddingVertical: 24, // p-6 from Figma
    gap: 16, // gap-4 from Figma
  },
  profileSectionContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  profileImage: {
    width: 64, // w-16 from Figma
    height: 64, // h-16 from Figma
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageRTL: {
    marginRight: 0,
    marginLeft: 16,
  },
  profileSectionRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  settingItemRTL: {
    flexDirection: 'row-reverse',
  },
  settingItemLeftRTL: {
    flexDirection: 'row-reverse',
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827', // gray-900 from Figma
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280', // gray-500 from Figma
  },
  editButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2563eb', // text-blue-600 from Figma
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    marginBottom: 8, // mb-2 from Figma
  },
  section: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280', // gray-500 from Figma
    paddingHorizontal: 24, // px-6 from Figma
    paddingVertical: 12, // py-3 from Figma
    marginBottom: 0,
    textTransform: 'none',
    letterSpacing: 0,
  },
  sectionItems: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16, // py-4 from Figma
    paddingHorizontal: 24, // px-6 from Figma
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6', // border-gray-100 from Figma
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16, // gap-4 from Figma (1rem = 16px)
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6', // gray-100 from Figma
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconText: {
    fontSize: 20,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827', // gray-900 from Figma
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280', // gray-500 from Figma
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
  },
  chevronRTL: {
    marginLeft: 0,
    marginRight: 8,
    transform: [{ scaleX: -1 }],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  statusBadgeVerified: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  statusTextVerified: {
    color: '#065f46',
  },
  languageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  logoutSection: {
    paddingHorizontal: 24, // p-6 from Figma
    paddingTop: 24, // p-6 from Figma
    paddingBottom: 24, // p-6 from Figma
  },
  logoutButton: {
    backgroundColor: '#fef2f2', // red-50 from Figma
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#dc2626', // red-600 from Figma
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0,
  },
  versionSection: {
    paddingTop: 0,
    paddingBottom: 24, // pb-6 from Figma
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#9ca3af', // gray-400 from Figma
  },
});
