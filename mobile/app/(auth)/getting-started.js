
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Modal, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../src/context/LanguageContext';
import { ShieldCheck, CreditCard, Smartphone, Heart, ChevronRight, ChevronLeft, Globe } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function GettingStartedScreen() {
  const router = useRouter();
  const { t, language, changeLanguage, getLanguageDisplayName, isRTL } = useContext(LanguageContext);
  const [currentPage, setCurrentPage] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const onboardingData = [
    {
      titleKey: 'whatIsWelink',
      descriptionKey: 'whatIsWelinkDesc',
      icon: ShieldCheck,
      color: '#4F46E5', // Indigo 600
    },
    {
      titleKey: 'securePayments',
      descriptionKey: 'securePaymentsDesc',
      icon: CreditCard,
      color: '#0EA5E9', // Sky 500
    },
    {
      titleKey: 'easyTransactions',
      descriptionKey: 'easyTransactionsDesc',
      icon: Smartphone,
      color: '#10B981', // Emerald 500
    },
    {
      titleKey: 'trustReliability',
      descriptionKey: 'trustReliabilityDesc',
      icon: Heart,
      color: '#EC4899', // Pink 500
    },
  ];

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleGetStarted = () => {
    router.replace('/(auth)/login');
  };

  const isLastPage = currentPage === onboardingData.length - 1;
  const isFirstPage = currentPage === 0;
  const CurrentIcon = onboardingData[currentPage].icon;
  const currentColor = onboardingData[currentPage].color;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Background Elements */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.languageIconContainer}>
              <Globe size={18} color="#475569" />
            </View>
            <Text style={styles.languageText}>{getLanguageDisplayName(language)}</Text>
          </TouchableOpacity>

          {!isLastPage && (
            <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.7}>
              <Text style={styles.skipButton}>{t('skip')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Illustration Area */}
          <View style={styles.illustrationContainer}>
            <View style={[styles.iconCircle, { shadowColor: currentColor }]}>
              <LinearGradient
                colors={[currentColor, '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.iconBackground, { opacity: 0.1 }]}
              />
              <CurrentIcon size={80} color={currentColor} strokeWidth={1.5} />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, isRTL && styles.textRTL]}>
              {t(onboardingData[currentPage].titleKey)}
            </Text>
            <Text style={[styles.description, isRTL && styles.textRTL]}>
              {t(onboardingData[currentPage].descriptionKey)}
            </Text>
          </View>

          {/* Pagination */}
          <View style={styles.paginationContainer}>
            {onboardingData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentPage && styles.dotActive,
                  index === currentPage && { backgroundColor: currentColor, width: 24 }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Footer Navigation */}
        <View style={[styles.footer, isRTL && styles.footerRTL]}>
          <View style={styles.navButtonContainer}>
            {!isFirstPage ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePrevious}
                activeOpacity={0.7}
              >
                {isRTL ? <ChevronRight size={24} color="#64748b" /> : <ChevronLeft size={24} color="#64748b" />}
              </TouchableOpacity>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentColor }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {isLastPage ? t('getStarted') : t('next')}
            </Text>
            {!isLastPage && (
              isRTL ? <ChevronLeft size={20} color="#ffffff" /> : <ChevronRight size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Language Modal */}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            <View style={styles.languageList}>
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
                {language === 'en' && <View style={styles.activeIndicator} />}
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
                {language === 'ar' && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  backgroundCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  backgroundCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F8FAFC',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    height: 60,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  languageIconContainer: {
    width: 20,
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  skipButton: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  textContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 26,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'center', // Keep centered for onboarding
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    // Color and width set dynamically
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  navButtonContainer: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButtonPlaceholder: {
    width: 48,
    height: 48,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageList: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  languageOptionTextActive: {
    color: '#1e40af',
    fontWeight: 'bold',
  },
});

