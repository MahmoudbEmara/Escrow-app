import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const TRANSACTIONS_CACHE_KEY = '@home_transactions';
const STATS_CACHE_KEY = '@home_stats';
const CACHE_TIMESTAMP_PREFIX = '@cache_timestamp_';

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours (longer cache for home data)

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

export const saveTransactionsToCache = async (transactions) => {
    try {
        await safeAsyncStorage.setItem(TRANSACTIONS_CACHE_KEY, JSON.stringify(transactions));
        await setCacheTimestamp(TRANSACTIONS_CACHE_KEY);
    } catch (error) {
    }
};

export const getTransactionsFromCache = async () => {
    try {
        const cached = await safeAsyncStorage.getItem(TRANSACTIONS_CACHE_KEY);
        if (!cached) return null;

        const isValid = await isCacheValid(TRANSACTIONS_CACHE_KEY);
        if (!isValid) {
            // Don't delete immediately, maybe stale data is better than no data?
            // For now, let's respect expiry but maybe fetch in background
            // Actually, let's return it but maybe the caller should know it's stale
            // For simplicity, we'll behave like chat cache
            await safeAsyncStorage.removeItem(TRANSACTIONS_CACHE_KEY);
            await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${TRANSACTIONS_CACHE_KEY}`);
            return null;
        }

        return JSON.parse(cached);
    } catch (error) {
        return null;
    }
};

export const saveStatsToCache = async (stats) => {
    try {
        await safeAsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
        await setCacheTimestamp(STATS_CACHE_KEY);
    } catch (error) {
    }
};

export const getStatsFromCache = async () => {
    try {
        const cached = await safeAsyncStorage.getItem(STATS_CACHE_KEY);
        if (!cached) return null;

        const isValid = await isCacheValid(STATS_CACHE_KEY);
        if (!isValid) {
            await safeAsyncStorage.removeItem(STATS_CACHE_KEY);
            await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${STATS_CACHE_KEY}`);
            return null;
        }

        return JSON.parse(cached);
    } catch (error) {
        return null;
    }
};

export const clearHomeCache = async () => {
    try {
        await safeAsyncStorage.removeItem(TRANSACTIONS_CACHE_KEY);
        await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${TRANSACTIONS_CACHE_KEY}`);
        await safeAsyncStorage.removeItem(STATS_CACHE_KEY);
        await safeAsyncStorage.removeItem(`${CACHE_TIMESTAMP_PREFIX}${STATS_CACHE_KEY}`);
    } catch (error) {
    }
};
