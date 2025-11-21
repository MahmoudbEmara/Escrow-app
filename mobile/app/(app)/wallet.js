import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function WalletScreen() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  const availableBalance = 3850.00;
  const escrowBalance = 5050.00;

  // Sample payment history
  const paymentHistory = [
    {
      id: 1,
      name: 'Bank Transfer',
      date: 'Nov 20, 2025',
      amount: 500,
      type: 'credit',
    },
    {
      id: 2,
      name: 'Logo Design Payment',
      date: 'Nov 18, 2025',
      amount: 450,
      type: 'debit',
    },
    {
      id: 3,
      name: 'Website Development',
      date: 'Nov 17, 2025',
      amount: 2500,
      type: 'credit',
    },
    {
      id: 4,
      name: 'Withdrawal to Bank',
      date: 'Nov 15, 2025',
      amount: 300,
      type: 'debit',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('wallet')}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, isRTL && styles.textRTL]}>{t('availableBalance')}</Text>
          <Text style={[styles.balanceAmount, isRTL && styles.textRTL]}>${availableBalance.toFixed(2)}</Text>
        </View>

        {/* Escrow Balance */}
        <View style={styles.escrowBalanceCard}>
          <Text style={[styles.escrowBalanceLabel, isRTL && styles.textRTL]}>{t('escrowBalance')}</Text>
          <Text style={[styles.escrowBalanceAmount, isRTL && styles.textRTL]}>${escrowBalance.toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, isRTL && styles.actionButtonsRTL]}>
          <TouchableOpacity
            style={[styles.addMoneyButton, isRTL && styles.addMoneyButtonRTL]}
            onPress={() => router.push('/(app)/add-money')}
          >
            <Text style={styles.addMoneyIcon}>+</Text>
            <Text style={styles.addMoneyText}>{t('addMoney')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.withdrawButton, isRTL && styles.withdrawButtonRTL]}
            onPress={() => router.push('/(app)/withdraw')}
          >
            <Text style={styles.withdrawText}>{t('withdraw')}</Text>
            <Text style={styles.withdrawIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, isRTL && styles.textRTL]}>{t('paymentHistory')}</Text>
        </View>

        <View style={styles.historyList}>
          {paymentHistory.map((payment) => (
            <View key={payment.id} style={[styles.historyItem, isRTL && styles.historyItemRTL]}>
              <View style={[styles.historyLeft, isRTL && styles.historyLeftRTL]}>
                <View style={[
                  styles.historyIcon,
                  { backgroundColor: payment.type === 'credit' ? '#d1fae5' : '#fee2e2' }
                ]}>
                  <Text style={[
                    styles.historyIconText,
                    { color: payment.type === 'credit' ? '#22c55e' : '#ef4444' }
                  ]}>
                    {payment.type === 'credit' ? '↓' : '↑'}
                  </Text>
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyName, isRTL && styles.textRTL]}>{payment.name}</Text>
                  <Text style={[styles.historyDate, isRTL && styles.textRTL]}>{payment.date}</Text>
                </View>
              </View>
              <Text style={[
                styles.historyAmount,
                { color: payment.type === 'credit' ? '#22c55e' : '#ef4444' },
                isRTL && styles.textRTL
              ]}>
                {payment.type === 'credit' ? '+' : '-'}${payment.amount.toFixed(2)}
              </Text>
            </View>
          ))}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
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
  escrowBalanceCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  escrowBalanceLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  escrowBalanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  addMoneyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addMoneyIcon: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
    marginRight: 8,
  },
  addMoneyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  withdrawText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  withdrawIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  historyHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  historyList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#64748b',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textRTL: {
    textAlign: 'right',
  },
  actionButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  addMoneyButtonRTL: {
    flexDirection: 'row-reverse',
  },
  withdrawButtonRTL: {
    flexDirection: 'row-reverse',
  },
  historyItemRTL: {
    flexDirection: 'row-reverse',
  },
  historyLeftRTL: {
    flexDirection: 'row-reverse',
  },
});

