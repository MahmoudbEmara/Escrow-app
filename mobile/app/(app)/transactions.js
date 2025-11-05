import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LanguageContext } from '../../src/context/LanguageContext';

const transactions = [
  { id: '1', title: 'Spotify Subscription', amount: '$100.00', date: '10 April, 2025', type: 'outgoing' },
  { id: '2', title: 'Online Purchase', amount: '$120.50', date: '17 April, 2025', type: 'outgoing' },
  { id: '3', title: 'Mobile Top-up', amount: '₦5,000.00', date: '18 April, 2025', type: 'outgoing' },
  { id: '4', title: 'Payment Received', amount: '₦50,000.00', date: '19 April, 2025', type: 'incoming' },
  { id: '5', title: 'Escrow Release', amount: '$500.00', date: '20 April, 2025', type: 'incoming' },
];

export default function TransactionsScreen() {
  const { t, isRTL } = useContext(LanguageContext);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <Text style={[styles.title, isRTL && styles.titleRTL]}>{t('transactions')}</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.transactionItem, isRTL && styles.transactionItemRTL]}>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionTitle, isRTL && styles.transactionTitleRTL]}>{item.title}</Text>
              <Text style={[styles.transactionDate, isRTL && styles.transactionDateRTL]}>{item.date}</Text>
            </View>
            <Text style={[styles.transactionAmount, item.type === 'incoming' && styles.incomingAmount]}>
              {item.type === 'incoming' ? '+' : '-'} {item.amount}
            </Text>
          </View>
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f7f3',
    paddingTop: 60,
  },
  containerRTL: {
    direction: 'rtl',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f5132',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titleRTL: {
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: 20,
  },
  transactionItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionItemRTL: {
    flexDirection: 'row-reverse',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  transactionTitleRTL: {
    textAlign: 'right',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionDateRTL: {
    textAlign: 'right',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  incomingAmount: {
    color: '#22c55e',
  },
});

