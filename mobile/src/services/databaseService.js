import { supabase } from '../lib/supabase';
import { isValidTransition } from '../constants/transactionStates';
import * as NotificationService from './notificationService';

/**
 * Database Service
 * Handles database operations for transactions, messages, profiles, wallets, etc.
 */

/**
 * Generic function to fetch from a table
 * @param {string} table - Table name
 * @param {object} options - Query options (select, filter, order, limit, etc.)
 * @returns {Promise<object>} - Query result
 */
export const fetchFromTable = async (table, options = {}) => {
  try {
    let query = supabase.from(table).select(options.select || '*');

    // Apply filters
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending !== false,
      });
    }

    // Apply limit and offset
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    console.error(`Fetch from ${table} error:`, error);
    return {
      data: null,
      error: error.message || `Failed to fetch from ${table}`,
    };
  }
};

/**
 * Generic function to insert into a table
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @returns {Promise<object>} - Insert result
 */
export const insertIntoTable = async (table, data) => {
  try {
    console.log(`Attempting to insert into ${table}:`, JSON.stringify(data, null, 2));
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`Insert into ${table} error details:`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    console.log(`Successfully inserted into ${table}:`, result);
    return {
      data: result,
      error: null,
    };
  } catch (error) {
    console.error(`Insert into ${table} error:`, error);
    return {
      data: null,
      error: error.message || `Failed to insert into ${table}`,
    };
  }
};

/**
 * Generic function to update a table
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} - Update result
 */
export const updateTable = async (table, id, updates) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        data: null,
        error: `No rows updated. The record may not exist or you may not have permission to update it.`,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error(`Update ${table} error:`, error);
    return {
      data: null,
      error: error.message || `Failed to update ${table}`,
    };
  }
};

/**
 * Generic function to delete from a table
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<object>} - Delete result
 */
export const deleteFromTable = async (table, id) => {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      throw error;
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error(`Delete from ${table} error:`, error);
    return {
      success: false,
      error: error.message || `Failed to delete from ${table}`,
    };
  }
};

// ==================== TRANSACTIONS ====================

/**
 * Get all transactions for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Transactions list
 */
