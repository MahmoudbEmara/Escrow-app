import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function WithdrawScreen() {
  const router = useRouter();
  const { t, isRTL } = useContext(LanguageContext);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  const availableBalance = 3850.00;
  const quickAmounts = [100, 500, 1000];

  const withdrawalMethods = [
    {
      id: 'bank',
      name: t('bankAccount'),
      description: t('transferToBank'),
      icon: '🏦',
      color: '#3b82f6',
    },
    {
      id: 'wallet',
      name: t('wallet'),
      description: t('transferToWallet'),
      icon: '💼',
      color: '#8b5cf6',
    },
  ];

  const handleQuickAmount = (value) => {
    if (value === 'all') {
      setAmount(availableBalance.toString());
    } else {
      setAmount(value.toString());
    }
  };

  const isWithdrawEnabled = amount && parseFloat(amount) > 0 && parseFloat(amount) <= availableBalance && selectedMethod;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity onPress={() => router.push('/(app)/wallet')} style={styles.backButton}>
            <Text style={[styles.backIcon, isRTL && styles.backIconRTL]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('withdraw')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Available Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, isRTL && styles.textRTL]}>{t('availableBalance')}</Text>
          <Text style={[styles.balanceAmount, isRTL && styles.textRTL]}>{availableBalance.toFixed(2)} EGP</Text>
        </View>

        {/* Enter Amount Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('enterAmount')}</Text>
          <View style={[styles.amountInputContainer, isRTL && styles.amountInputContainerRTL]}>
            <Text style={styles.currencySymbol}>EGP</Text>
            <TextInput
              style={[styles.amountInput, isRTL && styles.textRTL]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        {/* Quick Amount Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('quickAmount')}</Text>
          <View style={[styles.quickAmountContainer, isRTL && styles.quickAmountContainerRTL]}>
            {quickAmounts.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  amount === value.toString() && styles.quickAmountButtonActive
                ]}
                onPress={() => handleQuickAmount(value)}
              >
                <Text style={[
                  styles.quickAmountText,
                  amount === value.toString() && styles.quickAmountTextActive
                ]}>
                  {value} EGP
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.quickAmountButton,
                amount === availableBalance.toString() && styles.quickAmountButtonActive
              ]}
              onPress={() => handleQuickAmount('all')}
            >
              <Text style={[
                styles.quickAmountText,
                amount === availableBalance.toString() && styles.quickAmountTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Select Withdrawal Method Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('selectWithdrawalMethod')}</Text>
          <View style={styles.withdrawalMethodsContainer}>
            {withdrawalMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.withdrawalMethodCard,
                  selectedMethod === method.id && styles.withdrawalMethodCardActive,
                  isRTL && styles.withdrawalMethodCardRTL
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={[styles.withdrawalMethodIcon, { backgroundColor: method.color }]}>
                  <Text style={styles.withdrawalMethodIconText}>{method.icon}</Text>
                </View>
                <View style={styles.withdrawalMethodInfo}>
                  <Text style={[
                    styles.withdrawalMethodName,
                    selectedMethod === method.id && styles.withdrawalMethodNameActive,
                    isRTL && styles.textRTL
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={[styles.withdrawalMethodDescription, isRTL && styles.textRTL]}>
                    {method.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={[styles.noteText, isRTL && styles.textRTL]}>
            <Text style={styles.noteLabel}>{t('note')}: </Text>
            {t('withdrawalNote')}
          </Text>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            !isWithdrawEnabled && styles.withdrawButtonDisabled
          ]}
          disabled={!isWithdrawEnabled}
          onPress={() => {
            // Handle withdraw action
            console.log('Withdraw:', { amount, method: selectedMethod });
          }}
        >
          <Text style={[
            styles.withdrawButtonText,
            !isWithdrawEnabled && styles.withdrawButtonTextDisabled
          ]}>
            {t('withdraw')} {amount || '0.00'} EGP
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#0f172a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  placeholder: {
    width: 40,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  quickAmountTextActive: {
    color: '#ffffff',
  },
  withdrawalMethodsContainer: {
    gap: 12,
  },
  withdrawalMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  withdrawalMethodCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  withdrawalMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  withdrawalMethodIconText: {
    fontSize: 24,
  },
  withdrawalMethodInfo: {
    flex: 1,
  },
  withdrawalMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  withdrawalMethodNameActive: {
    color: '#3b82f6',
  },
  withdrawalMethodDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  noteContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
  },
  noteText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  noteLabel: {
    fontWeight: 'bold',
  },
  withdrawButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  withdrawButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  withdrawButtonTextDisabled: {
    color: '#94a3b8',
  },
  textRTL: {
    textAlign: 'right',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  amountInputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  quickAmountContainerRTL: {
    flexDirection: 'row-reverse',
  },
  withdrawalMethodCardRTL: {
    flexDirection: 'row-reverse',
  },
});

