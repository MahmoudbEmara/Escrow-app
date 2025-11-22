import { supabase } from '../lib/supabase';

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
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
      .single();

    if (error) {
      throw error;
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
  return fetchFromTable('transactions', {
    filter: {
      ...(userId && { user_id: userId }),
      ...options.filter,
    },
    orderBy: options.orderBy || { column: 'created_at', ascending: false },
    limit: options.limit || 50,
    ...options,
  });
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
 * Create a new transaction
 * @param {object} transactionData - Transaction data
 * @returns {Promise<object>} - Created transaction
 */
export const createTransaction = async (transactionData) => {
  return insertIntoTable('transactions', {
    ...transactionData,
    created_at: new Date().toISOString(),
    status: transactionData.status || 'pending',
  });
};

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @param {object} additionalUpdates - Additional fields to update
 * @returns {Promise<object>} - Updated transaction
 */
export const updateTransactionStatus = async (transactionId, status, additionalUpdates = {}) => {
  return updateTable('transactions', transactionId, {
    status,
    updated_at: new Date().toISOString(),
    ...additionalUpdates,
  });
};

// ==================== MESSAGES ====================

/**
 * Get messages for a transaction
 * @param {string} transactionId - Transaction ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Messages list
 */
export const getMessages = async (transactionId, options = {}) => {
  return fetchFromTable('messages', {
    filter: {
      transaction_id: transactionId,
      ...options.filter,
    },
    orderBy: options.orderBy || { column: 'created_at', ascending: true },
    limit: options.limit || 100,
    ...options,
  });
};

/**
 * Send a message
 * @param {object} messageData - Message data
 * @returns {Promise<object>} - Created message
 */
export const sendMessage = async (messageData) => {
  return insertIntoTable('messages', {
    ...messageData,
    created_at: new Date().toISOString(),
  });
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
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} profileData - Profile updates
 * @returns {Promise<object>} - Updated profile
 */
export const updateUserProfile = async (userId, profileData) => {
  return updateTable('profiles', userId, {
    ...profileData,
    updated_at: new Date().toISOString(),
  });
};

/**
 * Create user profile (usually called after signup)
 * @param {object} profileData - Profile data
 * @returns {Promise<object>} - Created profile
 */
export const createUserProfile = async (profileData) => {
  return insertIntoTable('profiles', {
    ...profileData,
    created_at: new Date().toISOString(),
  });
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
      .single();

    if (error) {
      throw error;
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
    // First get current balance
    const walletResult = await getUserWallet(userId);
    if (walletResult.error || !walletResult.data) {
      return walletResult;
    }

    const newBalance = (walletResult.data.balance || 0) + amount;

    if (newBalance < 0) {
      return {
        data: null,
        error: 'Insufficient balance',
      };
    }

    return updateTable('wallets', walletResult.data.id, {
      balance: newBalance,
      updated_at: new Date().toISOString(),
    });
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
  return insertIntoTable('wallets', {
    user_id: userId,
    balance: initialBalance,
    created_at: new Date().toISOString(),
  });
};

// ==================== TRANSACTION HISTORY ====================

/**
 * Get transaction history (wallet transactions)
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<object>} - Transaction history
 */
export const getTransactionHistory = async (userId, options = {}) => {
  return fetchFromTable('transaction_history', {
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
 * Add transaction history entry
 * @param {object} historyData - History entry data
 * @returns {Promise<object>} - Created history entry
 */
export const addTransactionHistory = async (historyData) => {
  return insertIntoTable('transaction_history', {
    ...historyData,
    created_at: new Date().toISOString(),
  });
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
export const createNotification = async (notificationData) => {
  return insertIntoTable('notifications', {
    ...notificationData,
    read: false,
    created_at: new Date().toISOString(),
  });
};

