import { supabase } from '../lib/supabase';

/**
 * Real-time Service
 * Handles real-time subscriptions to Supabase database changes
 */

/**
 * Subscribe to a table for real-time updates
 * @param {string} table - Table name
 * @param {string} event - Event type: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {function} callback - Callback function to handle changes
 * @param {object} filter - Optional filter object (e.g., { column: 'user_id', value: '123' })
 * @returns {object} - Subscription object with unsubscribe method
 */
export const subscribeToTable = (table, event = '*', callback, filter = null) => {
  let channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: event.toLowerCase(),
        schema: 'public',
        table: table,
        ...(filter && {
          filter: `${filter.column}=eq.${filter.value}`,
        }),
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
    channel: channel,
  };
};

/**
 * Subscribe to transactions table
 * @param {function} callback - Callback function for transaction updates
 * @param {string} userId - Optional user ID to filter transactions
 * @returns {object} - Subscription object
 */
export const subscribeToTransactions = (callback, userId = null) => {
  return subscribeToTable(
    'transactions',
    '*',
    (payload) => {
      callback({
        event: payload.eventType,
        new: payload.new,
        old: payload.old,
        table: 'transactions',
      });
    },
    userId ? { column: 'user_id', value: userId } : null
  );
};

/**
 * Subscribe to messages table
 * @param {function} callback - Callback function for message updates
 * @param {string} transactionId - Optional transaction ID to filter messages
 * @returns {object} - Subscription object
 */
export const subscribeToMessages = (callback, transactionId = null) => {
  return subscribeToTable(
    'messages',
    '*',
    (payload) => {
      callback({
        event: payload.eventType,
        new: payload.new,
        old: payload.old,
        table: 'messages',
      });
    },
    transactionId ? { column: 'transaction_id', value: transactionId } : null
  );
};

/**
 * Subscribe to user profile changes
 * @param {function} callback - Callback function for profile updates
 * @param {string} userId - User ID to subscribe to
 * @returns {object} - Subscription object
 */
export const subscribeToUserProfile = (callback, userId) => {
  return subscribeToTable(
    'profiles',
    '*',
    (payload) => {
      callback({
        event: payload.eventType,
        new: payload.new,
        old: payload.old,
        table: 'profiles',
      });
    },
    { column: 'id', value: userId }
  );
};

/**
 * Subscribe to wallet balance changes
 * @param {function} callback - Callback function for wallet updates
 * @param {string} userId - User ID to subscribe to
 * @returns {object} - Subscription object
 */
export const subscribeToWallet = (callback, userId) => {
  return subscribeToTable(
    'wallets',
    'UPDATE',
    (payload) => {
      callback({
        event: payload.eventType,
        new: payload.new,
        old: payload.old,
        table: 'wallets',
      });
    },
    { column: 'user_id', value: userId }
  );
};

/**
 * Subscribe to presence changes (who's online)
 * @param {string} channelName - Channel name for presence
 * @param {object} userData - User data to track presence
 * @param {function} callback - Callback function for presence updates
 * @returns {object} - Subscription object
 */
export const subscribeToPresence = (channelName, userData, callback) => {
  const channel = supabase.channel(channelName);

  channel
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      callback(presenceState);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      callback({ type: 'join', key, newPresences });
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      callback({ type: 'leave', key, leftPresences });
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userData);
      }
    });

  return {
    unsubscribe: () => {
      channel.untrack().then(() => {
        supabase.removeChannel(channel);
      });
    },
    channel: channel,
  };
};

/**
 * Subscribe to broadcast messages (chat-like functionality)
 * @param {string} channelName - Channel name
 * @param {function} callback - Callback function for broadcast messages
 * @returns {object} - Subscription object
 */
export const subscribeToBroadcast = (channelName, callback) => {
  const channel = supabase.channel(channelName);

  channel
    .on('broadcast', { event: 'message' }, (payload) => {
      callback(payload.payload);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
    sendMessage: (message) => {
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: message,
      });
    },
    channel: channel,
  };
};

/**
 * Subscribe to multiple tables at once
 * @param {Array<object>} subscriptions - Array of subscription configs
 * @returns {object} - Object with unsubscribe method
 */
export const subscribeToMultiple = (subscriptions) => {
  const unsubscribes = subscriptions.map((sub) => {
    return subscribeToTable(sub.table, sub.event, sub.callback, sub.filter);
  });

  return {
    unsubscribe: () => {
      unsubscribes.forEach((sub) => sub.unsubscribe());
    },
  };
};

/**
 * Custom subscription with advanced filters
 * @param {object} config - Subscription configuration
 * @returns {object} - Subscription object
 */
export const customSubscription = (config) => {
  const {
    table,
    event = '*',
    callback,
    schema = 'public',
    filter = null,
    channelName = `${table}_custom`,
  } = config;

  let channel = supabase.channel(channelName);

  const subscriptionConfig = {
    event: event.toLowerCase(),
    schema: schema,
    table: table,
  };

  if (filter) {
    subscriptionConfig.filter = filter;
  }

  channel.on('postgres_changes', subscriptionConfig, (payload) => {
    callback(payload);
  });

  channel.subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
    channel: channel,
  };
};

