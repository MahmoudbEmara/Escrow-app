import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as DatabaseService from '../../src/services/databaseService';
import { supabase } from '../../src/lib/supabase';

export default function WalletScreen() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  const [availableBalance, setAvailableBalance] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchDataRef = useRef(null);

  // Check if user is test user
  const isTestUser = state.user?.email?.toLowerCase() === 'test@test.com' || 
                     state.user?.profile?.email?.toLowerCase() === 'test@test.com';

  // Test user hardcoded data
  const testAvailableBalance = 3850.00;
  const testPaymentHistory = [
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

  // Fetch wallet data
  const fetchData = useCallback(async () => {
    if (!state.user?.id) {
      setLoading(false);
      return;
    }

    // Use test data for test user
    if (isTestUser) {
      setAvailableBalance(testAvailableBalance);
      setPaymentHistory(testPaymentHistory);
      setLoading(false);
      return;
    }

    try {
      // Fetch wallet
      const walletResult = await DatabaseService.getUserWallet(state.user.id);
      if (walletResult.data) {
        setAvailableBalance(parseFloat(walletResult.data.available_balance || walletResult.data.balance || 0));
      }

      // Fetch payment history
      const historyResult = await DatabaseService.getTransactionHistory(state.user.id);
      if (historyResult.data) {
        const formattedHistory = historyResult.data.map(item => ({
          id: item.id,
          name: item.description || item.name || 'Transaction',
          date: new Date(item.created_at || item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          amount: parseFloat(item.amount || 0),
          type: item.type || (item.amount >= 0 ? 'credit' : 'debit'),
        }));
        setPaymentHistory(formattedHistory);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setLoading(false);
    }
  }, [state.user?.id, isTestUser]);

  useEffect(() => {
    fetchDataRef.current = fetchData;
    fetchData();
  }, [fetchData]);

  // Set up realtime subscriptions for wallet updates
  useEffect(() => {
    if (!state.user?.id || isTestUser) {
      return;
    }

    console.log('Setting up realtime subscription for wallet...');
    console.log('User ID:', state.user.id);

    const channel = supabase
      .channel(`wallet-changes-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${state.user.id}`,
        },
        (payload) => {
          console.log('Wallet updated:', payload.new);
          const updatedWallet = payload.new;
          if (updatedWallet.user_id === state.user.id) {
            console.log('Wallet balance updated, refreshing data...');
            setAvailableBalance(parseFloat(updatedWallet.available_balance || updatedWallet.balance || 0));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_history',
          filter: `user_id=eq.${state.user.id}`,
        },
        (payload) => {
          console.log('New transaction history entry:', payload.new);
          const newHistory = payload.new;
          if (newHistory.user_id === state.user.id) {
            console.log('New transaction history entry added, refreshing data...');
            if (fetchDataRef.current) {
              fetchDataRef.current();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Wallet realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to wallet changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Wallet realtime subscription error');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up wallet realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, isTestUser]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

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
          <Text style={[styles.balanceAmount, isRTL && styles.textRTL]}>{availableBalance.toFixed(2)} EGP</Text>
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
                {payment.type === 'credit' ? '+' : '-'}{payment.amount.toFixed(2)} EGP
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});

