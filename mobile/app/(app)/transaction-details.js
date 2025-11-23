import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as TransactionService from '../../src/services/transactionService';
import * as DatabaseService from '../../src/services/databaseService';
import { TransactionState, getStateDisplayName, getStateColors } from '../../src/constants/transactionStates';

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is test user
  const isTestUser = state.user?.email?.toLowerCase() === 'test@test.com' || 
                     state.user?.profile?.email?.toLowerCase() === 'test@test.com';

  // Test user hardcoded data
  const testTransaction = {
    id: id || 'TXN001',
    title: 'Website Development',
    startDate: 'Nov 15, 2025',
    deliveryDate: 'Dec 15, 2025',
    buyer: 'Test User',
    seller: 'Sarah Johnson',
    buyerId: 'USER123',
    sellerId: 'USER456',
    amount: 2500,
    status: 'In Progress',
    role: 'Buyer',
    category: 'Service',
    feesResponsibility: 'Buyer',
    terms: [
      'Complete website design and development',
      'Responsive design for all devices',
      'SEO optimization included',
      '3 months of free maintenance',
    ],
  };

  // Fetch transaction data
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      // Use test data for test user
      if (isTestUser) {
        setTransaction(testTransaction);
        setLoading(false);
        return;
      }

      try {
        const result = await TransactionService.getTransactionWithStateInfo(id, state.user?.id);
        if (result.data) {
          const txn = result.data;
          const stateInfo = txn.stateInfo || {};
          
          // Determine user role - prevent being both buyer and seller
          const userId = state.user?.id;
          const isBuyer = txn.buyer_id === userId;
          const isSeller = txn.seller_id === userId;
          
          // If somehow user is both, prioritize buyer role
          let userRole = 'Buyer';
          if (isBuyer && !isSeller) {
            userRole = 'Buyer';
          } else if (isSeller && !isBuyer) {
            userRole = 'Seller';
          } else if (isBuyer && isSeller) {
            // Edge case: user is both (shouldn't happen, but handle it)
            console.warn('User is both buyer and seller - defaulting to buyer');
            userRole = 'Buyer';
          } else {
            // User is neither - determine from stateInfo or default
            userRole = stateInfo.isBuyer ? 'Buyer' : (stateInfo.isSeller ? 'Seller' : 'Buyer');
          }
          
          // Fetch buyer and seller profiles for names
          let buyerName = 'Buyer';
          let sellerName = 'Seller';
          
          if (txn.buyer_id) {
            const buyerProfile = await DatabaseService.getUserProfile(txn.buyer_id);
            buyerName = buyerProfile.data?.name || 'Buyer';
          }
          
          if (txn.seller_id) {
            const sellerProfile = await DatabaseService.getUserProfile(txn.seller_id);
            sellerName = sellerProfile.data?.name || 'Seller';
          }

          // Convert terms to array - handle both string and array formats
          let termsArray = [];
          if (txn.transaction_terms && Array.isArray(txn.transaction_terms)) {
            termsArray = txn.transaction_terms.map(term => term.term || term);
          } else if (txn.terms) {
            if (typeof txn.terms === 'string') {
              termsArray = txn.terms.split('\n').filter(term => term.trim() !== '');
            } else if (Array.isArray(txn.terms)) {
              termsArray = txn.terms;
            }
          }

          // Normalize status for available actions calculation
          const rawStatus = txn.status || 'draft';
          const statusLower = (rawStatus || '').toLowerCase().trim();
          const normalizedStatus = statusLower === 'pending' ? TransactionState.PENDING_APPROVAL : 
                                  statusLower === 'accepted' ? TransactionState.ACCEPTED :
                                  statusLower === 'funded' ? TransactionState.FUNDED :
                                  statusLower === 'in progress' || statusLower === 'in_progress' ? TransactionState.IN_PROGRESS :
                                  statusLower === 'delivered' ? TransactionState.DELIVERED :
                                  statusLower === 'completed' ? TransactionState.COMPLETED :
                                  statusLower === 'cancelled' || statusLower === 'canceled' ? TransactionState.CANCELLED :
                                  statusLower === 'disputed' || statusLower === 'in dispute' ? TransactionState.DISPUTED :
                                  rawStatus;

          // Manually calculate available actions if stateInfo doesn't have them
          let availableActions = stateInfo.availableActions || [];
          if (availableActions.length === 0) {
            if (userRole === 'Seller' && (normalizedStatus === TransactionState.PENDING_APPROVAL || statusLower === 'pending')) {
              availableActions.push({ action: 'accept', state: TransactionState.ACCEPTED, label: 'Accept Transaction' });
            }
            if (userRole === 'Buyer' && (normalizedStatus === TransactionState.ACCEPTED || statusLower === 'accepted')) {
              availableActions.push({ action: 'fund', state: TransactionState.FUNDED, label: 'Fund Transaction' });
            }
          }

          setTransaction({
            ...txn,
            buyer: buyerName,
            seller: sellerName,
            startDate: new Date(txn.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            deliveryDate: txn.delivery_date ? new Date(txn.delivery_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) : null,
            amount: parseFloat(txn.amount || 0),
            role: userRole,
            terms: termsArray,
            // Preserve stateInfo and add calculated values
            stateInfo: {
              ...stateInfo,
              isBuyer: userRole === 'Buyer',
              isSeller: userRole === 'Seller',
              availableActions: availableActions,
            },
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching transaction:', error);
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [id, state.user?.id, isTestUser]);

  // Use state machine colors
  const getStatusColor = (status) => {
    return getStateColors(status);
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

  const maskUserId = (userId) => {
    if (!userId) return '';
    if (userId.length <= 4) return userId;
    return '****' + userId.slice(-4);
  };

  const handleStateTransition = async (action, state) => {
    if (!transaction || !state.user?.id) return;

    try {
      let result;
      switch (action) {
        case 'submit':
          result = await TransactionService.submitForApproval(transaction.id, state.user.id);
          break;
        case 'accept':
          result = await TransactionService.acceptTransaction(transaction.id, state.user.id);
          break;
        case 'fund':
          result = await TransactionService.fundTransaction(transaction.id, state.user.id);
          break;
        case 'start_work':
          result = await TransactionService.startWork(transaction.id, state.user.id);
          break;
        case 'deliver':
          result = await TransactionService.markAsDelivered(transaction.id, state.user.id);
          break;
        case 'complete':
          result = await TransactionService.completeTransaction(transaction.id, state.user.id);
          break;
        case 'dispute':
          Alert.prompt(
            'Open Dispute',
            'Please provide a reason for the dispute:',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit',
                onPress: async (reason) => {
                  if (!reason) {
                    Alert.alert('Error', 'Please provide a dispute reason');
                    return;
                  }
                  const disputeResult = await TransactionService.disputeTransaction(transaction.id, state.user.id, reason);
                  if (disputeResult.success) {
                    Alert.alert('Success', 'Dispute opened successfully');
                    router.back();
                  } else {
                    Alert.alert('Error', disputeResult.error || 'Failed to open dispute');
                  }
                },
              },
            ],
            'plain-text'
          );
          return;
        case 'cancel':
          Alert.alert(
            'Cancel Transaction',
            'Are you sure you want to cancel this transaction?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                  const cancelResult = await TransactionService.cancelTransaction(transaction.id, state.user.id);
                  if (cancelResult.success) {
                    Alert.alert('Success', 'Transaction cancelled');
                    router.back();
                  } else {
                    Alert.alert('Error', cancelResult.error || 'Failed to cancel transaction');
                  }
                },
              },
            ]
          );
          return;
        default:
          return;
      }

      if (result && result.success) {
        Alert.alert('Success', 'Transaction updated successfully');
        // Refresh transaction data
        const refreshResult = await TransactionService.getTransactionWithStateInfo(transaction.id, state.user.id);
        if (refreshResult.data) {
          setTransaction(refreshResult.data);
        }
      } else if (result && result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('State transition error:', error);
      Alert.alert('Error', error.message || 'Failed to update transaction');
    }
  };

  const handleDeleteTransaction = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This will permanently remove the transaction and all related data (messages, terms, etc.). This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isTestUser) {
              Alert.alert('Success', 'Transaction deleted successfully (test mode)');
              router.back();
              return;
            }

            try {
              console.log('Attempting to delete transaction:', transaction.id);
              const result = await DatabaseService.deleteTransaction(transaction.id);
              
              console.log('Delete result:', result);
              
              if (result.error || !result.success) {
                const errorMessage = result.error || 'Failed to delete transaction. Please check if you have permission or if the transaction status allows deletion.';
                console.error('Delete failed:', errorMessage);
                Alert.alert('Error', errorMessage);
                return;
              }

              Alert.alert('Success', 'Transaction deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } catch (error) {
              console.error('Delete transaction error:', error);
              Alert.alert('Error', error.message || 'Failed to delete transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading || !transaction) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  // Get raw status from transaction
  const rawStatus = transaction.status || TransactionState.DRAFT;
  const statusLower = (rawStatus || '').toLowerCase().trim();
  
  // Map old status values to new state machine values
  const normalizeStatus = (status) => {
    if (!status) return TransactionState.DRAFT;
    
    const s = status.toLowerCase().trim();
    
    // Map old statuses to new state machine
    const statusMap = {
      'pending': TransactionState.PENDING_APPROVAL,
      'pending_approval': TransactionState.PENDING_APPROVAL,
      'accepted': TransactionState.ACCEPTED,
      'funded': TransactionState.FUNDED,
      'in progress': TransactionState.IN_PROGRESS,
      'in_progress': TransactionState.IN_PROGRESS,
      'delivered': TransactionState.DELIVERED,
      'completed': TransactionState.COMPLETED,
      'cancelled': TransactionState.CANCELLED,
      'canceled': TransactionState.CANCELLED,
      'disputed': TransactionState.DISPUTED,
      'in dispute': TransactionState.DISPUTED,
      'draft': TransactionState.DRAFT,
    };
    
    return statusMap[s] || status; // Return mapped status or original if not found
  };

  const currentState = normalizeStatus(rawStatus);
  const statusColors = getStateColors(currentState);
  const statusDisplayName = getStateDisplayName(currentState);
  const roleColors = getRoleColor(transaction.role);
  const stateInfo = transaction.stateInfo || {};
  const availableActions = stateInfo.availableActions || [];

  // Determine if buttons should show (check both normalized and raw status)
  const isPendingApproval = statusLower === 'pending' || 
                           statusLower === 'pending_approval' ||
                           currentState === TransactionState.PENDING_APPROVAL;
  const isAccepted = statusLower === 'accepted' || 
                    currentState === TransactionState.ACCEPTED;
  
  // Ensure user can only be one role (prevent both buyer and seller)
  const isSeller = (transaction.role === 'Seller' || transaction.role === 'seller' || stateInfo.isSeller === true) &&
                   !(transaction.role === 'Buyer' || transaction.role === 'buyer' || stateInfo.isBuyer === true);
  const isBuyer = (transaction.role === 'Buyer' || transaction.role === 'buyer' || stateInfo.isBuyer === true) &&
                 !(transaction.role === 'Seller' || transaction.role === 'seller' || stateInfo.isSeller === true);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Status and Role Tags */}
        <View style={styles.tagsContainer}>
          <View style={[styles.statusTag, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusTagText, { color: statusColors.text }]}>
              {statusDisplayName}
            </Text>
          </View>
          <View style={[styles.roleTag, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleTagText, { color: roleColors.text }]}>
              {transaction.role}
            </Text>
          </View>
        </View>

        {/* Transaction Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.transactionTitle}>{transaction.title}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transaction ID:</Text>
            <Text style={styles.infoValue}>{transaction.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date:</Text>
            <Text style={styles.infoValue}>{transaction.startDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Date:</Text>
            <Text style={styles.infoValue}>{transaction.deliveryDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{transaction.category}</Text>
          </View>

          <View style={styles.divider} />

          {/* Show only the other party (not the current user) */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {transaction.role === 'Buyer' ? 'Seller:' : 'Buyer:'}
            </Text>
            <Text style={styles.infoValue}>
              {transaction.role === 'Buyer' 
                ? (transaction.seller || maskUserId(transaction.sellerId))
                : (transaction.buyer || maskUserId(transaction.buyerId))
              }
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount:</Text>
            <Text style={styles.amountValue}>{transaction.amount.toFixed(2)} EGP</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fees Paid By:</Text>
            <Text style={styles.infoValue}>{transaction.feesResponsibility}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.termsSection}>
            <Text style={styles.infoLabel}>Terms:</Text>
            {transaction.terms.map((term, index) => (
              <Text key={index} style={styles.termItem}>• {term}</Text>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Accept/Reject Buttons - Show prominently for pending_approval state */}
          {(() => {
            // Show buttons if status is "Pending" (old) or "pending_approval" (new) and user is seller
            const showAcceptReject = isPendingApproval && isSeller && !isBuyer;
            
            if (showAcceptReject) {
              return (
                <View style={styles.acceptRejectContainer}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleStateTransition('accept', state)}
                  >
                    <Text style={styles.acceptButtonText}>✓ {t('accept') || 'Accept Transaction'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => {
                      Alert.alert(
                        'Reject Transaction',
                        'Are you sure you want to reject this transaction?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reject',
                            style: 'destructive',
                            onPress: () => handleStateTransition('cancel', state),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.rejectButtonText}>✕ {t('reject') || 'Reject Transaction'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return null;
          })()}

          {/* Fund/Cancel Buttons - Show prominently for accepted state (buyer) */}
          {(() => {
            // Show buttons if status is "Accepted" and user is buyer (not seller)
            const showFundCancel = isAccepted && isBuyer && !isSeller;
            
            if (showFundCancel) {
              return (
                <View style={styles.acceptRejectContainer}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleStateTransition('fund', state)}
                  >
                    <Text style={styles.acceptButtonText}>💰 {t('fundTransaction') || 'Fund Transaction'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => {
                      Alert.alert(
                        'Cancel Transaction',
                        'Are you sure you want to cancel this transaction?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Yes, Cancel',
                            style: 'destructive',
                            onPress: () => handleStateTransition('cancel', state),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.rejectButtonText}>✕ {t('cancel') || 'Cancel Transaction'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return null;
          })()}

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => router.push(`/(app)/chat?transactionId=${transaction.id}&chatId=CHAT${transaction.id}`)}
          >
            <Text style={styles.messageButtonIcon}>💬</Text>
            <Text style={styles.messageButtonText}>{t('message') || 'Message'}</Text>
          </TouchableOpacity>

          {/* Delete button - only show if status is draft */}
          {currentState === TransactionState.DRAFT && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteTransaction}
            >
              <Text style={styles.deleteButtonText}>🗑️ {t('delete') || 'Delete Transaction'}</Text>
            </TouchableOpacity>
          )}

          {/* Dynamic action buttons based on state machine - hide if we already showed accept/reject or fund/cancel */}
          {(() => {
            const showAcceptReject = isPendingApproval && isSeller && !isBuyer;
            const showFundCancel = isAccepted && isBuyer && !isSeller;
            
            // Only show other actions if we didn't show the prominent buttons
            if (showAcceptReject || showFundCancel) {
              return null;
            }
            
            return availableActions.map((actionItem, index) => (
              <TouchableOpacity
                key={index}
                style={
                  actionItem.action === 'dispute' || actionItem.action === 'cancel'
                    ? styles.disputeButton
                    : styles.confirmButton
                }
                onPress={() => handleStateTransition(actionItem.action, state)}
              >
                <Text
                  style={
                    actionItem.action === 'dispute' || actionItem.action === 'cancel'
                      ? styles.disputeButtonText
                      : styles.confirmButtonText
                  }
                >
                  {actionItem.label}
                </Text>
              </TouchableOpacity>
            ));
          })()}
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
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transactionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  termsSection: {
    marginTop: 8,
  },
  termItem: {
    fontSize: 14,
    color: '#0f172a',
    marginTop: 8,
    marginLeft: 8,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  disputeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  disputeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    marginBottom: 12,
  },
  messageButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  messageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
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
  acceptRejectContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});

