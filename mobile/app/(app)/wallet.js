import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LanguageContext } from '../../src/context/LanguageContext';
import { AuthContext } from '../../src/context/AuthContext';

const recent = [
  { id: '1', title: 'Spotify Subscription', amount: '$100.00', date: '10 April, 2025' },
  { id: '2', title: 'Online Purchase', amount: '$120.50', date: '17 April, 2025' },
  { id: '3', title: 'Mobile Top-up', amount: '₦5,000.00', date: '18 April, 2025' }
];

export default function WalletScreen() {
  const { t, isRTL } = useContext(LanguageContext);
  const { state } = useContext(AuthContext);
  const userName = state.user?.name || 'User';

  const actionLabels = [t('receive'), t('request'), t('exchange'), t('withdraw')];

  return (
    <View style={[styles.root, isRTL && styles.rootRTL]}>
      <View style={styles.header}>
        <Text style={[styles.hello, isRTL && styles.helloRTL]}>{t('hello')}, {userName}</Text>
        <Text style={[styles.balanceLabel, isRTL && styles.balanceLabelRTL]}>{t('yourWalletBalance')}</Text>
        <Text style={styles.balance}>₦209,891.21</Text>
        <View style={[styles.headerButtons, isRTL && styles.headerButtonsRTL]}>
          <TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryBtnText}>{t('fund')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, styles.secondaryBtn]}><Text style={[styles.primaryBtnText, styles.secondaryBtnText]}>{t('send')}</Text></TouchableOpacity>
        </View>
      </View>

      <View style={[styles.walletChips, isRTL && styles.walletChipsRTL]}>
        <Text style={styles.chip}>NGN</Text>
        <Text style={styles.chip}>USD</Text>
        <Text style={styles.chip}>EUR</Text>
        <Text style={[styles.chip, styles.addChip]}>{t('addWallet')}</Text>
      </View>

      <View style={[styles.actionsRow, isRTL && styles.actionsRowRTL]}>
        {actionLabels.map((label) => (
          <View key={label} style={styles.actionItem}>
            <View style={styles.actionIcon} />
            <Text style={styles.actionText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}> 
        <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('recentTransactions')}</Text>
        <TouchableOpacity><Text style={styles.seeAll}>{t('seeAll')}</Text></TouchableOpacity>
      </View>
      <FlatList
        data={recent}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={[styles.txnRow, isRTL && styles.txnRowRTL]}>
            <View style={styles.txnIcon} />
            <View style={styles.txnMain}>
              <Text style={[styles.txnTitle, isRTL && styles.txnTitleRTL]}>{item.title}</Text>
              <Text style={[styles.txnDate, isRTL && styles.txnDateRTL]}>{item.date}</Text>
            </View>
            <Text style={styles.txnAmount}>{item.amount}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f7f3' },
  rootRTL: { direction: 'rtl' },
  header: { backgroundColor: '#0f5132', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  hello: { color: '#d2f4ea', marginBottom: 8 },
  helloRTL: { textAlign: 'right' },
  balanceLabel: { color: '#c9e9d9', fontSize: 14 },
  balanceLabelRTL: { textAlign: 'right' },
  balance: { color: '#ffffff', fontSize: 32, fontWeight: '700', marginVertical: 12 },
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButtonsRTL: { flexDirection: 'row-reverse' },
  primaryBtn: { backgroundColor: '#22c55e', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  secondaryBtn: { backgroundColor: 'white' },
  primaryBtnText: { color: 'white', fontWeight: '600' },
  secondaryBtnText: { color: '#0f5132' },
  walletChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  walletChipsRTL: { flexDirection: 'row-reverse' },
  chip: { backgroundColor: 'white', color: '#0f5132', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, fontWeight: '600' },
  addChip: { backgroundColor: '#e8f5e9' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingVertical: 10 },
  actionsRowRTL: { flexDirection: 'row-reverse' },
  actionItem: { alignItems: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d1fae5', marginBottom: 6 },
  actionText: { color: '#0f5132', fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeaderRTL: { flexDirection: 'row-reverse' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f5132' },
  sectionTitleRTL: { textAlign: 'right' },
  seeAll: { color: '#16a34a' },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: 'white', marginBottom: 8, borderRadius: 12, paddingHorizontal: 12 },
  txnRowRTL: { flexDirection: 'row-reverse' },
  txnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0', marginRight: 12 },
  txnMain: { flex: 1 },
  txnTitle: { fontWeight: '600', color: '#0f172a' },
  txnTitleRTL: { textAlign: 'right' },
  txnDate: { color: '#64748b', fontSize: 12 },
  txnDateRTL: { textAlign: 'right' },
  txnAmount: { fontWeight: '700', color: '#0f172a' }
});


