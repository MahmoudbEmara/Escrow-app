import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { Home, Wallet, Settings, MessageCircle } from 'lucide-react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as DatabaseService from '../../src/services/databaseService';
import { supabase } from '../../src/lib/supabase';
import { useOnlineStatus } from '../../src/hooks/useOnlineStatus';

export default function AppLayout() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const [unreadCount, setUnreadCount] = useState(0);

  useOnlineStatus(state.user?.id);

  // Fetch total unread messages count
  const fetchUnreadCount = useCallback(async () => {
    if (!state.user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      const result = await DatabaseService.getTotalUnreadCount(state.user.id);
      if (result.data !== undefined) {
        setUnreadCount(result.data || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [state.user?.id]);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Set up realtime subscription for new messages to update unread count
  useEffect(() => {
    if (!state.user?.id) {
      return;
    }

    console.log('Setting up unread count subscription...');

    const channel = supabase
      .channel(`unread-count-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Check if the message is for the current user
          const message = payload.new;
          
          // Check if this message is in a transaction involving the current user
          // and if the sender is not the current user
          if (message.sender_id !== state.user.id) {
            try {
              // Verify the transaction involves the current user
              const { data: txn } = await supabase
                .from('transactions')
                .select('buyer_id, seller_id')
                .eq('id', message.transaction_id)
                .single();
              
              if (txn && (txn.buyer_id === state.user.id || txn.seller_id === state.user.id)) {
                console.log('New message received for current user, updating unread count');
                // Refresh unread count
                fetchUnreadCount();
              }
            } catch (error) {
              console.error('Error checking transaction for unread count:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // If a message was marked as read, refresh count
          if (payload.new.read_at && !payload.old.read_at) {
            console.log('Message marked as read, updating unread count');
            fetchUnreadCount();
          }
        }
      )
      .subscribe((status) => {
        console.log('Unread count subscription status:', status);
      });

    return () => {
      console.log('Cleaning up unread count subscription...');
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, fetchUnreadCount]);

  // Wait for auth to finish loading
  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!state.userToken) {
    return <Redirect href="/(auth)/login" />;
  }

  const tabOrder = isRTL 
    ? ['settings', 'wallet', 'messages', 'home'] 
    : ['home', 'messages', 'wallet', 'settings'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingVertical: 12,
          height: 80,
          paddingBottom: 0,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          direction: isRTL ? 'rtl' : 'ltr',
          justifyContent: 'space-around',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '400',
          textAlign: 'center',
          marginTop: 4,
          marginBottom: 0,
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          paddingHorizontal: 16,
          height: 'auto',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home') || 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('chats') || 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={24} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 'bold',
            minWidth: 20,
            height: 20,
          },
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('wallet') || 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Wallet size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, size }) => (
            <Settings size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-money"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="withdraw"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="new-transaction"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="transaction-details"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

