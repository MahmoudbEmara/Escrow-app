import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const BALANCE_CACHE_KEY = '@wallet_balance';
const HISTORY_CACHE_KEY = '@wallet_history';
const CACHE_TIMESTAMP_PREFIX = '@cache_timestamp_';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export const saveBalanceToCache = async (balance) => {
    try {
        await safeAsyncStorage.setItem(BALANCE_CACHE_KEY, String(balance));
        await setCacheTimestamp(BALANCE_CACHE_KEY);
    } catch (error) {
    }
};

export const getBalanceFromCache = async () => {
    try {
        const cached = await safeAsyncStorage.getItem(BALANCE_CACHE_KEY);
        if (cached === null) return null;

        const isValid = await isCacheValid(BALANCE_CACHE_KEY);
        if (!isValid) {
            await safeAsyncStorage.removeItem(BALANCE_CACHE_KEY);
            await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${BALANCE_CACHE_KEY}`);
            return null;
        }

        return parseFloat(cached);
    } catch (error) {
        return null;
    }
};

export const saveHistoryToCache = async (history) => {
    try {
        await safeAsyncStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(history));
        await setCacheTimestamp(HISTORY_CACHE_KEY);
    } catch (error) {
    }
};

export const getHistoryFromCache = async () => {
    try {
        const cached = await safeAsyncStorage.getItem(HISTORY_CACHE_KEY);
        if (!cached) return null;

        const isValid = await isCacheValid(HISTORY_CACHE_KEY);
        if (!isValid) {
            await safeAsyncStorage.removeItem(HISTORY_CACHE_KEY);
            await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${HISTORY_CACHE_KEY}`);
            return null;
        }

        return JSON.parse(cached);
    } catch (error) {
        return null;
    }
};

export const clearWalletCache = async () => {
    try {
        await safeAsyncStorage.removeItem(BALANCE_CACHE_KEY);
        await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${BALANCE_CACHE_KEY}`);
        await safeAsyncStorage.removeItem(HISTORY_CACHE_KEY);
        await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${HISTORY_CACHE_KEY}`);
    } catch (error) {
    }
};
