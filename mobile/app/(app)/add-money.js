import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function AddMoneyScreen() {
  const router = useRouter();
  const { t, isRTL } = useContext(LanguageContext);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  const quickAmounts = [100, 500, 1000, 2000];

  const paymentMethods = [
    {
      id: 'instapay',
      name: t('instapay'),
      icon: '⚡',
      color: '#8b5cf6',
    },
    {
      id: 'wallet',
      name: t('inAppWallet'),
      icon: '💼',
      color: '#3b82f6',
    },
    {
      id: 'creditcard',
      name: t('creditCard'),
      icon: '💳',
      color: '#22c55e',
    },
    {
      id: 'cash',
      name: t('cash'),
      icon: '💵',
      color: '#f59e0b',
    },
  ];

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const isContinueEnabled = amount && parseFloat(amount) > 0 && selectedMethod;

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
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('addMoney')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Enter Amount Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('enterAmount')}</Text>
          <View style={[styles.amountInputContainer, isRTL && styles.amountInputContainerRTL]}>
            <Text style={styles.currencySymbol}>$</Text>
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
                  ${value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Payment Method Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('selectPaymentMethod')}</Text>
          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedMethod === method.id && styles.paymentMethodCardActive,
                  isRTL && styles.paymentMethodCardRTL
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={[styles.paymentMethodIcon, { backgroundColor: method.color }]}>
                  <Text style={styles.paymentMethodIconText}>{method.icon}</Text>
                </View>
                <Text style={[
                  styles.paymentMethodName,
                  selectedMethod === method.id && styles.paymentMethodNameActive,
                  isRTL && styles.textRTL
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isContinueEnabled && styles.continueButtonDisabled
          ]}
          disabled={!isContinueEnabled}
          onPress={() => {
            // Handle continue action
            console.log('Continue with:', { amount, method: selectedMethod });
          }}
        >
          <Text style={[
            styles.continueButtonText,
            !isContinueEnabled && styles.continueButtonTextDisabled
          ]}>
            {t('continue')}
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
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  paymentMethodCardActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentMethodIconText: {
    fontSize: 24,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  paymentMethodNameActive: {
    color: '#3b82f6',
  },
  continueButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  continueButtonTextDisabled: {
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
  paymentMethodCardRTL: {
    flexDirection: 'row-reverse',
  },
});

