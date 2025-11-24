import * as DatabaseService from './databaseService';
import { TransactionState, getValidNextStates, isValidTransition, STATE_DISPLAY_NAMES, getStateColors } from '../constants/transactionStates';

/**
 * Transaction Service
 * High-level API for transaction operations with state machine
 */

/**
 * Create a new transaction (starts in draft state)
 */
export const createTransaction = async (transactionData) => {
  return DatabaseService.createTransaction({
    ...transactionData,
    status: TransactionState.DRAFT,
  });
};

/**
 * Submit transaction for approval (draft → pending_approval)
 */
export const submitForApproval = async (transactionId, userId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.PENDING_APPROVAL,
    userId
  );
};

/**
 * Accept transaction (pending_approval → accepted)
 */
export const acceptTransaction = async (transactionId, userId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.ACCEPTED,
    userId
  );
};

/**
 * Cancel transaction
 */
export const cancelTransaction = async (transactionId, userId, reason = null) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.CANCELLED,
    userId,
    {
      stateMetadata: {
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      },
    }
  );
};

/**
 * Fund transaction (accepted → funded)
 * Also handles wallet deduction
 */
export const fundTransaction = async (transactionId, userId) => {
  try {
    // Get transaction to check amount
    const transactionResult = await DatabaseService.getTransaction(transactionId);
    if (transactionResult.error || !transactionResult.data) {
      return {
        success: false,
        error: 'Transaction not found',
      };
    }

    const transaction = transactionResult.data;

    // Verify user is buyer
    if (transaction.buyer_id !== userId) {
      return {
        success: false,
        error: 'Only buyer can fund transaction',
      };
    }

    // Check if already funded
    if (transaction.status !== TransactionState.ACCEPTED) {
      return {
        success: false,
        error: `Transaction must be in 'accepted' state to fund. Current state: ${transaction.status}`,
      };
    }

    // Deduct from buyer's wallet
    const walletResult = await DatabaseService.updateWalletBalance(userId, -transaction.amount);
    if (walletResult.error) {
      return {
        success: false,
        error: walletResult.error || 'Insufficient funds',
      };
    }

    // Add escrow hold to history
    await DatabaseService.addTransactionHistory({
      user_id: userId,
      transaction_id: transactionId,
      type: 'escrow_hold',
      amount: -transaction.amount,
      balance_before: walletResult.data?.balance_before,
      balance_after: walletResult.data?.balance,
      description: `Funds held in escrow for transaction: ${transaction.title}`,
      metadata: {
        transaction_id: transactionId,
      },
    });

    // Transition to funded state
    return DatabaseService.transitionTransactionState(
      transactionId,
      TransactionState.FUNDED,
      userId
    );
  } catch (error) {
    console.error('Fund transaction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fund transaction',
    };
  }
};

/**
 * Start work (funded → in_progress)
 */
export const startWork = async (transactionId, userId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.IN_PROGRESS,
    userId
  );
};

/**
 * Mark as delivered (in_progress → delivered)
 */
export const markAsDelivered = async (transactionId, userId, deliveryNotes = null) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.DELIVERED,
    userId,
    {
      stateMetadata: {
        delivery_notes: deliveryNotes,
        delivered_at: new Date().toISOString(),
      },
    }
  );
};

/**
 * Complete transaction (delivered → completed)
 */
export const completeTransaction = async (transactionId, userId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.COMPLETED,
    userId
  );
};

/**
 * Dispute transaction (delivered → disputed)
 */
export const disputeTransaction = async (transactionId, userId, reason) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.DISPUTED,
    userId,
    {
      stateMetadata: {
        dispute_reason: reason,
        disputed_at: new Date().toISOString(),
      },
    }
  );
};

/**
 * Resolve dispute - complete (disputed → completed) - Admin only
 */
export const resolveDisputeComplete = async (transactionId, adminId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.COMPLETED,
    adminId,
    {
      isAdmin: true,
      stateMetadata: {
        dispute_resolution: 'completed',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      },
    }
  );
};

/**
 * Resolve dispute - cancel (disputed → cancelled) - Admin only
 */
export const resolveDisputeCancel = async (transactionId, adminId) => {
  return DatabaseService.transitionTransactionState(
    transactionId,
    TransactionState.CANCELLED,
    adminId,
    {
      isAdmin: true,
      stateMetadata: {
        dispute_resolution: 'cancelled',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      },
    }
  );
};

/**
 * Get transaction with state information
 */
