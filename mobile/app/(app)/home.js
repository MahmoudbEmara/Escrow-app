import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as AuthSession from 'expo-auth-session';
import * as DatabaseService from '../../src/services/databaseService';
import { supabase } from '../../src/lib/supabase';

export default function HomeScreen() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  const [showFilterRow, setShowFilterRow] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalInEscrow, setTotalInEscrow] = useState(0);
  const [incoming, setIncoming] = useState(0);
  const [outgoing, setOutgoing] = useState(0);
  
  // --- Generate redirect URI for Expo Go ---
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
  console.log('Redirect URI for Expo Go:', redirectUri);

  // Check if user is test user
  const isTestUser = state.user?.email?.toLowerCase() === 'test@test.com' || 
                     state.user?.profile?.email?.toLowerCase() === 'test@test.com';

  // Test user hardcoded data
  const testTransactions = [
    {
      id: 'TXN001',
      title: 'Website Development',
      startDate: 'Nov 15, 2025',
      buyer: 'Test User',
      seller: 'Sarah Johnson',
      amount: 2500,
      status: 'In Progress',
      role: 'Buyer',
    },
    {
      id: 'TXN002',
      title: 'Logo Design',
      startDate: 'Nov 10, 2025',
      buyer: 'Mike Chen',
      seller: 'Test User',
      amount: 450,
      status: 'Completed',
      role: 'Seller',
    },
    {
      id: 'TXN003',
      title: 'Mobile App Development',
      startDate: 'Nov 20, 2025',
      buyer: 'Test User',
      seller: 'Emily Davis',
      amount: 5000,
      status: 'In Dispute',
      role: 'Buyer',
    },
    {
      id: 'TXN004',
      title: 'Content Writing',
      startDate: 'Nov 5, 2025',
      buyer: 'Alex Brown',
      seller: 'Test User',
      amount: 800,
      status: 'Completed',
      role: 'Seller',
    },
  ];

  const testTotalInEscrow = 5050.00;
  const testIncoming = 3250.00;
  const testOutgoing = 1800.00;

  // Get user display name from profile
  const getUserDisplayName = useCallback(() => {
    if (isTestUser) return 'Test User';
    return state.user?.profile?.name || state.user?.email || 'User';
  }, [isTestUser, state.user?.profile?.name, state.user?.email]);

  const getUserFirstName = useCallback(() => {
    if (isTestUser) return 'Test';
    // Get first name from profile, or extract from name field, or use email
    if (state.user?.profile?.first_name) {
      return state.user.profile.first_name;
    }
    // If first_name not available, try to extract from name
    if (state.user?.profile?.name) {
      const nameParts = state.user.profile.name.split(' ');
      return nameParts[0] || 'User';
    }
    return 'User';
  }, [isTestUser, state.user?.profile?.first_name, state.user?.profile?.name]);

  // Fetch transactions and wallet data
  const fetchData = useCallback(async (isRefresh = false) => {
      if (!state.user?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Use test data for test user
      if (isTestUser) {
        setTransactions(testTransactions);
        setTotalInEscrow(testTotalInEscrow);
        setIncoming(testIncoming);
        setOutgoing(testOutgoing);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        // Fetch transactions
        const transactionsResult = await DatabaseService.getTransactions(state.user.id);
        if (transactionsResult.data) {
          // Format transactions for display
          const formattedTransactions = await Promise.all(
            transactionsResult.data.map(async (txn) => {
              // Get buyer and seller names
              let buyerName = 'Buyer';
              let sellerName = 'Seller';
              
              if (txn.buyer_id === state.user.id) {
                buyerName = getUserDisplayName();
              } else if (txn.buyer_profile?.name) {
                buyerName = txn.buyer_profile.name;
              } else if (txn.buyer_id) {
                const buyerProfile = await DatabaseService.getUserProfile(txn.buyer_id);
                buyerName = buyerProfile.data?.name || 'Buyer';
              }
              
              if (txn.seller_id === state.user.id) {
                sellerName = getUserDisplayName();
              } else if (txn.seller_profile?.name) {
                sellerName = txn.seller_profile.name;
              } else if (txn.seller_id) {
                const sellerProfile = await DatabaseService.getUserProfile(txn.seller_id);
                sellerName = sellerProfile.data?.name || 'Seller';
              }

              return {
                id: txn.id,
                title: txn.title,
                startDate: new Date(txn.start_date || txn.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }),
                buyer: buyerName,
                seller: sellerName,
                buyerId: txn.buyer_id,
                sellerId: txn.seller_id,
                amount: parseFloat(txn.amount || 0),
                status: txn.status || 'In Progress',
                role: txn.buyer_id === state.user.id ? 'Buyer' : 'Seller',
                category: txn.category,
                feesResponsibility: txn.fees_responsibility,
                deliveryDate: txn.delivery_date,
                terms: txn.transaction_terms?.map(term => term.term) || [],
              };
            })
          );
          setTransactions(formattedTransactions);

          // Calculate escrow totals
          const inEscrow = formattedTransactions
            .filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
            .reduce((sum, t) => sum + t.amount, 0);
          setTotalInEscrow(inEscrow);

          const incomingAmount = formattedTransactions
            .filter(t => t.role === 'Seller' && t.status !== 'Completed' && t.status !== 'Cancelled')
            .reduce((sum, t) => sum + t.amount, 0);
          setIncoming(incomingAmount);

          const outgoingAmount = formattedTransactions
            .filter(t => t.role === 'Buyer' && t.status !== 'Completed' && t.status !== 'Cancelled')
            .reduce((sum, t) => sum + t.amount, 0);
          setOutgoing(outgoingAmount);
        }

        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    }, [state.user?.id, isTestUser, getUserDisplayName]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up realtime subscription for new transactions and deletions
  useEffect(() => {
    if (!state.user?.id || isTestUser) {
      return;
    }

    console.log('Setting up realtime subscription for transactions...');
    console.log('User ID:', state.user.id);
    
    // Subscribe to INSERT and DELETE events on transactions table
    // Listen to all INSERT events and filter in the callback to catch both buyer and seller cases
    const channel = supabase
      .channel(`transactions-changes-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('New transaction detected:', payload.new);
          const newTransaction = payload.new;
          
          // Check if this transaction involves the current user
          if (newTransaction.buyer_id === state.user.id || newTransaction.seller_id === state.user.id) {
            console.log('Transaction involves current user, refreshing data...');
            // Refresh data when new transaction is created
            fetchData();
          } else {
            console.log('Transaction does not involve current user, ignoring...');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('Transaction deleted:', payload.old);
          const deletedTransaction = payload.old;
          
          // Check if this transaction involved the current user
          if (deletedTransaction.buyer_id === state.user.id || deletedTransaction.seller_id === state.user.id) {
            console.log('Deleted transaction involved current user, removing from list...');
            // Remove transaction from local state immediately
            const deletedId = deletedTransaction.id;
            setTransactions(prevTransactions => {
              const updated = prevTransactions.filter(t => t.id !== deletedId);
              
              // Recalculate totals
              const inEscrow = updated
                .filter(t => t.status !== 'Completed' && t.status !== 'Cancelled')
                .reduce((sum, t) => sum + t.amount, 0);
              setTotalInEscrow(inEscrow);

              const incomingAmount = updated
                .filter(t => t.role === 'Seller' && t.status !== 'Completed' && t.status !== 'Cancelled')
                .reduce((sum, t) => sum + t.amount, 0);
              setIncoming(incomingAmount);

              const outgoingAmount = updated
                .filter(t => t.role === 'Buyer' && t.status !== 'Completed' && t.status !== 'Cancelled')
                .reduce((sum, t) => sum + t.amount, 0);
              setOutgoing(outgoingAmount);
              
              return updated;
            });
          } else {
            console.log('Deleted transaction did not involve current user, ignoring...');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to transaction changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, isTestUser, fetchData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (state.user?.id) {
        fetchData();
      }
    }, [state.user?.id, fetchData])
  );

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'In Progress':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'In Dispute':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Buyer':
        return { bg: '#ede9fe', text: '#6d28d9' };
      case 'Seller':
        return { bg: '#fef3c7', text: '#d97706' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter((transaction) => {
    if (selectedRole && transaction.role !== selectedRole) return false;
    if (selectedStatus && transaction.status !== selectedStatus) return false;
    return true;
  });

  const roles = ['Buyer', 'Seller'];
  const statuses = ['In Progress', 'Completed', 'In Dispute'];

  const handleRoleSelect = (role) => {
    setSelectedRole(selectedRole === role ? null : role);
    setShowRoleDropdown(false);
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(selectedStatus === status ? null : status);
    setShowStatusDropdown(false);
  };

  const clearFilters = () => {
    setSelectedRole(null);
    setSelectedStatus(null);
  };

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
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        {/* User Profile Section */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.profileSection}>
            <View style={styles.profileImage}>
              <Text style={styles.profileInitials}>
                {getUserInitials(getUserDisplayName())}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>
                {t('welcome') || 'Welcome'}, <Text style={styles.firstNameHighlight}>{getUserFirstName()}</Text>
              </Text>
              {state.user?.profile?.username && (
                <Text style={styles.userUsername}>@{state.user.profile.username}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Escrow Overview */}
        <View style={styles.escrowCard}>
          <Text style={[styles.escrowTitle, isRTL && styles.textRTL]}>{t('totalInEscrow')}</Text>
          <Text style={[styles.escrowAmount, isRTL && styles.textRTL]}>{totalInEscrow.toFixed(2)} EGP</Text>
          <View style={[styles.escrowStats, isRTL && styles.escrowStatsRTL]}>
            <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>↓</Text>
              </View>
              <View>
                <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t('incoming')}</Text>
                <Text style={[styles.statValue, isRTL && styles.textRTL]}>{incoming.toFixed(2)} EGP</Text>
              </View>
            </View>
            <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>↑</Text>
              </View>
              <View>
                <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t('outgoing')}</Text>
                <Text style={[styles.statValue, isRTL && styles.textRTL]}>{outgoing.toFixed(2)} EGP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* New Transaction Button */}
        <TouchableOpacity 
          style={[styles.newTransactionButton, isRTL && styles.newTransactionButtonRTL]}
          onPress={() => router.push('/(app)/new-transaction')}
        >
          <Text style={styles.newTransactionIcon}>+</Text>
          <Text style={styles.newTransactionText}>{t('newTransaction')}</Text>
        </TouchableOpacity>

        {/* Transactions List */}
        <View style={[styles.transactionsHeader, isRTL && styles.transactionsHeaderRTL]}>
          <Text style={[styles.transactionsTitle, isRTL && styles.textRTL]}>{t('transactions')} ({filteredTransactions.length})</Text>
          <TouchableOpacity onPress={() => setShowFilterRow(!showFilterRow)}>
            <Text style={styles.filterIcon}>🔽</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        {showFilterRow && (
          <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
            <View style={styles.filterButtonContainer}>
              <TouchableOpacity
                style={[styles.filterButton, selectedRole && styles.filterButtonActive]}
                onPress={() => {
                  setShowRoleDropdown(!showRoleDropdown);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={[styles.filterButtonText, selectedRole && styles.filterButtonTextActive]}>
                  {selectedRole ? t(selectedRole === 'Buyer' ? 'buyer' : 'seller') : t('role')}
                </Text>
                <Text style={styles.filterButtonIcon}>▼</Text>
              </TouchableOpacity>
              {showRoleDropdown && (
                <View style={[styles.dropdown, isRTL && styles.dropdownRTL]}>
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.dropdownItem,
                        selectedRole === role && styles.dropdownItemActive
                      ]}
                      onPress={() => handleRoleSelect(role)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedRole === role && styles.dropdownItemTextActive
                      ]}>
                        {t(role === 'Buyer' ? 'buyer' : 'seller')}
                      </Text>
                      {selectedRole === role && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.filterButtonContainer}>
              <TouchableOpacity
                style={[styles.filterButton, selectedStatus && styles.filterButtonActive]}
                onPress={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowRoleDropdown(false);
                }}
              >
                <Text style={[styles.filterButtonText, selectedStatus && styles.filterButtonTextActive]}>
                  {selectedStatus || t('status')}
                </Text>
                <Text style={styles.filterButtonIcon}>▼</Text>
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={[styles.dropdown, isRTL && styles.dropdownRTL]}>
                  {statuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.dropdownItem,
                        selectedStatus === status && styles.dropdownItemActive
                      ]}
                      onPress={() => handleStatusSelect(status)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedStatus === status && styles.dropdownItemTextActive
                      ]}>
                        {status}
                      </Text>
                      {selectedStatus === status && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {(selectedRole || selectedStatus) && (
              <TouchableOpacity style={[styles.clearFilterButton, isRTL && styles.clearFilterButtonRTL]} onPress={clearFilters}>
                <Text style={styles.clearFilterText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.transactionsList}>
          {filteredTransactions.map((transaction) => {
            const statusColors = getStatusColor(transaction.status);
            const roleColors = getRoleColor(transaction.role);
            const isOutgoing = transaction.role === 'Buyer';
            
            return (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionCard}
                onPress={() => router.push(`/(app)/transaction-details?id=${transaction.id}`)}
              >
                <View style={[styles.transactionHeader, isRTL && styles.transactionHeaderRTL]}>
                  <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusTagText, { color: statusColors.text }]}>
                      {transaction.status}
                    </Text>
                  </View>
                  <View style={[styles.roleTag, { backgroundColor: roleColors.bg }]}>
                    <Text style={[styles.roleTagText, { color: roleColors.text }]}>
                      {transaction.role === 'Buyer' ? t('buyer') : t('seller')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.transactionTitle, isRTL && styles.textRTL]}>{transaction.title}</Text>
                <Text style={[styles.transactionDetail, isRTL && styles.textRTL]}>{t('startDate')}: {transaction.startDate}</Text>
                <Text style={[styles.transactionDetail, isRTL && styles.textRTL]}>{t('transactionId')}: {transaction.id}</Text>
                <Text style={[styles.transactionDetail, isRTL && styles.textRTL]}>
                  {transaction.role === 'Buyer' ? t('seller') : t('buyer')}: {transaction.role === 'Buyer' ? transaction.seller : transaction.buyer}
                </Text>
                <View style={[styles.transactionAmountRow, isRTL && styles.transactionAmountRowRTL]}>
                  <Text style={[styles.transactionAmountLabel, isRTL && styles.textRTL]}>{t('amount')}</Text>
                  <Text style={[styles.transactionAmount, isOutgoing && styles.transactionAmountOutgoing, isRTL && styles.textRTL]}>
                    {isOutgoing ? '-' : '+'}{transaction.amount.toFixed(2)} EGP
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  textRTL: {
    textAlign: 'right',
  },
  escrowStatsRTL: {
    flexDirection: 'row-reverse',
  },
  statItemRTL: {
    flexDirection: 'row-reverse',
  },
  newTransactionButtonRTL: {
    flexDirection: 'row-reverse',
  },
  transactionsHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  transactionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  transactionAmountRowRTL: {
    flexDirection: 'row-reverse',
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
  },
  firstNameHighlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  escrowCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#6366f1',
  },
  escrowTitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
  },
  escrowAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  escrowStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  newTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newTransactionIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  newTransactionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  filterIcon: {
    fontSize: 20,
    color: '#64748b',
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  transactionDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  transactionAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  transactionAmountLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  transactionAmountOutgoing: {
    color: '#ef4444',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
    position: 'relative',
  },
  filterRowRTL: {
    flexDirection: 'row-reverse',
  },
  filterButtonContainer: {
    flex: 1,
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#3b82f6',
  },
  filterButtonIcon: {
    fontSize: 12,
    color: '#64748b',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownRTL: {
    left: 0,
    right: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  clearFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearFilterButtonRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  clearFilterText: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: 'bold',
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
