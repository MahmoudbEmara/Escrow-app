import React, { useContext } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function AppLayout() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingVertical: 10,
          height: 70,
          paddingBottom: 20,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home') || 'Home',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('wallet') || 'Wallet',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: () => null,
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
        }}
      />
      <Tabs.Screen
        name="transaction-details"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

