import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as DatabaseService from '../services/databaseService';

export const useOnlineStatus = (userId) => {
  const appState = useRef(AppState.currentState);
  const lastSeenInterval = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const updateOnlineStatus = async (isOnline) => {
      try {
        await DatabaseService.updateUserOnlineStatus(userId, isOnline);
      } catch (error) {
        console.error('Failed to update online status:', error);
      }
    };

    const updateLastSeen = async () => {
      try {
        await DatabaseService.updateUserLastSeen(userId);
      } catch (error) {
        console.error('Failed to update last seen:', error);
      }
    };

    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        updateOnlineStatus(true);
        startLastSeenUpdates();
      } else if (nextAppState.match(/inactive|background/)) {
        updateOnlineStatus(false);
        stopLastSeenUpdates();
      }
      appState.current = nextAppState;
    };

    const startLastSeenUpdates = () => {
      if (lastSeenInterval.current) {
        clearInterval(lastSeenInterval.current);
      }
      updateLastSeen();
      lastSeenInterval.current = setInterval(() => {
        updateLastSeen();
      }, 30000);
    };

    const stopLastSeenUpdates = () => {
      if (lastSeenInterval.current) {
        clearInterval(lastSeenInterval.current);
        lastSeenInterval.current = null;
      }
    };

    updateOnlineStatus(true);
    startLastSeenUpdates();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      stopLastSeenUpdates();
      updateOnlineStatus(false);
    };
  }, [userId]);
};

