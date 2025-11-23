import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
  useEffect(() => {
    const fetchData = async () => {
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
          // Use balance field from database
          const balance = parseFloat(walletResult.data.balance || 0);
          setAvailableBalance(balance);
          console.log('Wallet balance fetched:', balance);
        } else if (walletResult.error) {
          console.error('Error fetching wallet:', walletResult.error);
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
    };

    fetchData();
  }, [state.user?.id, isTestUser]);

  // Refresh wallet data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (state.user?.id && !isTestUser) {
        // Set loading immediately when screen comes into focus
        setLoading(true);
        const fetchData = async () => {
          try {
            // Fetch wallet
            const walletResult = await DatabaseService.getUserWallet(state.user.id);
            if (walletResult.data) {
              const balance = parseFloat(walletResult.data.balance || 0);
              setAvailableBalance(balance);
              console.log('Wallet balance refreshed:', balance);
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
            console.error('Error refreshing wallet data:', error);
            setLoading(false);
          }
        };
        fetchData();
      }
    }, [state.user?.id, isTestUser])
  );

  // Set up realtime subscriptions for wallet balance and transaction history
  useEffect(() => {
    if (!state.user?.id || isTestUser) {
      return;
    }

    console.log('Setting up realtime subscriptions for wallet...');
    
    const refreshWalletData = async () => {
      try {
        // Fetch wallet
        const walletResult = await DatabaseService.getUserWallet(state.user.id);
        if (walletResult.data) {
          const balance = parseFloat(walletResult.data.balance || 0);
          setAvailableBalance(balance);
          console.log('Wallet balance updated via realtime:', balance);
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
      } catch (error) {
        console.error('Error refreshing wallet data via realtime:', error);
      }
    };

    // Subscribe to UPDATE events on wallets table
    // Listen to all wallet updates and filter by user_id in callback
    const walletChannel = supabase
      .channel(`wallet-changes-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
        },
        (payload) => {
          console.log('Wallet update detected:', payload.new);
          // Check if this wallet belongs to the current user
          if (payload.new.user_id === state.user.id) {
            const newBalance = parseFloat(payload.new.balance || 0);
            setAvailableBalance(newBalance);
            console.log('✅ Wallet balance updated via realtime:', newBalance);
            // Also refresh payment history
            refreshWalletData();
          } else {
            console.log('Wallet update is for different user, ignoring...');
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Wallet subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to wallet changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Wallet subscription error:', err);
          console.error('Make sure to run the migration: enable_realtime_for_tables.sql');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Wallet subscription timed out');
        }
      });

    // Subscribe to INSERT events on transaction_history table
    // Listen to all inserts and filter by user_id in callback
    const historyChannel = supabase
      .channel(`transaction-history-changes-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_history',
        },
        (payload) => {
          console.log('Transaction history insert detected:', payload.new);
          // Check if this history entry belongs to the current user
          if (payload.new.user_id === state.user.id) {
            console.log('✅ New transaction history entry for current user');
            // Refresh wallet data when new history entry is added
            refreshWalletData();
          } else {
            console.log('Transaction history entry is for different user, ignoring...');
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Transaction history subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to transaction history changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Transaction history subscription error:', err);
          console.error('Make sure to run the migration: enable_realtime_for_tables.sql');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Transaction history subscription timed out');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up wallet realtime subscriptions...');
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [state.user?.id, isTestUser]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
});