export const getTransactions = async (userId, options = {}) => {
  try {
    if (!userId) {
      return { data: [], error: null };
    }

    // Try to fetch with joined profiles, fallback to basic query
    let query = supabase
      .from('transactions')
      .select(`
        *,
        buyer_profile:profiles!buyer_id(id, name, email),
        seller_profile:profiles!seller_id(id, name, email)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending !== false,
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback to basic query if join fails
      console.warn('Join query failed, using basic query:', error);
      let basicQuery = supabase
        .from('transactions')
        .select('*')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      const { data: basicData, error: basicError } = await basicQuery;
      
      if (basicError) {
        throw basicError;
      }

      // Map transactions to include role based on user
      const mappedData = (basicData || []).map(transaction => ({
        ...transaction,
        role: transaction.buyer_id === userId ? 'Buyer' : 'Seller',
      }));

      return {
        data: mappedData,
        error: null,
      };
    }

    // Map transactions to include role based on user
    const mappedData = (data || []).map(transaction => ({
      ...transaction,
      role: transaction.buyer_id === userId ? 'Buyer' : 'Seller',
    }));

    return {
      data: mappedData,
      error: null,
    };
  } catch (error) {
    console.error('Get transactions error:', error);
    return {
      data: null,
      error: error.message || 'Failed to get transactions',
    };
  }
};

/**
 * Get a single transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object>} - Transaction data
 */
export const getTransaction = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      throw error;
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Get transaction error:', error);
    return {
      data: null,
      error: error.message || 'Failed to get transaction',
    };
  }
};

/**
 * Create a new transaction (starts in draft state)
 * @param {object} transactionData - Transaction data
 * @returns {Promise<object>} - Created transaction
 */
export const createTransaction = async (transactionData) => {
  const result = await insertIntoTable('transactions', {
    ...transactionData,
    created_at: new Date().toISOString(),
    status: transactionData.status || 'draft',
  });
  
  // Log transaction initiation in transaction_history if initiated_by is set
  if (result.data && transactionData.initiated_by) {
    try {
      console.log('Logging transaction initiation:', {
        user_id: transactionData.initiated_by,
        transaction_id: result.data.id,
      });
      
      const historyData = {
        user_id: transactionData.initiated_by,
        transaction_id: result.data.id,
        type: 'status_change',
        amount: 0,
        description: `Transaction initiated`,
      };
      
      const insertData = {
        ...historyData,
        created_at: new Date().toISOString(),
      };
      
      // Remove metadata if it exists (transaction_history table doesn't have metadata column)
      const { metadata: _, ...dataWithoutMetadata } = insertData;
      
      const historyResult = await insertIntoTable('transaction_history', dataWithoutMetadata);
      
      if (historyResult.error) {
        console.error('Failed to log transaction initiation in history:', historyResult.error);
      } else if (historyResult.data) {
        console.log('Transaction initiation logged successfully:', historyResult.data);
      } else {
        console.warn('Transaction initiation logging returned no data:', historyResult);
      }
    } catch (historyError) {
      console.error('Exception while logging transaction initiation in history:', historyError);
    }
  } else {
    if (!result.data) {
      console.warn('Cannot log initiation: transaction creation failed or returned no data');
    }
    if (!transactionData.initiated_by) {
      console.warn('Cannot log initiation: initiated_by not set in transactionData', transactionData);
    }
  }
  
  return result;
};

/**
 * Transition transaction to a new state (with validation and actions)
 * @param {string} transactionId - Transaction ID
 * @param {string} toState - Target state
 * @param {string} userId - User ID performing the transition
 * @param {object} metadata - Additional metadata for the transition
 * @returns {Promise<object>} - Transition result
 */
export const transitionTransactionState = async (transactionId, toState, userId, metadata = {}) => {
  try {
    // Normalize status function
    const normalizeStatus = (status) => {
      if (!status) return 'draft';
      const s = (status || '').toLowerCase().trim();
      const statusMap = {
        'pending': 'pending_approval',
        'pending_approval': 'pending_approval',
        'accepted': 'accepted',
        'funded': 'funded',
        'in progress': 'in_progress',
        'in_progress': 'in_progress',
        'delivered': 'delivered',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'canceled': 'cancelled',
        'disputed': 'disputed',
        'in dispute': 'disputed',
        'draft': 'draft',
      };
      return statusMap[s] || status;
    };

    // Get current transaction
    const transactionResult = await getTransaction(transactionId);
    if (transactionResult.error || !transactionResult.data) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction not found',
      };
    }

    const transaction = transactionResult.data;
    const rawFromState = transaction.status;
    const fromState = normalizeStatus(rawFromState);
    const normalizedToState = normalizeStatus(toState);

    // Validate transition
    if (!isValidTransition(fromState, normalizedToState)) {
      return {
        success: false,
        error: `Invalid transition from ${fromState} to ${normalizedToState}`,
      };
    }

    // Validate user permissions
    const isBuyer = transaction.buyer_id === userId;
    const isSeller = transaction.seller_id === userId;
    const isAdmin = metadata.isAdmin || false;

    // Check if current user is the initiator
    const initiatedBy = transaction.initiated_by;
    const isInitiator = initiatedBy === userId;

    // Permission checks based on state (use normalized state)
    if (normalizedToState === 'pending_approval' && !isBuyer) {
      return { success: false, error: 'Only buyer can submit for approval' };
    }
    // The OTHER party (not the initiator) should accept/reject
    if (normalizedToState === 'accepted') {
      if (!isBuyer && !isSeller) {
        return { success: false, error: 'Only transaction participants can accept' };
      }
      
      // If initiated_by is set, only the OTHER party can accept
      if (initiatedBy) {
        console.log('Accept permission check:', {
          transactionId: transaction.id,
          userId,
          initiatedBy,
          isInitiator,
          isBuyer,
          isSeller,
        });
        
        if (isInitiator) {
          console.log('BLOCKED: User is the initiator, cannot accept');
          return { success: false, error: 'Only the other party can accept this transaction' };
        }
        console.log('ALLOWED: User is not the initiator, can accept');
      } else {
        console.log('No initiated_by set, allowing accept (backward compatibility)');
      }
    }
    if (normalizedToState === 'funded' && !isBuyer) {
      return { success: false, error: 'Only buyer can fund transaction' };
    }
    if (normalizedToState === 'in_progress' && !isSeller) {
      return { success: false, error: 'Only seller can start work' };
    }
    if (normalizedToState === 'delivered' && !isSeller) {
      return { success: false, error: 'Only seller can mark as delivered' };
    }
    if (normalizedToState === 'completed' && !isBuyer && !isAdmin) {
      return { success: false, error: 'Only buyer can complete transaction' };
    }
    if (normalizedToState === 'disputed' && !isBuyer && !isSeller) {
      return { success: false, error: 'Only buyer or seller can dispute' };
    }
    if (normalizedToState === 'cancelled' && !isBuyer && !isSeller && !isAdmin) {
      return { success: false, error: 'Only buyer, seller, or admin can cancel' };
    }
    if ((normalizedToState === 'completed' || normalizedToState === 'cancelled') && fromState === 'disputed' && !isAdmin) {
      return { success: false, error: 'Only admin can resolve disputes' };
    }

    // Update transaction state (use normalized state - must match database constraint)
    // Database constraint only allows: draft, pending_approval, accepted, funded, in_progress, delivered, completed, cancelled, disputed
    // Ensure we're using the exact values from the constraint
    let dbStatus = normalizedToState;
    
    // Map any variations to the exact constraint values
    if (dbStatus === 'pending') {
      dbStatus = 'pending_approval';
    } else if (dbStatus === 'canceled') {
      dbStatus = 'cancelled';
    } else if (dbStatus === 'in progress') {
      dbStatus = 'in_progress';
    } else if (dbStatus === 'in dispute') {
      dbStatus = 'disputed';
    }
    
    // Validate the status is one of the allowed values
    const allowedStatuses = ['draft', 'pending_approval', 'accepted', 'funded', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed'];
    if (!allowedStatuses.includes(dbStatus)) {
      return {
        success: false,
        error: `Invalid status value: ${dbStatus}. Must be one of: ${allowedStatuses.join(', ')}`,
      };
    }
    
    const updateData = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };
    
    if (metadata.stateMetadata) {
      if (metadata.stateMetadata.delivered_at) {
        updateData.delivered_at = metadata.stateMetadata.delivered_at;
      }
    }
    
    const updateResult = await updateTable('transactions', transactionId, updateData);

    if (updateResult.error) {
      return {
        success: false,
        error: updateResult.error,
      };
    }

    // Log state transition
    await addTransactionHistory({
      user_id: userId,
      transaction_id: transactionId,
      type: 'status_change',
      amount: 0,
      description: `State changed from ${fromState} to ${normalizedToState}`,
      metadata: {
        from_state: fromState,
        to_state: normalizedToState,
        changed_by: userId,
        ...metadata,
      },
    });

    // Execute transition action (notifications, etc.)
    // updateResult.data might be an array or single object
    const updatedTransaction = Array.isArray(updateResult.data) 
      ? updateResult.data[0] 
      : updateResult.data;
    
    if (updatedTransaction) {
      // Update the status in the transaction object for notification service
      updatedTransaction.status = normalizedToState;
      await NotificationService.executeTransitionAction(updatedTransaction, normalizedToState, userId);
    }

    return {
      success: true,
      data: updatedTransaction,
      error: null,
    };
  } catch (error) {
    console.error('Transition transaction state error:', error);
    return {
      success: false,
      error: error.message || 'Failed to transition transaction state',
    };
  }
};

/**
 * Update transaction (non-state changes)
 * @param {string} transactionId - Transaction ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} - Updated transaction
 */
export const updateTransaction = async (transactionId, updates) => {
  return updateTable('transactions', transactionId, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Delete transaction and all related data
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object>} - Delete result
 */
export const deleteTransaction = async (transactionId) => {
  try {
    console.log('Deleting transaction:', transactionId);
    
    // First, get the transaction to find buyer_id and seller_id for notification deletion
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('buyer_id, seller_id')
      .eq('id', transactionId)
      .single();
    
    const userIds = [];
    if (transaction) {
      if (transaction.buyer_id) userIds.push(transaction.buyer_id);
      if (transaction.seller_id) userIds.push(transaction.seller_id);
    }
    
    // Delete notifications related to this transaction
    if (userIds.length > 0) {
      try {
        // Fetch notifications for users involved in the transaction
        const { data: notifications, error: fetchError } = await supabase
          .from('notifications')
          .select('id, data')
          .in('user_id', userIds);
        
        if (fetchError) {
          console.warn('Could not fetch notifications for deletion:', fetchError);
        } else if (notifications && notifications.length > 0) {
          // Filter notifications that reference this transaction
          const matchingNotifications = notifications.filter(notif => {
            const data = notif.data;
            if (!data || typeof data !== 'object') return false;
            return data.transaction_id === transactionId;
          });
          
          if (matchingNotifications.length > 0) {
            const notificationIds = matchingNotifications.map(n => n.id);
            const { error: deleteError } = await supabase
              .from('notifications')
              .delete()
              .in('id', notificationIds);
            
            if (deleteError) {
              console.error('Error deleting notifications:', deleteError);
            } else {
              console.log(`Deleted ${matchingNotifications.length} notification(s) successfully`);
            }
          } else {
            console.log('No notifications found for this transaction');
          }
        }
      } catch (notificationsErr) {
        console.warn('Error deleting notifications, continuing with transaction deletion:', notificationsErr);
      }
    }
    
    // Delete related messages first (if messages table exists and has transaction_id)
    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('transaction_id', transactionId);
      
      if (messagesError && !messagesError.message.includes('does not exist')) {
        console.error('Error deleting messages:', messagesError);
        // Continue anyway - messages might not exist
      } else {
        console.log('Messages deleted successfully');
      }
    } catch (messagesErr) {
      console.log('Messages table might not exist or have transaction_id:', messagesErr);
    }
    
    // Delete transaction terms (if transaction_terms table exists)
    // Note: Terms might be stored in the transactions table itself, so this table might not exist
    try {
      const { error: termsError } = await supabase
        .from('transaction_terms')
        .delete()
        .eq('transaction_id', transactionId);
      
      if (termsError) {
        // Check if it's a "table not found" error (code PGRST205)
        if (termsError.code === 'PGRST205' || termsError.message.includes('does not exist') || termsError.message.includes('Could not find the table')) {
          console.log('Transaction terms table does not exist (terms likely stored in transactions table)');
          // This is expected - terms are probably stored in the transactions table itself
        } else {
          console.error('Error deleting transaction terms:', termsError);
          // Continue anyway - don't block deletion
        }
      } else {
        console.log('Transaction terms deleted successfully');
      }
    } catch (termsErr) {
      console.log('Transaction terms table might not exist (this is OK):', termsErr.message || termsErr);
    }
    
    // Delete transaction history entries - MUST succeed before deleting transaction
    try {
      // Get current user ID for RPC function
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }
      
      // Try using RPC function first (bypasses RLS)
      try {
        console.log('Attempting to delete transaction history via RPC function...');
        const { data: deletedCount, error: rpcError } = await supabase.rpc(
          'delete_transaction_history_for_transaction',
          {
            p_transaction_id: transactionId,
            p_user_id: currentUserId,
          }
        );
        
        if (rpcError) {
          console.warn('RPC function failed or does not exist, trying direct delete:', rpcError);
          throw rpcError;
        }
        
        console.log(`RPC function deleted ${deletedCount || 0} transaction history record(s)`);
        
        // Verify deletion succeeded
        const { data: remainingRecords, error: verifyError } = await supabase
          .from('transaction_history')
          .select('id')
          .eq('transaction_id', transactionId);
        
        if (verifyError && verifyError.code !== '42501') {
          console.warn('Could not verify deletion:', verifyError);
        } else if (remainingRecords && remainingRecords.length > 0) {
          console.warn(`${remainingRecords.length} records still exist, but RPC should have deleted them`);
        } else {
          console.log('Transaction history deletion verified via RPC');
        }
      } catch (rpcErr) {
        // Fallback to direct delete if RPC doesn't exist
        console.log('Falling back to direct delete method...');
        console.log('RPC error:', rpcErr);
        
        // First, check if there are any records to delete
        const { data: historyRecords, error: checkError } = await supabase
          .from('transaction_history')
          .select('id, user_id, transaction_id')
          .eq('transaction_id', transactionId);
        
        console.log('History records check result:', { historyRecords, checkError });
        
        if (checkError) {
          console.error('Error checking transaction history:', checkError);
          if (checkError.code === '42501') {
            throw new Error(`Permission denied: Cannot access transaction history. Please run the migrations 'create_delete_transaction_history_function.sql' and 'add_delete_policy_for_transaction_history.sql' in Supabase SQL Editor.`);
          }
          throw new Error(`Failed to check transaction history: ${checkError.message}`);
        }
        
        if (historyRecords && historyRecords.length > 0) {
          console.log(`Found ${historyRecords.length} transaction history record(s) to delete:`, historyRecords.map(r => r.id));
          
          // Delete all records in one query
          const { data: deletedData, error: deleteError } = await supabase
            .from('transaction_history')
            .delete()
            .eq('transaction_id', transactionId)
            .select();
          
          console.log('Delete transaction_history result:', { deletedData, deleteError, deletedCount: deletedData?.length });
          
          if (deleteError) {
            console.error('Error deleting transaction history:', deleteError);
            
            if (deleteError.code === '42501') {
              throw new Error(`Permission denied: Cannot delete transaction history. Please run the migrations 'create_delete_transaction_history_function.sql' and 'add_delete_policy_for_transaction_history.sql' in Supabase SQL Editor.`);
            }
            
            throw new Error(`Failed to delete transaction history: ${deleteError.message}`);
          }
          
          // CRITICAL: Verify deletion succeeded before proceeding
          const { data: remainingRecords, error: verifyError } = await supabase
            .from('transaction_history')
            .select('id')
            .eq('transaction_id', transactionId);
          
          console.log('Verification check after deletion:', { remainingRecords, verifyError, remainingCount: remainingRecords?.length });
          
          if (verifyError) {
            if (verifyError.code === '42501') {
              throw new Error(`Cannot verify transaction history deletion due to RLS. Please run the migrations 'create_delete_transaction_history_function.sql' and 'add_delete_policy_for_transaction_history.sql' in Supabase SQL Editor.`);
            }
            console.warn('Could not verify deletion:', verifyError);
            // If we can't verify, we can't safely proceed
            throw new Error(`Cannot verify transaction history deletion: ${verifyError.message}`);
          }
          
          if (remainingRecords && remainingRecords.length > 0) {
            console.error(`CRITICAL: ${remainingRecords.length} transaction history record(s) still exist after deletion attempt`);
            console.error('Remaining record IDs:', remainingRecords.map(r => r.id));
            throw new Error(`Failed to delete all transaction history records. ${remainingRecords.length} record(s) still exist. This will prevent transaction deletion. Please run the migrations 'create_delete_transaction_history_function.sql' and 'add_delete_policy_for_transaction_history.sql'.`);
          }
          
          console.log(`Successfully deleted ${historyRecords.length} transaction history record(s) - verified (no remaining records)`);
        } else {
          console.log('No transaction history records found to delete');
        }
      }
    } catch (historyErr) {
      console.error('CRITICAL: Error deleting transaction history:', historyErr);
      console.error('Transaction deletion cannot proceed without deleting history first');
      throw historyErr;
    }
    
    // Finally, delete the transaction itself
    console.log('Attempting to delete transaction with ID:', transactionId);
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .select();
    
    console.log('Delete transaction result:', { data, error });
    
    if (error) {
      console.error('Error deleting transaction:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
    
    // Check if any rows were actually deleted
    if (data && data.length === 0) {
      console.warn('No rows were deleted - transaction might not exist or RLS policy blocked deletion');
      return {
        success: false,
        error: 'Transaction not found or you do not have permission to delete it',
      };
    }
    
    console.log('Transaction deleted successfully:', data);
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Delete transaction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete transaction',
    };
  }
};

// ==================== MESSAGES ====================

/**
 * Get all chats for a user (grouped by transaction)
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Chats list with transaction info
 */
export const getChatsForUser = async (userId) => {
  try {
    // Get all transactions where user is buyer or seller
    let transactions;
    let txnError;
    
    // Try with join first
    const { data: transactionsWithJoin, error: joinError } = await supabase
      .from('transactions')
      .select('id, title, status, buyer_id, seller_id, created_at, buyer_profile:buyer_id(name, is_online), seller_profile:seller_id(name, is_online)')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (joinError) {
      // If join fails, try without join
      const { data: transactionsWithoutJoin, error: noJoinError } = await supabase
        .from('transactions')
        .select('id, title, status, buyer_id, seller_id, created_at')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      transactions = transactionsWithoutJoin;
      txnError = noJoinError;
    } else {
      transactions = transactionsWithJoin;
    }

    if (txnError) {
      throw txnError;
    }

    if (!transactions || transactions.length === 0) {
      return { data: [], error: null };
    }

    // For each transaction, get the last message and unread count
    const chats = await Promise.all(
      transactions.map(async (txn) => {
        // Determine the other party
        const otherPartyId = txn.buyer_id === userId ? txn.seller_id : txn.buyer_id;
        let otherPartyName = 'User';
        
        // Try to get name and online status from join, otherwise fetch separately
        let otherPartyIsOnline = false;
        if (txn.buyer_id === userId) {
          otherPartyName = txn.seller_profile?.name || 'Seller';
          otherPartyIsOnline = txn.seller_profile?.is_online || false;
        } else {
          otherPartyName = txn.buyer_profile?.name || 'Buyer';
          otherPartyIsOnline = txn.buyer_profile?.is_online || false;
        }

        // If name not available from join, fetch profile separately
        if (otherPartyName === 'Seller' || otherPartyName === 'Buyer') {
          try {
            const profileResult = await getUserProfile(otherPartyId);
            if (profileResult.data?.name) {
              otherPartyName = profileResult.data.name;
            }
            if (profileResult.data?.is_online !== undefined) {
              otherPartyIsOnline = profileResult.data.is_online;
            }
          } catch (error) {
            // Keep default name if profile fetch fails
            console.error('Error fetching profile for chat:', error);
          }
        }

        // Get last message
        let lastMessageData = null;
        try {
          const { data } = await supabase
            .from('messages')
            .select('id, message, sender_id, created_at')
            .eq('transaction_id', txn.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          lastMessageData = data;
        } catch (error) {
          // If messages table doesn't exist or error, continue without last message
          console.error('Error fetching last message:', error);
        }

        // Get unread count (messages not read by current user)
        // Note: This assumes a read_at column exists. If not, unread count will be 0
        let unreadCount = 0;
        try {
          // Try to get unread count if read_at column exists
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('transaction_id', txn.id)
            .eq('sender_id', otherPartyId)
            .is('read_at', null);
          
          if (!countError) {
            unreadCount = count || 0;
          }
          // If read_at column doesn't exist, error will be caught and unreadCount stays 0
        } catch (error) {
          // If read_at column doesn't exist or other error, set unread to 0
          // This is expected if the column hasn't been added to the database yet
        }

        const lastMessage = lastMessageData;

        // Format last message time
        let lastMessageTime = 'No messages';
        if (lastMessage) {
          const messageDate = new Date(lastMessage.created_at);
          const now = new Date();
          const diffMs = now - messageDate;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) {
            lastMessageTime = 'Just now';
          } else if (diffMins < 60) {
            lastMessageTime = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
          } else if (diffHours < 24) {
            lastMessageTime = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
          } else if (diffDays < 7) {
            lastMessageTime = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
          } else {
            lastMessageTime = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        }

        // Use last message timestamp for sorting, or transaction created_at if no messages
        const lastActivityTimestamp = lastMessage?.created_at || txn.created_at;

        return {
          id: `CHAT${txn.id}`,
          transactionId: txn.id,
          transactionTitle: txn.title,
          otherParty: otherPartyName,
          otherPartyId: otherPartyId,
          otherPartyIsOnline: otherPartyIsOnline,
          lastMessage: lastMessage?.message || '',
          lastMessageTime: lastMessageTime,
          lastActivityTimestamp: lastActivityTimestamp, // For sorting
          unreadCount: unreadCount,
          status: txn.status || 'pending',
        };
      })
    );

    // Sort chats by latest activity (most recent first)
    chats.sort((a, b) => {
      const timestampA = new Date(a.lastActivityTimestamp).getTime();
      const timestampB = new Date(b.lastActivityTimestamp).getTime();
      return timestampB - timestampA; // Descending order (newest first)
    });

    return { data: chats, error: null };
  } catch (error) {
    console.error('Get chats for user error:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch chats',
    };
  }
};

/**
 * Get total unread messages count for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Total unread count
 */
export const getTotalUnreadCount = async (userId) => {
  try {
    // Get all transactions where user is buyer or seller
    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (txnError || !transactions || transactions.length === 0) {
      return { data: 0, error: null };
    }

    let totalUnread = 0;

    // For each transaction, get unread count
    for (const txn of transactions) {
      const otherPartyId = txn.buyer_id === userId ? txn.seller_id : txn.buyer_id;
      
      try {
        // Try to get unread count if read_at column exists
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('transaction_id', txn.id)
          .eq('sender_id', otherPartyId)
          .is('read_at', null);
        
        if (!countError && count) {
          totalUnread += count;
        }
      } catch (error) {
        // If read_at column doesn't exist, continue
        console.log('Error getting unread count for transaction:', txn.id, error);
      }
    }

    return { data: totalUnread, error: null };
  } catch (error) {
    console.error('Get total unread count error:', error);
    return {
      data: 0,
      error: error.message || 'Failed to get unread count',
    };
  }
};

/**
 * Get messages for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Messages list
 */
/**
 * Get messages for multiple transactions at once
 * @param {string[]} transactionIds - Array of transaction IDs
 * @returns {Promise<object>} - Messages grouped by transaction_id
 */
export const getMessagesForTransactions = async (transactionIds) => {
  try {
    if (!transactionIds || transactionIds.length === 0) {
      return { data: {}, error: null };
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, transaction_id, sender_id, message, created_at')
      .in('transaction_id', transactionIds)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Group messages by transaction_id
    const messagesByTransaction = {};
    if (data) {
      data.forEach(msg => {
        if (!messagesByTransaction[msg.transaction_id]) {
          messagesByTransaction[msg.transaction_id] = [];
        }
        messagesByTransaction[msg.transaction_id].push(msg);
      });
    }

    return { data: messagesByTransaction, error: null };
  } catch (error) {
    console.error('Get messages for transactions error:', error);
    return { data: null, error: error.message || 'Failed to fetch messages' };
  }
};

export const getMessages = async (transactionId, options = {}) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, transaction_id, sender_id, message, created_at')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })
      .limit(options.limit || 100);

    if (error) {
      throw error;
    }

    // Fetch sender profiles separately if needed
    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map(msg => msg.sender_id))];
      const profiles = await Promise.all(
        senderIds.map(async (senderId) => {
          try {
            const profileResult = await getUserProfile(senderId);
            return { id: senderId, name: profileResult.data?.name || null };
          } catch (error) {
            return { id: senderId, name: null };
          }
        })
      );

      // Map profiles to messages
      const profileMap = {};
      profiles.forEach(profile => {
        profileMap[profile.id] = profile.name;
      });

      // Add sender names to messages
      const messagesWithNames = data.map(msg => ({
        ...msg,
        sender_profile: { name: profileMap[msg.sender_id] || null },
      }));

      return {
        data: messagesWithNames,
        error: null,
      };
    }

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    console.error('Get messages error:', error);
    return {
      data: null,
      error: error.message || 'Failed to fetch messages',
    };
  }
};

/**
 * Send a message
 * @param {object} messageData - Message data { transaction_id, sender_id, message }
 * @returns {Promise<object>} - Created message
 */
export const sendMessage = async (messageData) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        transaction_id: messageData.transaction_id,
        sender_id: messageData.sender_id,
        message: messageData.message,
        created_at: new Date().toISOString(),
      })
      .select('id, transaction_id, sender_id, message, created_at')
      .single();

    if (error) {
      throw error;
    }

    return {
      data: data,
      error: null,
    };
  } catch (error) {
    console.error('Send message error:', error);
    return {
      data: null,
      error: error.message || 'Failed to send message',
    };
  }
};

/**
 * Mark messages as read for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - User ID (current user)
 * @returns {Promise<object>} - Update result
 * Note: This function requires a 'read_at' column in the messages table.
 * If the column doesn't exist, it will return success without error (graceful degradation).
 */
export const markMessagesAsRead = async (transactionId, userId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('transaction_id', transactionId)
      .neq('sender_id', userId)
      .is('read_at', null);

    // If error is about missing column, return success (graceful degradation)
    if (error) {
      // Check if error is about missing column
      if (error.message && error.message.includes('read_at')) {
        // Column doesn't exist, but that's okay - just return success
        return {
          data: { success: true, note: 'read_at column not available' },
          error: null,
        };
      }
      throw error;
    }

    return {
      data: { success: true },
      error: null,
    };
  } catch (error) {
    // If it's a column not found error, return success gracefully
    if (error.message && error.message.includes('read_at')) {
      return {
        data: { success: true, note: 'read_at column not available' },
        error: null,
      };
    }
    
    console.error('Mark messages as read error:', error);
    return {
      data: null,
      error: error.message || 'Failed to mark messages as read',
    };
  }
};

// ==================== PROFILES ====================

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<object>} - User profile
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      data: null,
      error: error.message || 'Failed to get user profile',
    };
  }
};

/**
 * Update user online status
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Online status
 * @returns {Promise<object>} - Result
 */
export const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    const { data, error } = await supabase.rpc('update_user_online_status', {
      p_user_id: userId,
      p_is_online: isOnline,
    });

    if (error) {
      console.warn('RPC update_user_online_status failed, trying direct update:', error);
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return {
        data: updateData,
        error: null,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Update user online status error:', error);
    return {
      data: null,
      error: error.message || 'Failed to update online status',
    };
  }
};

/**
 * Update user last seen timestamp
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Result
 */
export const updateUserLastSeen = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('update_user_last_seen', {
      p_user_id: userId,
    });

    if (error) {
      console.warn('RPC update_user_last_seen failed, trying direct update:', error);
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return {
        data: updateData,
        error: null,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Update user last seen error:', error);
    return {
      data: null,
      error: error.message || 'Failed to update last seen',
    };
  }
};

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<object>} - { available: boolean, error: string|null }
 */
export const checkUsernameAvailability = async (username) => {
  try {
    if (!username || username.trim() === '') {
      return {
        available: false,
        error: 'Username is required',
      };
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Validate username format: 3-30 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return {
        available: false,
        error: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only',
      };
    }

    // Use database function to check username availability (bypasses RLS)
    // This allows unauthenticated users (during signup) to check username availability
    const { data, error } = await supabase
      .rpc('check_username_available', { username_input: trimmedUsername });

    if (error) {
      console.error('Check username availability RPC error:', error);
      // Fallback to direct query if RPC function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .limit(1);

      if (fallbackError) {
        // If error is about column not existing, assume available (for backward compatibility)
        if (fallbackError.message && fallbackError.message.includes('username')) {
          return {
            available: true,
            error: null,
          };
        }
        throw fallbackError;
      }

      if (fallbackData && fallbackData.length > 0) {
        return {
          available: false,
          error: 'This username is already taken',
        };
      }

      return {
        available: true,
        error: null,
      };
    }

    // RPC returns an array, get first result
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
    
    if (!result) {
      // If no result, assume available (function might not exist yet)
      return {
        available: true,
        error: null,
      };
    }

    if (result.available === false || result.username_exists === true) {
      return {
        available: false,
        error: 'This username is already taken',
      };
    }

    return {
      available: true,
      error: null,
    };
  } catch (error) {
    console.error('Check username availability error:', error);
    return {
      available: false,
      error: error.message || 'Failed to check username availability',
    };
  }
};

/**
 * Check if email is available (not already registered)
 * @param {string} email - Email address to check
 * @returns {Promise<object>} - Availability result
 */
export const checkEmailAvailability = async (email) => {
  try {
    if (!email || email.trim() === '') {
      return {
        available: false,
        error: 'Email is required',
      };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return {
        available: false,
        error: 'Please enter a valid email address',
      };
    }

    // Use database function to check email availability (bypasses RLS)
    // This allows unauthenticated users (during signup) to check email availability
    const { data, error } = await supabase
      .rpc('check_email_available', { email_input: trimmedEmail });

    if (error) {
      console.error('Check email availability RPC error:', error);
      // Fallback to direct query if RPC function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmedEmail)
        .limit(1);

      if (fallbackError) {
        throw fallbackError;
      }

      if (fallbackData && fallbackData.length > 0) {
        return {
          available: false,
          error: 'This email is already registered',
        };
      }

      return {
        available: true,
        error: null,
      };
    }

    // RPC returns an array, get first result
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
    
    if (!result) {
      // If no result, assume available (function might not exist yet)
      return {
        available: true,
        error: null,
      };
    }

    if (result.available === false || result.email_exists === true) {
      return {
        available: false,
        error: 'This email is already registered',
      };
    }

    return {
      available: true,
      error: null,
    };
  } catch (error) {
    console.error('Check email availability error:', error);
    return {
      available: false,
      error: error.message || 'Failed to check email availability',
    };
  }
};

/**
 * Find user by email, username, or UUID
 * @param {string} identifier - Email, username, or UUID
 * @returns {Promise<object>} - User profile with id
 */
export const findUserByIdentifier = async (identifier) => {
  try {
    if (!identifier || identifier.trim() === '') {
      return {
        data: null,
        error: 'Please enter a User ID (UUID), Username, or Email',
      };
    }

    const trimmedIdentifier = identifier.trim();
    const isEmail = trimmedIdentifier.includes('@');

    // Check if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(trimmedIdentifier)) {
      // It's a UUID, try to get profile directly
      const profileResult = await getUserProfile(trimmedIdentifier);
      if (profileResult.data && profileResult.data.id) {
        return {
          data: { id: profileResult.data.id },
          error: null,
        };
      }
      
      // If profile doesn't exist, the UUID might still be valid in auth.users
      // Try to verify by checking if we can query transactions with this user
      // For now, we'll accept the UUID if it's in valid format
      // The database foreign key constraint will catch invalid UUIDs
      return {
        data: { id: trimmedIdentifier },
        error: null,
      };
    }

    // If it's an email, search in profiles table
    if (isEmail) {
      const emailLower = trimmedIdentifier.toLowerCase();
      
      // Try to find by email in profiles table (case-insensitive search)
      // First try exact match
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailLower)
        .limit(1);

      // If exact match fails, try case-insensitive search
      if (profileError || !profileData || profileData.length === 0) {
        const { data: ilikeData, error: ilikeError } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', emailLower)
          .limit(1);
        
        if (!ilikeError && ilikeData && ilikeData.length > 0) {
          profileData = ilikeData;
          profileError = null;
        }
      }

      if (!profileError && profileData && profileData.length > 0) {
        return {
          data: { id: profileData[0].id },
          error: null,
        };
      }

      // If not found, provide helpful error message
      return {
        data: null,
        error: `User with email "${emailLower}" not found in the system. Possible reasons:\n\n1. The user hasn't signed up yet\n2. The user's profile hasn't been created\n3. RLS policies may be blocking the search\n\nPlease use the user's UUID or username instead, or ask them to sign up first.`,
      };
    }

    // If it's not an email and not a UUID, try searching by username
    const usernameLower = trimmedIdentifier.toLowerCase();
    const { data: usernameData, error: usernameError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', usernameLower)
      .limit(1);

    if (!usernameError && usernameData && usernameData.length > 0) {
      return {
        data: { id: usernameData[0].id },
        error: null,
      };
    }

    // If not found by username either
    return {
      data: null,
      error: `User "${trimmedIdentifier}" not found. Please enter a valid UUID, username, or email address.`,
    };
  } catch (error) {
    console.error('Find user by identifier error:', error);
    return {
      data: null,
      error: error.message || 'User not found',
    };
  }
};

/**
 * Find user by username and return their email (for login)
 * @param {string} username - Username to search for
 * @returns {Promise<object>} - User email and id
 */
export const findUserByUsername = async (username) => {
  try {
    if (!username || username.trim() === '') {
      return {
        data: null,
        error: 'Username is required',
      };
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Search for user by username in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username')
      .eq('username', trimmedUsername)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Find user by username error:', error);
      return {
        data: null,
        error: error.message || 'Failed to find user by username',
      };
    }

    if (!data || !data.email) {
      return {
        data: null,
        error: 'User not found. Please check your username and try again.',
      };
    }

    return {
      data: {
        id: data.id,
        email: data.email,
        username: data.username,
      },
      error: null,
    };
  } catch (error) {
    console.error('Find user by username error:', error);
    return {
      data: null,
      error: error.message || 'Failed to find user by username',
    };
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} profileData - Profile updates
 * @returns {Promise<object>} - Updated profile
 */
export const updateUserProfile = async (userId, profileData) => {
  try {
    console.log(`Attempting to update profile for user ${userId}:`, JSON.stringify(profileData, null, 2));
    
    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile existence:', checkError);
    }
    
    if (!existingProfile) {
      console.log('Profile does not exist, cannot update');
      return {
        data: null,
        error: 'Profile not found',
      };
    }
    
    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: profileData.name,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        username: profileData.username,
        email: profileData.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Update profile error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    // Handle case where no rows were updated
    if (!data || data.length === 0) {
      console.log('No rows were updated (profile might not exist or RLS blocked update)');
      return {
        data: null,
        error: 'No rows updated',
      };
    }

    console.log('Successfully updated profile:', data[0]);
    return {
      data: data[0],
      error: null,
    };
  } catch (error) {
    console.error('Update user profile error:', error);
    return {
      data: null,
      error: error.message || 'Failed to update user profile',
    };
  }
};

/**
 * Create user profile (usually called after signup)
 * @param {object} profileData - Profile data { id, email, name, first_name, last_name, username }
 * @returns {Promise<object>} - Created profile
 */
export const createUserProfile = async (profileData) => {
  // Construct name from first_name and last_name if name is not provided
  let name = profileData.name;
  if (!name && (profileData.first_name || profileData.last_name)) {
    name = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ').trim();
  }
  
  // Ensure username is lowercase and trimmed
  const username = profileData.username ? profileData.username.toLowerCase().trim() : null;
  
  // Ensure email is lowercase and trimmed
  const email = profileData.email ? profileData.email.toLowerCase().trim() : null;
  
  // Ensure name is trimmed
  name = name ? name.trim() : null;

  // Prepare the data to insert
  const insertData = {
    id: profileData.id,
    email: email,
    name: name,
    first_name: profileData.first_name ? profileData.first_name.trim() : null,
    last_name: profileData.last_name ? profileData.last_name.trim() : null,
    username: username,
    created_at: new Date().toISOString(),
  };

  console.log('Creating profile with data:', {
    id: insertData.id,
    email: insertData.email,
    name: insertData.name,
    first_name: insertData.first_name,
    last_name: insertData.last_name,
    username: insertData.username,
  });

  return insertIntoTable('profiles', insertData);
};

// ==================== WALLETS ====================

/**
 * Get user wallet
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Wallet data
 */
export const getUserWallet = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        data: null,
        error: 'Wallet not found',
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Get user wallet error:', error);
    return {
      data: null,
      error: error.message || 'Failed to get user wallet',
    };
  }
};

/**
 * Update wallet balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add/subtract (positive for add, negative for subtract)
 * @returns {Promise<object>} - Updated wallet
 */
export const updateWalletBalance = async (userId, amount) => {
  try {
    // Try using RPC function first (bypasses RLS)
    try {
      console.log(`Attempting to update wallet balance via RPC for user ${userId}, amount: ${amount}`);
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'update_wallet_balance_for_user',
        {
          p_user_id: userId,
          p_amount: amount,
        }
      );
      
      if (rpcError) {
        console.warn('RPC update failed:', rpcError);
        // Check if it's a "function doesn't exist" error
        const isFunctionNotFound = rpcError.code === '42883' || 
                                   rpcError.code === 'PGRST116' ||
                                   rpcError.message?.includes('does not exist') || 
                                   rpcError.message?.includes('function') ||
                                   rpcError.message?.includes('Could not find');
        
        if (isFunctionNotFound) {
          console.error('RPC function update_wallet_balance_for_user does not exist. Please run the migration create_wallet_update_function.sql in Supabase SQL Editor.');
          return {
            data: null,
            error: 'Wallet update requires RPC function. Please run the migration create_wallet_update_function.sql in Supabase SQL Editor.',
          };
        }
        
        // If it's a business logic error (like insufficient balance), return it directly
        // P0001 is PostgreSQL RAISE EXCEPTION, meaning the function exists but returned an error
        if (rpcError.code === 'P0001' || rpcError.message?.includes('Insufficient balance')) {
          return {
            data: null,
            error: rpcError.message || 'Failed to update wallet balance',
          };
        }
        
        throw rpcError;
      }
      
      if (rpcResult) {
        console.log('Successfully updated wallet balance via RPC');
        return {
          data: rpcResult,
          error: null,
        };
      }
    } catch (rpcErr) {
      // If RPC function doesn't exist, we need to inform the user
      const isFunctionNotFound = rpcErr.code === '42883' || 
                                 rpcErr.code === 'PGRST116' ||
                                 rpcErr.message?.includes('does not exist') || 
                                 rpcErr.message?.includes('function') ||
                                 rpcErr.message?.includes('Could not find');
      
      if (isFunctionNotFound) {
        console.error('RPC function update_wallet_balance_for_user does not exist. Please run the migration create_wallet_update_function.sql in Supabase SQL Editor.');
        return {
          data: null,
          error: 'Wallet update requires RPC function. Please run the migration create_wallet_update_function.sql in Supabase SQL Editor.',
        };
      }
      
      // If it's a business logic error (like insufficient balance), return it directly
      if (rpcErr.code === 'P0001' || rpcErr.message?.includes('Insufficient balance')) {
        return {
          data: null,
          error: rpcErr.message || 'Failed to update wallet balance',
        };
      }
      
      console.log('RPC function failed with unknown error:', rpcErr);
      return {
        data: null,
        error: rpcErr.message || 'Failed to update wallet balance',
      };
    }
  } catch (error) {
    console.error('Update wallet balance error:', error);
    return {
      data: null,
      error: error.message || 'Failed to update wallet balance',
    };
  }
};

/**
 * Create wallet for user (usually called after signup)
 * @param {string} userId - User ID
 * @param {number} initialBalance - Initial balance (default: 0)
 * @returns {Promise<object>} - Created wallet
 */
export const createWallet = async (userId, initialBalance = 0) => {
  try {
    console.log(`Creating wallet for user ${userId} with balance ${initialBalance}`);
    
    // First check if wallet already exists
    const { data: existingWallet, error: checkError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingWallet) {
      console.log('Wallet already exists, returning existing wallet');
      return {
        data: existingWallet,
        error: null,
      };
    }
    
    // Try using RPC function first (bypasses RLS)
    try {
      console.log('Attempting to create wallet via RPC function...');
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'insert_wallet_for_user',
        {
          p_user_id: userId,
          p_initial_balance: initialBalance,
        }
      );
      
      if (rpcError) {
        console.warn('RPC insert failed:', rpcError);
        // Check if it's a "function doesn't exist" error
        const isFunctionNotFound = rpcError.code === '42883' || 
                                   rpcError.code === 'PGRST116' ||
                                   rpcError.message?.includes('does not exist') || 
                                   rpcError.message?.includes('function') ||
                                   rpcError.message?.includes('Could not find');
        
        if (isFunctionNotFound) {
          console.error('RPC function insert_wallet_for_user does not exist. Please run the migration create_wallet_insert_function.sql in Supabase SQL Editor.');
          return {
            data: null,
            error: 'Wallet creation requires RPC function. Please run the migration create_wallet_insert_function.sql in Supabase SQL Editor.',
          };
        }
        throw rpcError;
      }
      
      if (rpcResult) {
        console.log('Successfully created wallet via RPC');
        return {
          data: rpcResult,
          error: null,
        };
      }
    } catch (rpcErr) {
      // If RPC function doesn't exist, we need to inform the user
      const isFunctionNotFound = rpcErr.code === '42883' || 
                                 rpcErr.code === 'PGRST116' ||
                                 rpcErr.message?.includes('does not exist') || 
                                 rpcErr.message?.includes('function') ||
                                 rpcErr.message?.includes('Could not find');
      
      if (isFunctionNotFound) {
        console.error('RPC function insert_wallet_for_user does not exist. Please run the migration create_wallet_insert_function.sql in Supabase SQL Editor.');
        return {
          data: null,
          error: 'Wallet creation requires RPC function. Please run the migration create_wallet_insert_function.sql in Supabase SQL Editor.',
        };
      }
      console.log('RPC function failed with unknown error, trying regular insert:', rpcErr);
    }
    
    // Fallback to regular insert (will likely fail due to RLS, but try anyway)
    console.log('Falling back to regular insert (may fail due to RLS)...');
    const result = await insertIntoTable('wallets', {
      user_id: userId,
      balance: initialBalance,
      created_at: new Date().toISOString(),
    });
    
    if (result.error) {
      console.error('Wallet creation error:', result.error);
      // If insert fails, try to get existing wallet
      const { data: wallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (wallet) {
        console.log('Found existing wallet after insert failure');
        return {
          data: wallet,
          error: null,
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('Create wallet error:', error);
    return {
      data: null,
      error: error.message || 'Failed to create wallet',
    };
  }
};

// ==================== TRANSACTION HISTORY ====================

/**
 * Get transaction history (wallet transactions/payment history)
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Transaction history
 */
export const getTransactionHistory = async (userId, options = {}) => {
  try {
    if (!userId) {
      return { data: [], error: null };
    }

    // Try payment_history table first, fallback to transaction_history
    let query = supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId);

    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending !== false,
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // If payment_history doesn't exist, try transaction_history
      const fallbackQuery = supabase
        .from('transaction_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        throw fallbackError;
      }

      return {
        data: fallbackData || [],
        error: null,
      };
    }

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    console.error('Get transaction history error:', error);
    return {
      data: null,
      error: error.message || 'Failed to get transaction history',
    };
  }
};

/**
 * Add transaction history entry
 * @param {object} historyData - History entry data
 * @returns {Promise<object>} - Created history entry
 */
export const addTransactionHistory = async (historyData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    
    if (!currentUserId) {
      return {
        data: null,
        error: 'User not authenticated',
      };
    }
    
    const insertData = {
      ...historyData,
      created_at: new Date().toISOString(),
    };
    
    const { metadata: _, ...dataWithoutMetadata } = insertData;
    
    // Try using RPC function first (bypasses RLS)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'insert_transaction_history_for_transaction_participant',
        {
          p_user_id: dataWithoutMetadata.user_id,
          p_transaction_id: dataWithoutMetadata.transaction_id,
          p_type: dataWithoutMetadata.type,
          p_amount: dataWithoutMetadata.amount || 0,
          p_description: dataWithoutMetadata.description || '',
          p_current_user_id: currentUserId,
        }
      );
      
      if (rpcError) {
        console.warn('RPC insert failed, trying regular insert:', rpcError);
        throw rpcError;
      }
      
      if (rpcResult) {
        console.log('Successfully inserted transaction history via RPC');
        return {
          data: rpcResult,
          error: null,
        };
      }
    } catch (rpcErr) {
      console.log('RPC function failed or does not exist, trying regular insert');
    }
    
    // Fallback to regular insert
    return insertIntoTable('transaction_history', dataWithoutMetadata);
  } catch (error) {
    console.error('Error in addTransactionHistory:', error);
    return {
      data: null,
      error: error.message || 'Failed to add transaction history',
    };
  }
};

// ==================== NOTIFICATIONS ====================

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Notifications list
 */
export const getNotifications = async (userId, options = {}) => {
  return fetchFromTable('notifications', {
    filter: {
      user_id: userId,
      ...options.filter,
    },
    orderBy: options.orderBy || { column: 'created_at', ascending: false },
    limit: options.limit || 50,
    ...options,
  });
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>} - Updated notification
 */
export const markNotificationAsRead = async (notificationId) => {
  return updateTable('notifications', notificationId, {
    read: true,
    read_at: new Date().toISOString(),
  });
};

/**
 * Create notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} - Created notification
 */
export const createNotification = async (notificationData, performedByUserId = null) => {
  try {
    let currentUserId = performedByUserId;
    
    if (!currentUserId) {
      const authResult = await supabase.auth.getUser();
      currentUserId = authResult.data?.user?.id;
    }
    
    if (!currentUserId) {
      console.error('Cannot create notification: User not authenticated');
      return {
        data: null,
        error: 'User not authenticated',
      };
    }

    if (!notificationData.data?.transaction_id) {
      console.error('Cannot create notification: Missing transaction_id');
      return {
        data: null,
        error: 'Missing transaction_id in notification data',
      };
    }

    console.log('Attempting RPC insert for notification:', {
      user_id: notificationData.user_id,
      transaction_id: notificationData.data.transaction_id,
      current_user_id: currentUserId,
      performedByUserId: performedByUserId,
    });

    const result = await supabase.rpc('insert_notification_for_transaction_participant', {
      p_user_id: notificationData.user_id,
      p_title: notificationData.title,
      p_message: notificationData.message,
      p_type: notificationData.type,
      p_data: notificationData.data || {},
      p_transaction_id: notificationData.data.transaction_id,
      p_current_user_id: currentUserId,
    });

    if (result.error) {
      console.error('RPC insert failed:', result.error);
      console.error('RPC error details:', {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
      });
      
      return {
        data: null,
        error: result.error.message || 'Failed to create notification via RPC',
      };
    }

    if (result.data) {
      console.log('Successfully created notification via RPC');
      return {
        data: result.data,
        error: null,
      };
    }

    console.warn('RPC returned no data and no error');
    return {
      data: null,
      error: 'RPC function returned no data',
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      data: null,
      error: error.message || 'Failed to create notification',
    };
  }
};