export const getTransactionWithStateInfo = async (transactionId, userId) => {
  const result = await DatabaseService.getTransaction(transactionId);
  
  if (result.error || !result.data) {
    return result;
  }

  const transaction = result.data;
  
  // Normalize status to handle old format ("Pending") and new format ("pending_approval")
  const normalizeStatus = (status) => {
    if (!status) return TransactionState.DRAFT;
    const s = (status || '').toLowerCase().trim();
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
    return statusMap[s] || status;
  };
  
  const normalizedStatus = normalizeStatus(transaction.status);
  const validNextStates = getValidNextStates(normalizedStatus);
  
  // Prevent user from being both buyer and seller
  const isBuyer = transaction.buyer_id === userId && transaction.seller_id !== userId;
  const isSeller = transaction.seller_id === userId && transaction.buyer_id !== userId;

  // Check if current user is the initiator
  const initiatedBy = transaction.initiated_by;
  const isInitiator = initiatedBy && initiatedBy === userId;
  
  // Debug logging
  console.log('Transaction acceptance check:', {
    transactionId: transaction.id,
    userId,
    initiatedBy,
    isInitiator,
    isBuyer,
    isSeller,
    status: transaction.status,
  });

  // Determine which actions the current user can perform
  const availableActions = [];
  
  if (isBuyer && !isSeller) {
    if (normalizedStatus === TransactionState.DRAFT || transaction.status === 'draft') {
      availableActions.push({ action: 'submit', state: TransactionState.PENDING_APPROVAL, label: 'Submit for Approval' });
    }
    // Buyer can accept when transaction is in pending_approval
    // Only show accept if buyer is NOT the initiator (i.e., seller initiated)
    if (normalizedStatus === TransactionState.PENDING_APPROVAL || 
        (transaction.status || '').toLowerCase() === 'pending' ||
        (transaction.status || '').toLowerCase() === 'pending_approval') {
      // Show accept only if buyer is NOT the initiator
      if (!isInitiator) {
        availableActions.push({ action: 'accept', state: TransactionState.ACCEPTED, label: 'Accept Transaction' });
      }
    }
    if (normalizedStatus === TransactionState.ACCEPTED || transaction.status === 'accepted') {
      availableActions.push({ action: 'fund', state: TransactionState.FUNDED, label: 'Fund Transaction' });
    }
    if (normalizedStatus === TransactionState.DELIVERED || transaction.status === 'delivered') {
      availableActions.push(
        { action: 'complete', state: TransactionState.COMPLETED, label: 'Complete Transaction' },
        { action: 'dispute', state: TransactionState.DISPUTED, label: 'Open Dispute' }
      );
    }
    if ([TransactionState.PENDING_APPROVAL, TransactionState.ACCEPTED].includes(normalizedStatus) ||
        ['pending', 'pending_approval', 'accepted'].includes((transaction.status || '').toLowerCase())) {
      availableActions.push({ action: 'cancel', state: TransactionState.CANCELLED, label: 'Cancel Transaction' });
    }
  }

  if (isSeller && !isBuyer) {
    // Seller can accept when transaction is in pending_approval
    // Only show accept if seller is NOT the initiator (i.e., buyer initiated)
    if (normalizedStatus === TransactionState.PENDING_APPROVAL || 
        (transaction.status || '').toLowerCase() === 'pending' ||
        (transaction.status || '').toLowerCase() === 'pending_approval') {
      // Show accept only if seller is NOT the initiator
      if (!isInitiator) {
        availableActions.push({ action: 'accept', state: TransactionState.ACCEPTED, label: 'Accept Transaction' });
      }
    }
    if (normalizedStatus === TransactionState.FUNDED || transaction.status === 'funded') {
      availableActions.push({ action: 'start_work', state: TransactionState.IN_PROGRESS, label: 'Start Work' });
    }
    if (normalizedStatus === TransactionState.IN_PROGRESS || 
        (transaction.status || '').toLowerCase() === 'in_progress' ||
        (transaction.status || '').toLowerCase() === 'in progress') {
      availableActions.push({ action: 'deliver', state: TransactionState.DELIVERED, label: 'Mark as Delivered' });
    }
    if ([TransactionState.PENDING_APPROVAL, TransactionState.ACCEPTED].includes(normalizedStatus) ||
        ['pending', 'pending_approval', 'accepted'].includes((transaction.status || '').toLowerCase())) {
      availableActions.push({ action: 'cancel', state: TransactionState.CANCELLED, label: 'Cancel Transaction' });
    }
  }

  return {
    ...result,
    data: {
      ...transaction,
      stateInfo: {
        currentState: transaction.status,
        displayName: STATE_DISPLAY_NAMES[transaction.status],
        colors: getStateColors(transaction.status),
        validNextStates,
        availableActions,
        isBuyer,
        isSeller,
      },
    },
  };
};

/**
 * Get all transactions for user with state info
 */
export const getUserTransactions = async (userId, options = {}) => {
  const result = await DatabaseService.getTransactions(userId, options);
  
  if (result.error || !result.data) {
    return result;
  }

  const transactions = result.data.map(transaction => {
    const validNextStates = getValidNextStates(transaction.status);
    const isBuyer = transaction.buyer_id === userId;
    const isSeller = transaction.seller_id === userId;

    return {
      ...transaction,
      stateInfo: {
        currentState: transaction.status,
        displayName: STATE_DISPLAY_NAMES[transaction.status],
        colors: getStateColors(transaction.status),
        validNextStates,
        isBuyer,
        isSeller,
      },
    };
  });

  return {
    data: transactions,
    error: null,
  };
};
