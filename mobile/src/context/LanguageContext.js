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
    earningsAvailableNow: 'Earnings available now',
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    amount: 'Amount',
    milestone: 'Milestone',
    incoming: 'Incoming',
    sellerBy: 'Seller By',
    viewDetails: 'View Details',
    idVerified: 'ID Verified',
    contents: 'Contents',
    messages: 'Messages',
    chats: 'Chats',
    message: 'Message',
    typeMessage: 'Type a message...',
    noMessages: 'No Messages',
    noMessagesDesc: 'You don\'t have any messages yet. Start a conversation from a transaction.',
    
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
    
    // Dashboard
    welcomeBack: 'Welcome back',
    totalInEscrow: 'Total in Escrow',
    incoming: 'Incoming',
    outgoing: 'Outgoing',
    newTransaction: 'New Transaction',
    transactions: 'Transactions',
    startDate: 'Start Date',
    transactionId: 'Transaction ID',
    buyer: 'Buyer',
    seller: 'Seller',
    role: 'Role',
    status: 'Status',
    
    // Wallet
    availableBalance: 'Available Balance',
    escrowBalance: 'Escrow Balance',
    addMoney: 'Add Money',
    paymentHistory: 'Payment History',
    
    // Add Money
    enterAmount: 'Enter Amount',
    quickAmount: 'Quick Amount',
    selectPaymentMethod: 'Select Payment Method',
    continue: 'Continue',
    instapay: 'Instapay',
    inAppWallet: 'In-app Wallet',
    creditCard: 'Credit Card',
    cash: 'Cash',
    
    // Withdraw
    selectWithdrawalMethod: 'Select Withdrawal Method',
    bankAccount: 'Bank Account',
    transferToBank: 'Transfer to your linked bank account',
    transferToWallet: 'Transfer to external wallet',
    withdrawalNote: 'Withdrawal processing may take 1-3 business days depending on your selected method.',
    note: 'Note',
    
    // New Transaction
    newTransactionTitle: 'New Transaction',
    transactionTitle: 'Transaction Title',
    role: 'Role',
    userId: 'User ID',
    amount: 'Amount',
    terms: 'Terms',
    category: 'Category',
    product: 'Product',
    service: 'Service',
    digital: 'Digital',
    other: 'Other',
    feesResponsibility: 'Fees Responsibility',
    splitFees: 'Split Fees',
    deliveryDate: 'Delivery Date',
    confirmInfo: 'I agree that the above information is correct and these are the terms of the contract.',
    transactionSummary: 'Transaction Summary',
    feesPaidBy: 'Fees Paid By',
    confirmTransaction: 'Confirm Transaction',
    
    // Transaction Details
    transactionDetails: 'Transaction Details',
    dispute: 'Dispute',
    confirmDelivery: 'Confirm Delivery',
    noTermsSpecified: 'No terms specified',
    rejectTransaction: 'Reject Transaction',
    confirmRejectTransaction: 'Are you sure you want to reject this transaction?',
    cancelTransaction: 'Cancel Transaction',
    confirmCancelTransaction: 'Are you sure you want to cancel this transaction?',
    yesCancel: 'Yes, Cancel',
    no: 'No',
    success: 'Success',
    error: 'Error',
    delete: 'Delete',
    deleteTransaction: 'Delete Transaction',
    confirmDeleteTransaction: 'Are you sure you want to delete this transaction?',
    transactionDeleted: 'Transaction deleted successfully',
    transactionUpdated: 'Transaction updated successfully',
    transactionCancelled: 'Transaction cancelled',
    disputeOpened: 'Dispute opened successfully',
    pleaseProvideDisputeReason: 'Please provide a dispute reason',
    openDispute: 'Open Dispute',
    failedToOpenDispute: 'Failed to open dispute',
    failedToCancelTransaction: 'Failed to cancel transaction',
    failedToDeleteTransaction: 'Failed to delete transaction. Please try again.',
    accept: 'Accept',
    reject: 'Reject',
    cancel: 'Cancel',
    fundTransaction: 'Fund Transaction',
    pay: 'Pay',
    progressAccepted: 'Accepted',
    progressMoneyInEscrow: 'Money in escrow',
    progressDelivery: 'Delivery',
    progressDeliveryAcceptance: 'Delivery acceptance',
    progressMoneyReleased: 'Money released',
    progressCompleted: 'Completed',
    
    // Settings
    editProfile: 'Edit Profile',
    updatePersonalDetails: 'Update your personal details',
    identityVerification: 'Identity Verification (KYC)',
    status: 'Status',
    verified: 'Verified',
    changePassword: 'Change Password',
    updatePassword: 'Update your password',
    biometricLogin: 'Biometric Login',
    useFingerprint: 'Use fingerprint or face ID',
    twoFactorAuth: 'Two-Factor Authentication',
    extraSecurity: 'Add an extra layer of security',
    pushNotifications: 'Push Notifications',
    receiveNotifications: 'Receive push notifications',
    helpCenter: 'Help Center',
    getHelp: 'Get help and support',
    contactSupport: 'Contact Support',
    getInTouch: 'Get in touch with us',
    termsConditions: 'Terms & Conditions',
    readTerms: 'Read our terms and conditions',
    privacyPolicy: 'Privacy Policy',
    readPrivacy: 'Read our privacy policy',
    logout: 'Logout',
    current: 'Current',
    you: 'You',
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
    earningsAvailableNow: 'الأرباح المتاحة الآن',
    all: 'الكل',
    active: 'نشط',
    inactive: 'غير نشط',
    amount: 'المبلغ',
    milestone: 'مرحلة',
    incoming: 'قادم',
    sellerBy: 'البائع',
    viewDetails: 'عرض التفاصيل',
    idVerified: 'تم التحقق من الهوية',
    contents: 'المحتويات',
    messages: 'الرسائل',
    chats: 'الدردشات',
    message: 'رسالة',
    typeMessage: 'اكتب رسالة...',
    noMessages: 'لا توجد رسائل',
    noMessagesDesc: 'ليس لديك أي رسائل بعد. ابدأ محادثة من معاملة.',
    
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
    
    // Dashboard
    welcomeBack: 'مرحباً بعودتك',
    totalInEscrow: 'إجمالي في الضمان',
    incoming: 'وارد',
    outgoing: 'صادر',
    newTransaction: 'معاملة جديدة',
    transactions: 'المعاملات',
    startDate: 'تاريخ البدء',
    transactionId: 'رقم المعاملة',
    buyer: 'مشتري',
    seller: 'بائع',
    role: 'الدور',
    status: 'الحالة',
    
    // Wallet
    availableBalance: 'الرصيد المتاح',
    escrowBalance: 'رصيد الضمان',
    addMoney: 'إضافة أموال',
    paymentHistory: 'سجل المدفوعات',
    
    // Add Money
    enterAmount: 'أدخل المبلغ',
    quickAmount: 'مبلغ سريع',
    selectPaymentMethod: 'اختر طريقة الدفع',
    continue: 'متابعة',
    instapay: 'إنستاباي',
    inAppWallet: 'محفظة التطبيق',
    creditCard: 'بطاقة ائتمان',
    cash: 'نقد',
    
    // Withdraw
    selectWithdrawalMethod: 'اختر طريقة السحب',
    bankAccount: 'حساب بنكي',
    transferToBank: 'تحويل إلى حسابك البنكي المرتبط',
    transferToWallet: 'تحويل إلى محفظة خارجية',
    withdrawalNote: 'قد تستغرق معالجة السحب من 1 إلى 3 أيام عمل حسب الطريقة المختارة.',
    note: 'ملاحظة',
    
    // New Transaction
    newTransactionTitle: 'معاملة جديدة',
    transactionTitle: 'عنوان المعاملة',
    role: 'الدور',
    userId: 'رقم المستخدم',
    amount: 'المبلغ',
    terms: 'الشروط',
    category: 'الفئة',
    product: 'منتج',
    service: 'خدمة',
    digital: 'رقمي',
    other: 'أخرى',
    feesResponsibility: 'مسؤولية الرسوم',
    splitFees: 'تقسيم الرسوم',
    deliveryDate: 'تاريخ التسليم',
    confirmInfo: 'أوافق على أن المعلومات المذكورة أعلاه صحيحة وهذه هي شروط العقد.',
    transactionSummary: 'ملخص المعاملة',
    feesPaidBy: 'الرسوم مدفوعة من قبل',
    confirmTransaction: 'تأكيد المعاملة',
    
    // Transaction Details
    transactionDetails: 'تفاصيل المعاملة',
    dispute: 'نزاع',
    confirmDelivery: 'تأكيد التسليم',
    noTermsSpecified: 'لا توجد شروط محددة',
    rejectTransaction: 'رفض المعاملة',
    confirmRejectTransaction: 'هل أنت متأكد أنك تريد رفض هذه المعاملة؟',
    cancelTransaction: 'إلغاء المعاملة',
    confirmCancelTransaction: 'هل أنت متأكد أنك تريد إلغاء هذه المعاملة؟',
    yesCancel: 'نعم، إلغاء',
    no: 'لا',
    success: 'نجح',
    error: 'خطأ',
    delete: 'حذف',
    deleteTransaction: 'حذف المعاملة',
    confirmDeleteTransaction: 'هل أنت متأكد أنك تريد حذف هذه المعاملة؟',
    transactionDeleted: 'تم حذف المعاملة بنجاح',
    transactionUpdated: 'تم تحديث المعاملة بنجاح',
    transactionCancelled: 'تم إلغاء المعاملة',
    disputeOpened: 'تم فتح النزاع بنجاح',
    pleaseProvideDisputeReason: 'يرجى تقديم سبب النزاع',
    failedToOpenDispute: 'فشل فتح النزاع',
    failedToCancelTransaction: 'فشل إلغاء المعاملة',
    failedToDeleteTransaction: 'فشل حذف المعاملة. يرجى المحاولة مرة أخرى.',
    accept: 'قبول',
    reject: 'رفض',
    cancel: 'إلغاء',
    fundTransaction: 'تمويل المعاملة',
    pay: 'دفع',
    ok: 'حسناً',
    submit: 'إرسال',
    openDispute: 'فتح نزاع',
    progressAccepted: 'مقبول',
    progressMoneyInEscrow: 'المال في الضمان',
    progressDelivery: 'التسليم',
    progressDeliveryAcceptance: 'قبول التسليم',
    progressMoneyReleased: 'تم إطلاق المال',
    progressCompleted: 'مكتمل',
    
    // Settings
    editProfile: 'تعديل الملف الشخصي',
    updatePersonalDetails: 'تحديث بياناتك الشخصية',
    identityVerification: 'التحقق من الهوية (KYC)',
    status: 'الحالة',
    verified: 'تم التحقق',
    changePassword: 'تغيير كلمة المرور',
    updatePassword: 'تحديث كلمة المرور',
    biometricLogin: 'تسجيل الدخول البيومتري',
    useFingerprint: 'استخدم البصمة أو التعرف على الوجه',
    twoFactorAuth: 'المصادقة الثنائية',
    extraSecurity: 'إضافة طبقة أمان إضافية',
    pushNotifications: 'الإشعارات',
    receiveNotifications: 'تلقي الإشعارات',
    helpCenter: 'مركز المساعدة',
    getHelp: 'الحصول على المساعدة والدعم',
    contactSupport: 'اتصل بالدعم',
    getInTouch: 'تواصل معنا',
    termsConditions: 'الشروط والأحكام',
    readTerms: 'اقرأ شروطنا وأحكامنا',
    privacyPolicy: 'سياسة الخصوصية',
    readPrivacy: 'اقرأ سياسة الخصوصية',
    logout: 'تسجيل الخروج',
    current: 'الحالي',
    you: 'أنت',
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

