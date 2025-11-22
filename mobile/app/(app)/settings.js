import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
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

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, showChevron = true }) => (
    <TouchableOpacity
      style={[styles.settingItem, isRTL && styles.settingItemRTL]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
        <View style={styles.settingIcon}>
          <Text style={styles.settingIconText}>{icon}</Text>
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showChevron && <Text style={[styles.chevron, isRTL && styles.chevronRTL]}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('settings')}</Text>
        </View>

        {/* User Profile Section */}
        <View style={[styles.profileSection, isRTL && styles.profileSectionRTL]}>
          <View style={styles.profileImage}>
            <Text style={styles.profileInitials}>
              {getUserInitials(state.user?.profile?.name || state.user?.email || 'User')}
            </Text>
          </View>
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

        <View style={styles.divider} />

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Account</Text>
          <SettingItem
            icon="👤"
            title={t('editProfile')}
            subtitle={t('updatePersonalDetails')}
            onPress={() => Alert.alert(t('editProfile'), t('updatePersonalDetails'))}
          />
          <SettingItem
            icon="🛡️"
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
            icon="🔒"
            title={t('changePassword')}
            subtitle={t('updatePassword')}
            onPress={() => Alert.alert(t('changePassword'), t('updatePassword'))}
          />
          <SettingItem
            icon="🌐"
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

        <View style={styles.divider} />

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Security</Text>
          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🔐</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('biometricLogin')}</Text>
                <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('useFingerprint')}</Text>
              </View>
            </View>
            <Switch
              value={biometricLogin}
              onValueChange={setBiometricLogin}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🔑</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('twoFactorAuth')}</Text>
                <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('extraSecurity')}</Text>
              </View>
            </View>
            <Switch
              value={twoFactorAuth}
              onValueChange={setTwoFactorAuth}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Notifications</Text>
          <View style={[styles.settingItem, isRTL && styles.settingItemRTL]}>
            <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🔔</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{t('pushNotifications')}</Text>
                <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{t('receiveNotifications')}</Text>
              </View>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Help</Text>
          <SettingItem
            icon="❓"
            title={t('helpCenter')}
            subtitle={t('getHelp')}
            onPress={() => Alert.alert(t('helpCenter'), t('getHelp'))}
          />
          <SettingItem
            icon="💬"
            title={t('contactSupport')}
            subtitle={t('getInTouch')}
            onPress={() => Alert.alert(t('contactSupport'), t('getInTouch'))}
          />
        </View>

        <View style={styles.divider} />

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>Legal</Text>
          <SettingItem
            icon="📄"
            title={t('termsConditions')}
            subtitle={t('readTerms')}
            onPress={() => Alert.alert(t('termsConditions'), t('readTerms'))}
          />
          <SettingItem
            icon="🔒"
            title={t('privacyPolicy')}
            subtitle={t('readPrivacy')}
            onPress={() => Alert.alert(t('privacyPolicy'), t('readPrivacy'))}
          />
        </View>

        <View style={styles.divider} />

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconText: {
    fontSize: 20,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#64748b',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
