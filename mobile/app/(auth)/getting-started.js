import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function GettingStartedScreen() {
  const router = useRouter();
  const { t, language, changeLanguage, getLanguageDisplayName, isRTL } = useContext(LanguageContext);
  const [currentPage, setCurrentPage] = useState(0);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const onboardingData = [
    {
      titleKey: 'whatIsWelink',
      descriptionKey: 'whatIsWelinkDesc',
      illustration: 'security',
    },
    {
      titleKey: 'securePayments',
      descriptionKey: 'securePaymentsDesc',
      illustration: 'payment',
    },
    {
      titleKey: 'easyTransactions',
      descriptionKey: 'easyTransactionsDesc',
      illustration: 'easy',
    },
    {
      titleKey: 'trustReliability',
      descriptionKey: 'trustReliabilityDesc',
      illustration: 'trust',
    },
  ];

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleGetStarted = () => {
    router.replace('/(auth)/login');
  };

  const isLastPage = currentPage === onboardingData.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity style={styles.languageSelector} onPress={() => setShowLanguageModal(true)}>
          <Text style={styles.flag}>{language === 'ar' ? '🇸🇦' : '🇬🇧'}</Text>
          <Text style={styles.languageText}>{getLanguageDisplayName(language)}</Text>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        {!isLastPage && (
          <TouchableOpacity onPress={handleGetStarted}>
            <Text style={styles.skipButton}>{t('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Central Illustration Area */}
      <View style={styles.illustrationContainer}>
        {onboardingData[currentPage] && onboardingData[currentPage].illustration === 'security' && (
          <>
            {/* Shield with Padlock */}
            <View style={styles.shieldContainer}>
              <View style={styles.shield}>
                <View style={styles.padlock}>
                  <View style={styles.padlockBody} />
                  <View style={styles.padlockArch} />
                </View>
              </View>
            </View>

            {/* Two Figures Shaking Hands */}
            <View style={styles.figuresContainer}>
              {/* Figure 1 - Traditional Arab Attire */}
              <View style={styles.figure1}>
                <View style={styles.head1} />
                <View style={styles.body1}>
                  <View style={styles.robe1} />
                </View>
                <View style={styles.arm1Left} />
                <View style={styles.arm1Right} />
              </View>

              {/* Handshake */}
              <View style={styles.handshake}>
                <View style={styles.handshakeCircle} />
              </View>

              {/* Figure 2 - Business Casual */}
              <View style={styles.figure2}>
                <View style={styles.head2} />
                <View style={styles.body2}>
                  <View style={styles.shirt2} />
                  <View style={styles.tie2} />
                </View>
                <View style={styles.arm2Left} />
                <View style={styles.arm2Right}>
                  <View style={styles.briefcase} />
                </View>
              </View>
            </View>
          </>
        )}

        {onboardingData[currentPage] && onboardingData[currentPage].illustration === 'payment' && (
          <View style={styles.paymentIllustration}>
            <View style={styles.card}>
              <View style={styles.cardLine} />
              <View style={styles.cardLine} />
              <View style={styles.cardChip} />
              <View style={styles.cardNumber}>
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
                <View style={styles.cardDot} />
              </View>
            </View>
            <View style={styles.checkmark}>
              <View style={styles.checkmarkLeft} />
              <View style={styles.checkmarkRight} />
            </View>
          </View>
        )}

        {onboardingData[currentPage] && onboardingData[currentPage].illustration === 'easy' && (
          <View style={styles.easyIllustration}>
            <View style={styles.phone}>
              <View style={styles.phoneScreen}>
                <View style={styles.phoneIcon1} />
                <View style={styles.phoneIcon2} />
                <View style={styles.phoneIcon3} />
              </View>
            </View>
            <View style={styles.arrowRight}>
              <View style={styles.arrowLine} />
              <View style={styles.arrowHead} />
            </View>
          </View>
        )}

        {onboardingData[currentPage] && onboardingData[currentPage].illustration === 'trust' && (
          <View style={styles.trustIllustration}>
            <Text style={styles.star1}>⭐</Text>
            <Text style={styles.star2}>⭐</Text>
            <Text style={styles.star3}>⭐</Text>
            <Text style={styles.star4}>⭐</Text>
            <Text style={styles.star5}>⭐</Text>
            <Text style={styles.heart}>❤️</Text>
          </View>
        )}

        {/* Decorative Waves */}
        <View style={styles.wave1} />
        <View style={styles.wave2} />
        <View style={styles.wave3} />
      </View>

      {/* Bottom Content Section */}
      <View style={[styles.contentSection, isRTL && styles.contentSectionRTL]}>
        {onboardingData[currentPage] && (
          <>
            <Text style={[styles.title, isRTL && styles.titleRTL]}>{t(onboardingData[currentPage].titleKey)}</Text>
            <Text style={[styles.description, isRTL && styles.descriptionRTL]}>{t(onboardingData[currentPage].descriptionKey)}</Text>
          </>
        )}

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
          <Text style={styles.getStartedText}>
            {isLastPage ? t('getStarted') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  languageText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 10,
    color: '#64748b',
  },
  skipButton: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIcon: {
    width: 50,
    height: 50,
    position: 'relative',
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  illustrationContainer: {
    flex: 1,
    backgroundColor: '#1e40af',
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  shieldContainer: {
    position: 'absolute',
    left: 30,
    top: 60,
    zIndex: 2,
  },
  shield: {
    width: 100,
    height: 120,
    backgroundColor: '#93c5fd',
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  padlock: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  padlockBody: {
    width: 30,
    height: 25,
    backgroundColor: '#1e3a8a',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
    left: 5,
  },
  padlockArch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#1e3a8a',
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
    left: 5,
  },
  figuresContainer: {
    position: 'absolute',
    right: 20,
    top: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 1,
  },
  figure1: {
    width: 60,
    height: 140,
    position: 'relative',
  },
  head1: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#fbbf24',
    borderWidth: 2,
    borderColor: '#78350f',
    position: 'absolute',
    top: 0,
    left: 12.5,
  },
  body1: {
    width: 50,
    height: 100,
    position: 'absolute',
    top: 30,
    left: 5,
  },
  robe1: {
    width: 50,
    height: 100,
    backgroundColor: '#ffffff',
    borderRadius: 25,
  },
  arm1Left: {
    width: 12,
    height: 40,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    position: 'absolute',
    top: 40,
    left: -5,
    transform: [{ rotate: '-20deg' }],
  },
  arm1Right: {
    width: 12,
    height: 50,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    position: 'absolute',
    top: 35,
    right: -5,
    transform: [{ rotate: '15deg' }],
  },
  handshake: {
    width: 30,
    height: 30,
    position: 'absolute',
    bottom: 60,
    left: '50%',
    marginLeft: -15,
    zIndex: 3,
  },
  handshakeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fbbf24',
    borderWidth: 2,
    borderColor: '#78350f',
  },
  figure2: {
    width: 60,
    height: 140,
    position: 'relative',
  },
  head2: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#fbbf24',
    borderWidth: 2,
    borderColor: '#78350f',
    position: 'absolute',
    top: 0,
    left: 12.5,
  },
  body2: {
    width: 50,
    height: 100,
    position: 'absolute',
    top: 30,
    left: 5,
  },
  shirt2: {
    width: 50,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  tie2: {
    width: 8,
    height: 60,
    backgroundColor: '#1e3a8a',
    position: 'absolute',
    top: 10,
    left: 21,
    borderRadius: 4,
  },
  arm2Left: {
    width: 12,
    height: 50,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    position: 'absolute',
    top: 35,
    left: -5,
    transform: [{ rotate: '-15deg' }],
  },
  arm2Right: {
    width: 12,
    height: 40,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    position: 'absolute',
    top: 40,
    right: -5,
    transform: [{ rotate: '20deg' }],
  },
  briefcase: {
    width: 20,
    height: 25,
    backgroundColor: '#92400e',
    borderRadius: 3,
    position: 'absolute',
    top: 45,
    right: -15,
    borderWidth: 2,
    borderColor: '#78350f',
  },
  wave1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.6,
  },
  wave2: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#60a5fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.5,
  },
  wave3: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: '#93c5fd',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.4,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentSectionRTL: {
    direction: 'rtl',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleRTL: {
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 30,
  },
  descriptionRTL: {
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#1e40af',
  },
  getStartedButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Payment Illustration Styles
  paymentIllustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  card: {
    width: 200,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardLine: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 12,
  },
  cardChip: {
    width: 40,
    height: 30,
    backgroundColor: '#fbbf24',
    borderRadius: 4,
    marginBottom: 12,
  },
  cardNumber: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
  },
  checkmark: {
    position: 'absolute',
    right: 40,
    top: 60,
    width: 60,
    height: 60,
  },
  checkmarkLeft: {
    width: 20,
    height: 4,
    backgroundColor: '#22c55e',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    left: 10,
    top: 30,
  },
  checkmarkRight: {
    width: 30,
    height: 4,
    backgroundColor: '#22c55e',
    transform: [{ rotate: '-45deg' }],
    position: 'absolute',
    left: 20,
    top: 30,
  },
  // Easy Illustration Styles
  easyIllustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  phone: {
    width: 120,
    height: 200,
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  phoneIcon1: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  phoneIcon2: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#22c55e',
  },
  phoneIcon3: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  arrowRight: {
    width: 80,
    height: 4,
    position: 'relative',
  },
  arrowLine: {
    width: 60,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderLeftColor: '#ffffff',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    position: 'absolute',
    right: 0,
    top: -6,
  },
  // Trust Illustration Styles
  trustIllustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  star1: {
    position: 'absolute',
    top: 40,
    left: 60,
    fontSize: 40,
  },
  star2: {
    position: 'absolute',
    top: 80,
    right: 70,
    fontSize: 35,
  },
  star3: {
    position: 'absolute',
    bottom: 100,
    left: 50,
    fontSize: 45,
  },
  star4: {
    position: 'absolute',
    bottom: 80,
    right: 50,
    fontSize: 38,
  },
  star5: {
    position: 'absolute',
    top: 120,
    left: '50%',
    marginLeft: -20,
    fontSize: 42,
  },
  heart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
    fontSize: 50,
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
});

