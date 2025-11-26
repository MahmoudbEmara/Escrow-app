import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const CHATS_CACHE_KEY = '@chats_cache';
const MESSAGES_CACHE_PREFIX = '@messages_cache_';
const CACHE_TIMESTAMP_PREFIX = '@cache_timestamp_';

const CACHE_EXPIRY_MS = 5 * 60 * 1000;

const isAppActive = () => {
  return AppState.currentState === 'active';
};

const safeAsyncStorage = {
  getItem: async (key) => {
    if (!isAppActive()) {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (error.message && error.message.includes('User interaction is not allowed')) {
        return null;
      }
      console.error('Error getting from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    if (!isAppActive()) {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (error.message && error.message.includes('User interaction is not allowed')) {
        return;
      }
      console.error('Error setting AsyncStorage:', error);
    }
  },
  removeItem: async (key) => {
    if (!isAppActive()) {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (error.message && error.message.includes('User interaction is not allowed')) {
        return;
      }
      console.error('Error removing from AsyncStorage:', error);
    }
  },
  getAllKeys: async () => {
    if (!isAppActive()) {
      return [];
    }
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      if (error.message && error.message.includes('User interaction is not allowed')) {
        return [];
      }
      console.error('Error getting all keys from AsyncStorage:', error);
      return [];
    }
  },
  multiRemove: async (keys) => {
    if (!isAppActive() || !keys || keys.length === 0) {
      return;
    }
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      if (error.message && error.message.includes('User interaction is not allowed')) {
        return;
      }
      console.error('Error multi-removing from AsyncStorage:', error);
    }
  }
};

const getCacheTimestamp = async (key) => {
  try {
    const timestamp = await safeAsyncStorage.getItem(`${CACHE_TIMESTAMP_PREFIX}${key}`);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    return null;
  }
};

const setCacheTimestamp = async (key) => {
  try {
    await safeAsyncStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${key}`, Date.now().toString());
  } catch (error) {
  }
};

const isCacheValid = async (key) => {
  const timestamp = await getCacheTimestamp(key);
  if (!timestamp) return false;
  return (Date.now() - timestamp) < CACHE_EXPIRY_MS;
};

export const saveChatsToCache = async (chats) => {
  try {
    await safeAsyncStorage.setItem(CHATS_CACHE_KEY, JSON.stringify(chats));
    await setCacheTimestamp(CHATS_CACHE_KEY);
  } catch (error) {
  }
};

export const getChatsFromCache = async () => {
  try {
    const cached = await safeAsyncStorage.getItem(CHATS_CACHE_KEY);
    if (!cached) return null;
    
    const isValid = await isCacheValid(CHATS_CACHE_KEY);
    if (!isValid) {
      await safeAsyncStorage.removeItem(CHATS_CACHE_KEY);
      await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${CHATS_CACHE_KEY}`);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
};

export const saveMessagesToCache = async (transactionId, messages) => {
  try {
    const key = `${MESSAGES_CACHE_PREFIX}${transactionId}`;
    await safeAsyncStorage.setItem(key, JSON.stringify(messages));
    await setCacheTimestamp(key);
  } catch (error) {
  }
};

export const getMessagesFromCache = async (transactionId) => {
  try {
    const key = `${MESSAGES_CACHE_PREFIX}${transactionId}`;
    const cached = await safeAsyncStorage.getItem(key);
    if (!cached) return null;
    
    const isValid = await isCacheValid(key);
    if (!isValid) {
      await safeAsyncStorage.removeItem(key);
      await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${key}`);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
};

export const clearChatCache = async () => {
  try {
    await safeAsyncStorage.removeItem(CHATS_CACHE_KEY);
    await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${CHATS_CACHE_KEY}`);
  } catch (error) {
  }
};

export const clearMessagesCache = async (transactionId) => {
  try {
    const key = `${MESSAGES_CACHE_PREFIX}${transactionId}`;
    await safeAsyncStorage.removeItem(key);
    await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${key}`);
  } catch (error) {
  }
};

export const clearAllChatCache = async () => {
  try {
    const keys = await safeAsyncStorage.getAllKeys();
    const chatKeys = keys.filter(key => 
      key.startsWith(MESSAGES_CACHE_PREFIX) || 
      key.startsWith(CACHE_TIMESTAMP_PREFIX) ||
      key === CHATS_CACHE_KEY
    );
    await safeAsyncStorage.multiRemove(chatKeys);
  } catch (error) {
  }
};

export const updateMessageInCache = async (transactionId, newMessage) => {
  try {
    const cached = await getMessagesFromCache(transactionId);
    if (cached) {
      const updated = [...cached, newMessage];
      await saveMessagesToCache(transactionId, updated);
    }
  } catch (error) {
  }
};

