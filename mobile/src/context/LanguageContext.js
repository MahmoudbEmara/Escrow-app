import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

export const LanguageContext = createContext();

const translations = {
  en: {
    // Getting Started
    skip: 'Skip',
    next: 'NEXT',
    getStarted: 'GET STARTED',
    whatIsWelink: 'What is Edmnly',
    whatIsWelinkDesc: 'Our platform ensure secure to transactions for both buyers and sellers. Weather you\'re dealing with products or services, we\'ve got you covered every step of the way.',
    securePayments: 'Secure Payments',
    securePaymentsDesc: 'All transactions are protected with advanced encryption and secure payment processing. Your money is safe with us until the deal is complete.',
    easyTransactions: 'Easy Transactions',
    easyTransactionsDesc: 'Complete your transactions with just a few taps. Our intuitive interface makes buying and selling simple and straightforward.',
    trustReliability: 'Trust & Reliability',
    trustReliabilityDesc: 'Join thousands of satisfied users who trust Edmnly for their secure transactions. Get started today and experience the difference.',
    
    // Login
    login: 'Login',
    loginOrSignUp: 'Log in or Sign Up Today',
    loginTagline: 'Secure transactions for both buyers and sellers. Whether you\'re dealing with products or services, we\'ve got you covered every step of the way.',
    emailOrUsername: 'Email or Username',
    password: 'Password',
    loginButton: 'Log in',
    signUp: 'Sign Up',
    saveLoginInfo: 'Save login info',
    forgotPassword: 'Forgot Password',
    testHint: 'Test: Use "test" / "test" to login',
    name: 'Name',
    signUpButton: 'Sign Up',
    
    // Home
    welcome: 'Welcome',
    goToTransactions: 'Go to Transactions',
    goToWallet: 'Go to Wallet',
    profile: 'Profile',
    signOut: 'Sign out',
    
    // Wallet
    hello: 'Hello',
    yourWalletBalance: 'Your Wallet Balance',
    fund: 'Fund',
    send: 'Send',
    yourWallet: 'Your Wallet',
    addWallet: 'Add Wallet',
    receive: 'Receive',
    request: 'Request',
    exchange: 'Exchange',
    withdraw: 'Withdraw',
    recentTransactions: 'Recent Transactions',
    seeAll: 'See all',
    
    // Transactions
    transactions: 'Transactions',
    
    // Profile
    editProfile: 'Edit Profile',
    settings: 'Settings',
    helpSupport: 'Help & Support',
    noEmail: 'No email',
    
    // Language
    language: 'Language',
    english: 'English',
    arabic: 'Arabic',
    default: 'Default',
    
    // Tabs
    home: 'Home',
    wallet: 'Wallet',
    
    // Common
    user: 'User',
    escrowApp: 'Escrow App',
    loginFailed: 'Login failed',
  },
  ar: {
    // Getting Started
    skip: 'تخطي',
    next: 'التالي',
    getStarted: 'ابدأ',
    whatIsWelink: 'ما هو اضمنلي',
    whatIsWelinkDesc: 'تضمن منصتنا معاملات آمنة لكل من المشترين والبائعين. سواء كنت تتعامل مع منتجات أو خدمات، فنحن معك في كل خطوة.',
    securePayments: 'المدفوعات الآمنة',
    securePaymentsDesc: 'جميع المعاملات محمية بتشفير متقدم ومعالجة دفع آمنة. أموالك آمنة معنا حتى اكتمال الصفقة.',
    easyTransactions: 'معاملات سهلة',
    easyTransactionsDesc: 'أكمل معاملاتك ببضع نقرات فقط. واجهتنا البديهية تجعل الشراء والبيع بسيطًا ومباشرًا.',
    trustReliability: 'الثقة والموثوقية',
    trustReliabilityDesc: 'انضم إلى آلاف المستخدمين الراضين الذين يثقون باضمنلي لمعاملاتهم الآمنة. ابدأ اليوم واختبر الفرق.',
    
    // Login
    login: 'تسجيل الدخول',
    loginOrSignUp: 'سجل الدخول أو سجل اليوم',
    loginTagline: 'معاملات آمنة لكل من المشترين والبائعين. سواء كنت تتعامل مع منتجات أو خدمات، فنحن معك في كل خطوة.',
    emailOrUsername: 'البريد الإلكتروني أو اسم المستخدم',
    password: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    saveLoginInfo: 'حفظ معلومات تسجيل الدخول',
    forgotPassword: 'نسيت كلمة المرور',
    testHint: 'اختبار: استخدم "test" / "test" لتسجيل الدخول',
    name: 'الاسم',
    signUpButton: 'إنشاء حساب',
    
    // Home
    welcome: 'مرحباً',
    goToTransactions: 'انتقل إلى المعاملات',
    goToWallet: 'انتقل إلى المحفظة',
    profile: 'الملف الشخصي',
    signOut: 'تسجيل الخروج',
    
    // Wallet
    hello: 'مرحباً',
    yourWalletBalance: 'رصيد محفظتك',
    fund: 'تمويل',
    send: 'إرسال',
    yourWallet: 'محفظتك',
    addWallet: 'إضافة محفظة',
    receive: 'استقبال',
    request: 'طلب',
    exchange: 'صرف',
    withdraw: 'سحب',
    recentTransactions: 'المعاملات الأخيرة',
    seeAll: 'عرض الكل',
    
    // Transactions
    transactions: 'المعاملات',
    
    // Profile
    editProfile: 'تعديل الملف الشخصي',
    settings: 'الإعدادات',
    helpSupport: 'المساعدة والدعم',
    noEmail: 'لا يوجد بريد إلكتروني',
    
    // Language
    language: 'اللغة',
    english: 'الإنجليزية',
    arabic: 'العربية',
    default: 'افتراضي',
    
    // Tabs
    home: 'الرئيسية',
    wallet: 'المحفظة',
    
    // Common
    user: 'مستخدم',
    escrowApp: 'تطبيق الضمان',
    loginFailed: 'فشل تسجيل الدخول',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapLanguage = async () => {
      try {
        // Try to get saved language preference
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
          setLanguage(savedLanguage);
          updateRTL(savedLanguage === 'ar');
        } else {
          // Auto-detect device language
          try {
            const locales = Localization.getLocales();
            const deviceLanguage = locales[0]?.languageCode || 'en';
            const detectedLanguage = deviceLanguage.startsWith('ar') ? 'ar' : 'en';
            setLanguage(detectedLanguage);
            updateRTL(detectedLanguage === 'ar');
          } catch (localizationError) {
            console.warn('Localization detection failed:', localizationError);
            // Fallback if localization fails
            setLanguage('en');
            updateRTL(false);
          }
        }
      } catch (e) {
        console.warn('Language bootstrap failed', e);
        setLanguage('en');
        updateRTL(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapLanguage();
  }, []);

  const updateRTL = (isRTL) => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // Note: App restart may be required for RTL changes to fully apply
    }
  };

  const changeLanguage = async (newLanguage) => {
    if (newLanguage === 'en' || newLanguage === 'ar') {
      setLanguage(newLanguage);
      updateRTL(newLanguage === 'ar');
      await AsyncStorage.setItem('appLanguage', newLanguage);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const getLanguageDisplayName = (lang) => {
    if (lang === 'ar') return translations[language]?.arabic || 'Arabic';
    return translations[language]?.english || 'English';
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
        getLanguageDisplayName,
        isLoading,
        isRTL: language === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

