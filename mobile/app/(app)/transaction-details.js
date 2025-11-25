import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CircleCheckBig, AlertTriangle, MessageCircle, CircleCheck, X, CircleX, Banknote, Send, BadgeMinus } from 'lucide-react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as TransactionService from '../../src/services/transactionService';
import * as DatabaseService from '../../src/services/databaseService';
import { TransactionState, getStateDisplayName, getStateColors, getTranslatedStatusName } from '../../src/constants/transactionStates';
import { supabase } from '../../src/lib/supabase';
import TransactionProgressBar from '../../src/components/TransactionProgressBar';

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchTransactionRef = useRef(null);

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
  const fetchTransaction = useCallback(async () => {
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

        // Use availableActions from stateInfo (which includes initiated_by logic)
        // Don't override with fallback logic - let transactionService handle it
        let availableActions = stateInfo.availableActions || [];

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
          fees_responsibility: txn.fees_responsibility,
          initiated_by: txn.initiated_by,
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
  }, [id, state.user?.id, isTestUser]);

  useEffect(() => {
    fetchTransactionRef.current = fetchTransaction;
    fetchTransaction();
  }, [fetchTransaction]);

  // Set up realtime subscription for transaction updates
  useEffect(() => {
    if (!id || !state.user?.id || isTestUser) {
      return;
    }

    console.log('Setting up realtime subscription for transaction:', id);
    
    const channel = supabase
      .channel(`transaction-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Transaction updated:', payload.new);
          const updatedTransaction = payload.new;
          if (updatedTransaction.id === id) {
            console.log('Transaction status changed, refreshing data...');
            if (fetchTransactionRef.current) {
              fetchTransactionRef.current();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Transaction deleted:', payload.old);
          Alert.alert(
            t('transactionDeleted'),
            t('transactionDeleted'),
            [
              {
                text: t('ok') || 'OK',
                onPress: () => {
                  router.push('/(app)/home');
                },
              },
            ]
          );
        }
      )
      .subscribe((status) => {
        console.log('Transaction realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to transaction changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Transaction realtime subscription error');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up transaction realtime subscription...');
      supabase.removeChannel(channel);
    };
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

  const handleStateTransition = async (action, targetState) => {
    if (!transaction || !state.user?.id) {
      console.warn('Cannot transition: missing transaction or user', { transaction: !!transaction, userId: state.user?.id });
      return;
    }

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
            t('openDispute'),
            t('pleaseProvideDisputeReason'),
            [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('submit'),
                onPress: async (reason) => {
                  if (!reason) {
                    Alert.alert(t('error'), t('pleaseProvideDisputeReason'));
                    return;
                  }
                  const disputeResult = await TransactionService.disputeTransaction(transaction.id, state.user.id, reason);
                  if (disputeResult.success) {
                    Alert.alert(t('success'), t('disputeOpened'));
                    router.push('/(app)/home');
                  } else {
                    Alert.alert(t('error'), disputeResult.error || t('failedToOpenDispute'));
                  }
                },
              },
            ],
            'plain-text'
          );
          return;
        case 'cancel':
          Alert.alert(
            t('cancelTransaction'),
            t('confirmCancelTransaction'),
            [
              { text: t('no'), style: 'cancel' },
              {
                text: t('yesCancel'),
                style: 'destructive',
                onPress: async () => {
                  const cancelResult = await TransactionService.cancelTransaction(transaction.id, state.user.id);
                  if (cancelResult.success) {
                    Alert.alert(t('success'), t('transactionCancelled'));
                    router.push('/(app)/home');
                  } else {
                    Alert.alert(t('error'), cancelResult.error || t('failedToCancelTransaction'));
                  }
                },
              },
            ]
          );
          return;
        default:
          console.warn('Unknown action:', action);
          return;
      }

      if (result && result.success) {
        Alert.alert(t('success'), t('transactionUpdated'));
        // Refresh transaction data
        const refreshResult = await TransactionService.getTransactionWithStateInfo(transaction.id, state.user.id);
        if (refreshResult.data) {
          setTransaction(refreshResult.data);
        }
      } else if (result && result.error) {
        Alert.alert(t('error'), result.error);
      } else {
        console.warn('No result returned from action:', action, result);
      }
    } catch (error) {
      console.error('State transition error:', error);
      Alert.alert(t('error'), error.message || t('transactionUpdated'));
    }
  };

  const handleDeleteTransaction = () => {
    Alert.alert(
      t('deleteTransaction'),
      t('confirmDeleteTransaction'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            if (isTestUser) {
              Alert.alert(t('success'), t('transactionDeleted'));
              router.push('/(app)/home');
              return;
            }

            try {
              console.log('Attempting to delete transaction:', transaction.id);
              const result = await DatabaseService.deleteTransaction(transaction.id);
              
              console.log('Delete result:', result);
              
              if (result.error || !result.success) {
                const errorMessage = result.error || 'Failed to delete transaction. Please check if you have permission or if the transaction status allows deletion.';
                console.error('Delete failed:', errorMessage);
                Alert.alert(t('error'), errorMessage);
                return;
              }

              Alert.alert(t('success'), t('transactionDeleted'), [
                {
                  text: t('ok') || 'OK',
                  onPress: () => {
                    router.push('/(app)/home');
                  },
                },
              ]);
            } catch (error) {
              console.error('Delete transaction error:', error);
              Alert.alert(t('error'), error.message || t('failedToDeleteTransaction'));
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
  const statusDisplayName = getTranslatedStatusName(currentState, t);
  const stateInfo = transaction.stateInfo || {};
  const availableActions = stateInfo.availableActions || [];

  // Determine user role - use transaction.role, stateInfo, or determine from buyer_id/seller_id
  let userRole = transaction.role;
  if (!userRole) {
    // Fallback: determine from stateInfo
    if (stateInfo.isSeller) {
      userRole = 'Seller';
    } else if (stateInfo.isBuyer) {
      userRole = 'Buyer';
    } else {
      // Fallback: determine from buyer_id/seller_id
      const userId = state.user?.id;
      if (transaction.seller_id === userId) {
        userRole = 'Seller';
      } else if (transaction.buyer_id === userId) {
        userRole = 'Buyer';
      } else {
        userRole = 'Buyer'; // Default fallback
      }
    }
  }
  
  const roleColors = getRoleColor(userRole);

  // Determine if buttons should show (check both normalized and raw status)
  const isPendingApproval = statusLower === 'pending' || 
                           statusLower === 'pending_approval' ||
                           currentState === TransactionState.PENDING_APPROVAL;
  const isAccepted = statusLower === 'accepted' || 
                    currentState === TransactionState.ACCEPTED;
  
  // Ensure user can only be one role (prevent both buyer and seller)
  const isSeller = (userRole === 'Seller' || userRole === 'seller' || stateInfo.isSeller === true) &&
                   !(userRole === 'Buyer' || userRole === 'buyer' || stateInfo.isBuyer === true);
  const isBuyer = (userRole === 'Buyer' || userRole === 'buyer' || stateInfo.isBuyer === true) &&
                 !(userRole === 'Seller' || userRole === 'seller' || stateInfo.isSeller === true);
  
  // Check if current user is the initiator
  const initiatedBy = transaction.initiated_by;
  const isInitiator = initiatedBy && initiatedBy === state.user?.id;
  
  // Debug logging
  if (isPendingApproval) {
    console.log('Button visibility check:', {
      transactionId: transaction.id,
      initiatedBy,
      currentUserId: state.user?.id,
      isInitiator,
      isPendingApproval,
      willShowAcceptReject: isPendingApproval && !isInitiator,
      willShowCancel: isPendingApproval && isInitiator,
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.backButton}>
            <Text style={[styles.backIcon, isRTL && styles.backIconRTL]}>{isRTL ? '→' : '←'}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('transactionDetails') || 'Transaction Details'}</Text>
          </View>
          {userRole ? (
            <View style={[styles.roleTag, { backgroundColor: roleColors.bg }]}>
              <Text style={[styles.roleTagText, { color: roleColors.text }]}>
                {userRole}
              </Text>
            </View>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Progress Bar */}
        <TransactionProgressBar status={currentState} isRTL={isRTL} />

          {/* Transaction Info Card */}
          <View style={styles.infoCard}>
            <Text style={[styles.transactionTitle, isRTL && styles.textRTL]}>{transaction.title || 'Transaction Information'}</Text>
          
          <View style={styles.infoRowsContainer}>
            {/* Status */}
            <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('status') || 'Status'}</Text>
              <View style={[styles.statusBadgeInline, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusBadgeTextInline, { color: statusColors.text }]}>
                  {statusDisplayName}
                </Text>
              </View>
            </View>

            {/* Buyer - only show if user is not the buyer */}
            {userRole !== 'Buyer' && (
              <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
                <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('buyer') || 'Buyer'}</Text>
                <Text style={[styles.infoValue, isRTL && styles.textRTL]}>
                  {transaction.buyer || maskUserId(transaction.buyer_id)}
                </Text>
              </View>
            )}

            {/* Seller - only show if user is not the seller */}
            {userRole !== 'Seller' && (
              <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
                <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('seller') || 'Seller'}</Text>
                <Text style={[styles.infoValue, isRTL && styles.textRTL]}>
                  {transaction.seller 
                    ? `${transaction.seller} (${maskUserId(transaction.seller_id)})` 
                    : maskUserId(transaction.seller_id)}
                </Text>
              </View>
            )}

            {/* Category */}
            <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('category') || 'Category'}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{transaction.category || 'N/A'}</Text>
            </View>

            {/* Start Date */}
            <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('startDate') || 'Start Date'}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{transaction.startDate || 'N/A'}</Text>
            </View>

            {/* Delivery Date */}
            <View style={[styles.infoRowWithBorder, isRTL && styles.infoRowRTL]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('deliveryDate') || 'Delivery Date'}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{transaction.deliveryDate || transaction.delivery_date || '-'}</Text>
            </View>

            {/* Fees Paid By */}
            <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
              <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('feesPaidBy') || 'Fees Paid By'}</Text>
              <Text style={[styles.infoValue, isRTL && styles.textRTL]}>{transaction.fees_responsibility || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsCard}>
          <Text style={[styles.termsTitle, isRTL && styles.textRTL]}>{t('termsConditions') || 'Terms & Conditions'}</Text>
          <View style={styles.termsList}>
            {(() => {
              let termsArray = [];
              if (transaction.terms) {
                if (Array.isArray(transaction.terms)) {
                  termsArray = transaction.terms;
                } else if (typeof transaction.terms === 'string') {
                  termsArray = transaction.terms.split('\n').filter(term => term.trim() !== '');
                }
              }
              
              return termsArray.length > 0 ? (
                termsArray.map((term, index) => (
                  <View key={index} style={[styles.termItem, isRTL && styles.termItemRTL]}>
                    <Text style={styles.termBullet}>•</Text>
                    <Text style={[styles.termText, isRTL && styles.textRTL]}>{term}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.noTermsText, isRTL && styles.textRTL]}>{t('noTermsSpecified') || 'No terms specified'}</Text>
              );
            })()}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Accept/Reject Buttons - Show for pending_approval state (only to non-initiator) */}
          {(() => {
            // NEVER show accept/reject if user is the initiator
            const initiatedBy = transaction.initiated_by;
            const currentUserId = state.user?.id;
            const userIsInitiator = initiatedBy && String(initiatedBy) === String(currentUserId);
            
            // Early return if user is initiator
            if (userIsInitiator) {
              return null;
            }
            
            // Show accept/reject buttons only if transaction is in pending_approval state
            const showAcceptReject = isPendingApproval;
            
            if (showAcceptReject) {
              return (
                <View style={[styles.acceptRejectContainer, isRTL && styles.acceptRejectContainerRTL]}>
                  <TouchableOpacity
                    style={[styles.acceptButton, isRTL && styles.acceptButtonRTL]}
                    onPress={() => handleStateTransition('accept', TransactionState.ACCEPTED)}
                  >
                    <CircleCheck size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.acceptButtonText}>{t('accept') || 'Accept'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, isRTL && styles.rejectButtonRTL]}
                    onPress={() => {
                      Alert.alert(
                        t('rejectTransaction'),
                        t('confirmRejectTransaction'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          {
                            text: t('reject'),
                            style: 'destructive',
                            onPress: () => handleStateTransition('cancel', TransactionState.CANCELLED),
                          },
                        ]
                      );
                    }}
                  >
                    <X size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.rejectButtonText}>{t('reject') || 'Reject'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return null;
          })()}

          {/* Cancel Button - Show for pending_approval state (only to initiator) */}
          {(() => {
            // Show cancel button only if:
            // 1. Transaction is in pending_approval state
            // 2. User IS the initiator
            // 3. Explicitly check that initiated_by exists and user is the initiator
            const initiatedBy = transaction.initiated_by;
            const currentUserId = state.user?.id;
            const userIsInitiator = initiatedBy && initiatedBy === currentUserId;
            const showCancel = isPendingApproval && userIsInitiator;
            
            if (showCancel) {
              return (
                <View style={[styles.acceptRejectContainer, isRTL && styles.acceptRejectContainerRTL]}>
                  <TouchableOpacity
                    style={[styles.rejectButton, isRTL && styles.rejectButtonRTL]}
                    onPress={() => {
                      Alert.alert(
                        t('cancelTransaction'),
                        t('confirmCancelTransaction'),
                        [
                          { text: t('no'), style: 'cancel' },
                          {
                            text: t('yesCancel'),
                            style: 'destructive',
                            onPress: () => handleStateTransition('cancel', TransactionState.CANCELLED),
                          },
                        ]
                      );
                    }}
                  >
                    <CircleX size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.rejectButtonText}>{t('cancel') || 'Cancel'}</Text>
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
                <View style={[styles.acceptRejectContainer, isRTL && styles.acceptRejectContainerRTL]}>
                  <TouchableOpacity
                    style={[styles.acceptButton, isRTL && styles.acceptButtonRTL]}
                    onPress={() => handleStateTransition('fund', state)}
                  >
                    <Banknote size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.acceptButtonText}>{t('pay') || 'Pay'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectButton, isRTL && styles.rejectButtonRTL]}
                    onPress={() => {
                      Alert.alert(
                        t('cancelTransaction'),
                        t('confirmCancelTransaction'),
                        [
                          { text: t('no'), style: 'cancel' },
                          {
                            text: t('yesCancel'),
                            style: 'destructive',
                            onPress: () => handleStateTransition('cancel', state),
                          },
                        ]
                      );
                    }}
                  >
                    <CircleX size={20} color="#ffffff" strokeWidth={2} />
                    <Text style={styles.rejectButtonText}>{t('cancel') || 'Cancel'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return null;
          })()}

          {/* Dynamic action buttons based on state machine - hide if we already showed accept/reject, cancel (initiator), or fund/cancel */}
          {(() => {
            const showAcceptReject = isPendingApproval && !isInitiator;
            const showCancelInitiator = isPendingApproval && isInitiator;
            const showFundCancel = isAccepted && isBuyer && !isSeller;
            
            // Only show other actions if we didn't show the prominent buttons
            if (showAcceptReject || showCancelInitiator || showFundCancel) {
              return null;
            }
            
            // Filter out accept/reject actions for initiator
            const initiatedBy = transaction.initiated_by;
            const currentUserId = state.user?.id;
            const userIsInitiator = initiatedBy && initiatedBy === currentUserId;
            const filteredActions = availableActions.filter(actionItem => {
              if (userIsInitiator && (actionItem.action === 'accept' || actionItem.action === 'reject')) {
                return false;
              }
              return true;
            });
            
            // Check if we have both "complete" and "dispute" actions (for delivered state)
            const completeAction = filteredActions.find(a => a.action === 'complete');
            const disputeAction = filteredActions.find(a => a.action === 'dispute');
            const otherActions = filteredActions.filter(a => a.action !== 'complete' && a.action !== 'dispute');
            
            return (
              <>
                {/* Special styling for Complete and Dispute buttons when both are present */}
                {completeAction && disputeAction && (
                  <View style={[styles.deliveryActionsContainer, isRTL && styles.deliveryActionsContainerRTL]}>
                    <TouchableOpacity
                      style={[styles.confirmDeliveryButton, isRTL && styles.confirmDeliveryButtonRTL]}
                      onPress={() => handleStateTransition('complete', TransactionState.COMPLETED)}
                    >
                      <CircleCheckBig size={20} color="#ffffff" strokeWidth={2} />
                      <Text style={styles.confirmDeliveryButtonText}>
                        {t('confirmDelivery') || 'Confirm Delivery'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.openDisputeButton, isRTL && styles.openDisputeButtonRTL]}
                      onPress={() => {
                        Alert.prompt(
                          t('openDispute'),
                          t('pleaseProvideDisputeReason'),
                          [
                            { text: t('cancel'), style: 'cancel' },
                            {
                              text: t('submit'),
                              onPress: async (reason) => {
                                if (!reason) {
                                  Alert.alert(t('error'), t('pleaseProvideDisputeReason'));
                                  return;
                                }
                                const disputeResult = await TransactionService.disputeTransaction(transaction.id, state.user.id, reason);
                                if (disputeResult.success) {
                                  Alert.alert(t('success'), t('disputeOpened'));
                                  router.push('/(app)/home');
                                } else {
                                  Alert.alert(t('error'), disputeResult.error || t('failedToOpenDispute'));
                                }
                              },
                            },
                          ],
                          'plain-text'
                        );
                      }}
                    >
                      <AlertTriangle size={20} color="#ffffff" />
                      <Text style={styles.openDisputeButtonText}>
                        {t('openDispute') || 'Open Dispute'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Render other actions (if complete/dispute are separate) */}
                {otherActions.map((actionItem, index) => {
                  // Skip if we already rendered complete/dispute together
                  if (completeAction && disputeAction && (actionItem.action === 'complete' || actionItem.action === 'dispute')) {
                    return null;
                  }
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={
                        actionItem.action === 'dispute'
                          ? styles.disputeButton
                          : actionItem.action === 'cancel'
                          ? [styles.rejectButton, isRTL && styles.rejectButtonRTL]
                          : actionItem.action === 'start_work'
                          ? [styles.startWorkButton, isRTL && styles.startWorkButtonRTL]
                          : actionItem.action === 'deliver'
                          ? [styles.acceptButton, isRTL && styles.acceptButtonRTL]
                          : styles.confirmButton
                      }
                      onPress={() => handleStateTransition(actionItem.action, state)}
                    >
                      {actionItem.action === 'cancel' ? (
                        <>
                          <CircleX size={20} color="#ffffff" strokeWidth={2} />
                          <Text style={styles.rejectButtonText}>
                            {actionItem.label}
                          </Text>
                        </>
                      ) : actionItem.action === 'start_work' ? (
                        <>
                          <Send size={20} color="#00a63e" strokeWidth={2} />
                          <Text style={styles.startWorkButtonText}>
                            {actionItem.label}
                          </Text>
                        </>
                      ) : actionItem.action === 'deliver' ? (
                        <>
                          <CircleCheck size={20} color="#ffffff" strokeWidth={2} />
                          <Text style={styles.acceptButtonText}>
                            {actionItem.label}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={
                            actionItem.action === 'dispute'
                              ? styles.disputeButtonText
                              : styles.confirmButtonText
                          }
                        >
                          {actionItem.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            );
          })()}

          {/* Delete button - only show for cancelled transactions */}
          {(currentState === TransactionState.CANCELLED || statusLower === 'cancelled' || statusLower === 'canceled') && (
            <TouchableOpacity
              style={[styles.deleteButton, isRTL && styles.deleteButtonRTL]}
              onPress={handleDeleteTransaction}
            >
              <BadgeMinus size={20} color="#e7000b" strokeWidth={2} />
              <Text style={styles.deleteButtonText}>{t('delete') || 'Delete'}</Text>
            </TouchableOpacity>
          )}

          {/* Message button - always at the bottom */}
          <TouchableOpacity
            style={[styles.messageButton, isRTL && styles.messageButtonRTL]}
            onPress={() => router.push(`/(app)/chat?transactionId=${transaction.id}&chatId=CHAT${transaction.id}`)}
          >
            <MessageCircle size={20} color="#ffffff" />
            <Text style={styles.messageButtonText}>{t('message') || 'Message'}</Text>
          </TouchableOpacity>
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
  headerRTL: {
    flexDirection: 'row-reverse',
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
  backIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
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
  tagsContainerRTL: {
    flexDirection: 'row-reverse',
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 25,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    marginBottom: 16,
    lineHeight: 24,
  },
  transactionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#101828',
    marginBottom: 16,
    lineHeight: 28,
    textAlign: 'center',
  },
  infoRowsContainer: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
  },
  infoRowWithBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 48,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 16,
    color: '#4a5565',
    fontWeight: 'normal',
    lineHeight: 24,
  },
  infoValue: {
    fontSize: 16,
    color: '#101828',
    fontWeight: 'normal',
    lineHeight: 24,
  },
  statusBadgeInline: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusBadgeTextInline: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
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
  termsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 25,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#101828',
    marginBottom: 16,
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  termsList: {
    gap: 8,
  },
  termItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    minHeight: 24,
  },
  termItemRTL: {
    flexDirection: 'row-reverse',
  },
  termBullet: {
    fontSize: 16,
    color: '#155dfc',
    lineHeight: 24,
    fontFamily: 'Arimo',
    width: 6.5,
  },
  termText: {
    fontSize: 16,
    color: '#364153',
    lineHeight: 24,
    fontFamily: 'Arimo',
    fontWeight: 'normal',
    flex: 1,
  },
  noTermsText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Arimo',
    lineHeight: 24,
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
    height: 56,
    borderRadius: 14,
    backgroundColor: '#155dfc',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 0,
  },
  messageButtonRTL: {
    flexDirection: 'row-reverse',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  deleteButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e7000b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  deleteButtonRTL: {
    flexDirection: 'row-reverse',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#e7000b',
    fontFamily: 'Arimo',
    lineHeight: 24,
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
  },
  acceptRejectContainerRTL: {
    flexDirection: 'row-reverse',
  },
  acceptButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#00a63e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  acceptButtonRTL: {
    flexDirection: 'row-reverse',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  rejectButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e7000b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  rejectButtonRTL: {
    flexDirection: 'row-reverse',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  startWorkButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#00a63e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  startWorkButtonRTL: {
    flexDirection: 'row-reverse',
  },
  startWorkButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#00a63e',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  deliveryActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  deliveryActionsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  confirmDeliveryButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#00a63e',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  confirmDeliveryButtonRTL: {
    flexDirection: 'row-reverse',
  },
  confirmDeliveryButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
  openDisputeButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#e7000b',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  openDisputeButtonRTL: {
    flexDirection: 'row-reverse',
  },
  openDisputeButtonText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
    lineHeight: 24,
  },
});

