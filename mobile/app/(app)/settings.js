import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { User, Lock, Bell, HelpCircle, Shield, ChevronRight, LogOut, FileText, Camera } from 'lucide-react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as DatabaseService from '../../src/services/databaseService';

export default function SettingsScreen() {
  const { signOut, state, dispatch } = useContext(AuthContext);
  const { t, isRTL, language, changeLanguage, getLanguageDisplayName, isLoading: languageLoading } = useContext(LanguageContext);
  const router = useRouter();

  const safeT = (key, fallback = '') => {
    try {
      if (!t || typeof t !== 'function') {
        return fallback || key || '';
      }
      const result = t(key);
      if (result && typeof result === 'string') {
        return result;
      }
      return fallback || key || '';
    } catch (e) {
      return fallback || key || '';
    }
  };

  const safeGetLanguageDisplayName = (lang) => {
    try {
      if (!getLanguageDisplayName || typeof getLanguageDisplayName !== 'function') {
        return lang === 'ar' ? 'Arabic' : 'English';
      }
      if (!lang || (lang !== 'en' && lang !== 'ar')) {
        return 'English';
      }
      const result = getLanguageDisplayName(lang);
      if (result && typeof result === 'string') {
        return result;
      }
      return lang === 'ar' ? 'Arabic' : 'English';
    } catch (e) {
      return lang === 'ar' ? 'Arabic' : 'English';
    }
  };

  const [biometricLogin, setBiometricLogin] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);

  const kycStatus = 'Verified';

  useEffect(() => {
    if (state.user?.profile?.avatar_url) {
      setProfilePicture(state.user.profile.avatar_url);
    }
  }, [state.user?.profile?.avatar_url]);

  const getUserInitials = (name) => {
    if (!name) return 'JD';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfilePicturePress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const mimeType = asset.mimeType || asset.type || 'image/jpeg';
        const uploadResult = await DatabaseService.uploadProfilePicture(
          state.user.id,
          asset,
          mimeType
        );

        if (uploadResult.error) {
          Alert.alert('Error', uploadResult.error);
          setUploading(false);
        } else if (uploadResult.data) {
          setProfilePicture(uploadResult.data.url);
          const updatedProfile = await DatabaseService.getUserProfile(state.user.id);
          if (updatedProfile.data) {
            const updatedUser = {
              ...state.user,
              profile: updatedProfile.data,
            };
            if (dispatch) {
              dispatch({ type: 'UPDATE_USER', user: updatedUser });
            }
          }
          Alert.alert('Success', 'Profile picture updated successfully');
          setUploading(false);
        } else {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
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

  const SettingItem = ({ Icon, title, subtitle, onPress, rightComponent, showChevron = true }) => {
    const isValidReactElement = (element) => {
      return element && typeof element !== 'string' && typeof element !== 'number' && typeof element !== 'boolean';
    };

    const safeTitle = title != null ? String(title) : '';
    const safeSubtitle = subtitle != null && String(subtitle).trim() ? String(subtitle) : null;

    return (
      <TouchableOpacity
        style={[styles.settingItem, isRTL && styles.settingItemRTL]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.settingItemLeft, isRTL && styles.settingItemLeftRTL]}>
          <View style={styles.settingIcon}>
            {Icon ? <Icon size={20} color="#4b5563" /> : null}
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{safeTitle}</Text>
            {safeSubtitle ? (
              <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{safeSubtitle}</Text>
            ) : null}
          </View>
        </View>
        {isValidReactElement(rightComponent) ? rightComponent : (showChevron ? <ChevronRight size={20} color="#9ca3af" /> : null)}
      </TouchableOpacity>
    );
  };

  if (languageLoading || !t || typeof t !== 'function' || !getLanguageDisplayName || typeof getLanguageDisplayName !== 'function') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

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
          <Text style={[styles.title, isRTL && styles.textRTL]}>{safeT('settings', 'Settings')}</Text>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSectionContainer}>
          <View style={[styles.profileSection, isRTL && styles.profileSectionRTL]}>
            <TouchableOpacity
              onPress={handleProfilePicturePress}
              disabled={uploading}
              activeOpacity={0.8}
              style={styles.profileImageContainer}
            >
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#2563eb', '#9333ea']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileImage}
                >
                  <Text style={styles.profileInitials}>
                    {getUserInitials(state.user?.profile?.name || state.user?.email || 'User')}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.cameraButton}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Camera size={16} color="#ffffff" strokeWidth={2} />
                )}
              </View>
            </TouchableOpacity>
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
                Alert.alert(safeT('editProfile', 'Edit Profile'), safeT('updatePersonalDetails', 'Update Personal Details'));
              }}
            >
              <Text style={styles.editButtonText}>{safeT('editProfile', 'Edit Profile')}</Text>
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
                title={safeT('editProfile', 'Edit Profile')}
                subtitle={safeT('updatePersonalDetails', 'Update Personal Details')}
                onPress={() => Alert.alert(safeT('editProfile', 'Edit Profile'), safeT('updatePersonalDetails', 'Update Personal Details'))}
              />
              <SettingItem
                Icon={Shield}
                title={safeT('identityVerification', 'Identity Verification')}
                subtitle={`${safeT('status', 'Status')}: ${safeT('verified', 'Verified')}`}
                onPress={() => Alert.alert('KYC', `${safeT('status', 'Status')}: ${safeT('verified', 'Verified')}`)}
                rightComponent={
                  <View style={[styles.statusBadge, kycStatus === 'Verified' && styles.statusBadgeVerified]}>
                    <Text style={[styles.statusText, kycStatus === 'Verified' && styles.statusTextVerified]}>
                      {safeT('verified', 'Verified')}
                    </Text>
                  </View>
                }
              />
              <SettingItem
                Icon={Lock}
                title={safeT('changePassword', 'Change Password')}
                subtitle={safeT('updatePassword', 'Update Password')}
                onPress={() => Alert.alert(safeT('changePassword', 'Change Password'), safeT('updatePassword', 'Update Password'))}
              />
              <SettingItem
                Icon={Bell}
                title={safeT('language', 'Language')}
                subtitle={`${safeT('current', 'Current')}: ${safeGetLanguageDisplayName(language || 'en')}`}
                onPress={() => {
                  const currentLang = language || 'en';
                  const newLanguage = currentLang === 'en' ? 'ar' : 'en';
                  changeLanguage(newLanguage);
                  Alert.alert(
                    safeT('language', 'Language'),
                    `${safeT('language', 'Language')} ${safeGetLanguageDisplayName(newLanguage)}`,
                    [{ text: 'OK' }]
                  );
                }}
                rightComponent={
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageText}>{safeGetLanguageDisplayName(language || 'en')}</Text>
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
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{safeT('biometricLogin', 'Biometric Login')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{safeT('useFingerprint', 'Use Fingerprint')}</Text>
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
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{safeT('twoFactorAuth', 'Two Factor Auth')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{safeT('extraSecurity', 'Extra Security')}</Text>
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
                    <Bell size={20} color="#4b5563" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{safeT('pushNotifications', 'Push Notifications')}</Text>
                    <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{safeT('receiveNotifications', 'Receive Notifications')}</Text>
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
                title={safeT('helpCenter', 'Help Center')}
                subtitle={safeT('getHelp', 'Get Help')}
                onPress={() => Alert.alert(safeT('helpCenter', 'Help Center'), safeT('getHelp', 'Get Help'))}
              />
              <SettingItem
                Icon={Bell}
                title={safeT('contactSupport', 'Contact Support')}
                subtitle={safeT('getInTouch', 'Get In Touch')}
                onPress={() => Alert.alert(safeT('contactSupport', 'Contact Support'), safeT('getInTouch', 'Get In Touch'))}
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
                title={safeT('termsConditions', 'Terms & Conditions')}
                subtitle={safeT('readTerms', 'Read Terms')}
                onPress={() => Alert.alert(safeT('termsConditions', 'Terms & Conditions'), safeT('readTerms', 'Read Terms'))}
              />
              <SettingItem
                Icon={Shield}
                title={safeT('privacyPolicy', 'Privacy Policy')}
                subtitle={safeT('readPrivacy', 'Read Privacy')}
                onPress={() => Alert.alert(safeT('privacyPolicy', 'Privacy Policy'), safeT('readPrivacy', 'Read Privacy'))}
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.logoutButtonText}>{safeT('logout', 'Logout')}</Text>
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
  profileImageContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  profileImage: {
    width: 64, // w-16 from Figma
    height: 64, // h-16 from Figma
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 32, // w-8 from Figma
    height: 32, // h-8 from Figma
    borderRadius: 16,
    backgroundColor: '#155dfc', // Blue from Figma
    borderWidth: 2,
    borderColor: '#ffffff',
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
