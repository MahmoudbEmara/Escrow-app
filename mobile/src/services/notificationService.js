import { supabase } from '../lib/supabase';
import * as DatabaseService from './databaseService';

/**
 * Notification Service
 * Handles all notifications for state transitions
 */

/**
 * Notify receiver that transaction is pending approval
 */
export const notifyReceiver = async (transaction) => {
  try {
    const receiverId = transaction.seller_id;
    const message = `Transaction "${transaction.title}" is pending your approval.`;
    
    await DatabaseService.createNotification({
      user_id: receiverId,
      title: 'Transaction Pending Approval',
      message: message,
      type: 'transaction_update',
      data: {
        transaction_id: transaction.id,
        state: 'pending_approval',
      },
    });

    console.log(`Notified receiver ${receiverId} about pending approval`);
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying receiver:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify buyer to pay for the transaction
 */
export const notifyBuyerToPay = async (transaction) => {
  try {
    const buyerId = transaction.buyer_id;
    const message = `Transaction "${transaction.title}" has been accepted. Please fund the escrow with $${transaction.amount}.`;
    
    await DatabaseService.createNotification({
      user_id: buyerId,
      title: 'Payment Required',
      message: message,
      type: 'payment_required',
      data: {
        transaction_id: transaction.id,
        state: 'accepted',
        amount: transaction.amount,
      },
    });

    console.log(`Notified buyer ${buyerId} to pay`);
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying buyer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify seller to start work
 */
export const notifySellerStartWork = async (transaction) => {
  try {
    const sellerId = transaction.seller_id;
    const message = `Transaction "${transaction.title}" has been funded. You can now start working on it.`;
    
    await DatabaseService.createNotification({
      user_id: sellerId,
      title: 'Start Work',
      message: message,
      type: 'work_start',
      data: {
        transaction_id: transaction.id,
        state: 'funded',
      },
    });

    console.log(`Notified seller ${sellerId} to start work`);
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying seller:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Log that seller has started work
 */
export const logSellerStarted = async (transaction) => {
  try {
    // Log to transaction history
    await DatabaseService.addTransactionHistory({
      user_id: transaction.seller_id,
      transaction_id: transaction.id,
      type: 'status_change',
      amount: 0,
      description: 'Seller started work on transaction',
      metadata: {
        state: 'in_progress',
        started_at: new Date().toISOString(),
      },
    });

    console.log(`Logged seller started work for transaction ${transaction.id}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error logging seller started:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify buyer to review delivered work
 */
export const notifyBuyerReview = async (transaction) => {
  try {
    const buyerId = transaction.buyer_id;
    const message = `Transaction "${transaction.title}" has been delivered. Please review and confirm completion.`;
    
    await DatabaseService.createNotification({
      user_id: buyerId,
      title: 'Review Delivery',
      message: message,
      type: 'delivery_review',
      data: {
        transaction_id: transaction.id,
        state: 'delivered',
      },
    });

    console.log(`Notified buyer ${buyerId} to review delivery`);
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying buyer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Release funds to seller
 */
export const releaseFundsToSeller = async (transaction) => {
  try {
    const sellerId = transaction.seller_id;
    const amount = transaction.amount;

    // Update seller's wallet
    await DatabaseService.updateWalletBalance(sellerId, amount);

    // Add transaction history
    await DatabaseService.addTransactionHistory({
      user_id: sellerId,
      transaction_id: transaction.id,
      type: 'escrow_release',
      amount: amount,
      description: `Funds released for transaction: ${transaction.title}`,
      metadata: {
        state: 'completed',
        released_at: new Date().toISOString(),
      },
    });

    // Notify seller
    await DatabaseService.createNotification({
      user_id: sellerId,
      title: 'Funds Released',
      message: `$${amount} has been released to your wallet for transaction "${transaction.title}".`,
      type: 'funds_released',
      data: {
        transaction_id: transaction.id,
        state: 'completed',
        amount: amount,
      },
    });

    console.log(`Released $${amount} to seller ${sellerId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error releasing funds:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notify support and seller about dispute
 */
export const notifySupportAndSeller = async (transaction) => {
  try {
    const sellerId = transaction.seller_id;
    const buyerId = transaction.buyer_id;

    // Notify seller
    await DatabaseService.createNotification({
      user_id: sellerId,
      title: 'Transaction Disputed',
      message: `Transaction "${transaction.title}" has been disputed by the buyer.`,
      type: 'dispute',
      data: {
        transaction_id: transaction.id,
        state: 'disputed',
      },
    });

    // Notify buyer
    await DatabaseService.createNotification({
      user_id: buyerId,
      title: 'Dispute Filed',
      message: `Your dispute for transaction "${transaction.title}" has been received. Support will review it.`,
      type: 'dispute',
      data: {
        transaction_id: transaction.id,
        state: 'disputed',
      },
    });

    console.log(`Notified support and seller about dispute for transaction ${transaction.id}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error notifying support:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Execute action based on state transition
 */
export const executeTransitionAction = async (transaction, toState) => {
  const actions = {
    'pending_approval': notifyReceiver,
    'accepted': notifyBuyerToPay,
    'funded': notifySellerStartWork,
    'in_progress': logSellerStarted,
    'delivered': notifyBuyerReview,
    'completed': releaseFundsToSeller,
    'disputed': notifySupportAndSeller,
  };

  const action = actions[toState];
  if (action) {
    return await action(transaction);
  }

  return { success: true }; // No action needed
};
