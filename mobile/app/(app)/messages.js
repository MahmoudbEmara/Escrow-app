import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as DatabaseService from '../../src/services/databaseService';

export default function MessagesScreen() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!state.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await DatabaseService.getChatsForUser(state.user.id);
      if (result.data) {
        setChats(result.data);
      } else if (result.error) {
        console.error('Error fetching chats:', result.error);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [state.user?.id]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useFocusEffect(
    useCallback(() => {
      if (state.user?.id) {
        fetchChats();
      }
    }, [state.user?.id, fetchChats])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'In Progress':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'In Dispute':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('messages')}</Text>
        </View>

        {/* Chats List */}
        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>{t('noMessages') || 'No Messages'}</Text>
            <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
              {t('noMessagesDesc') || 'You don\'t have any messages yet. Start a conversation from a transaction.'}
            </Text>
          </View>
        ) : (
          <View style={styles.chatsList}>
            {chats.map((chat) => {
              const statusColors = getStatusColor(chat.status);
              return (
                <TouchableOpacity
                  key={chat.id}
                  style={[styles.chatItem, isRTL && styles.chatItemRTL]}
                  onPress={() => router.push(`/(app)/chat?transactionId=${chat.transactionId}&chatId=${chat.id}`)}
                >
                  <View style={styles.chatAvatar}>
                    <Text style={styles.chatAvatarText}>
                      {chat.otherParty.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                    </Text>
                  </View>
                  <View style={[styles.chatContent, isRTL && styles.chatContentRTL]}>
                    <View style={[styles.chatHeader, isRTL && styles.chatHeaderRTL]}>
                      <View style={styles.chatTitleContainer}>
                        <Text style={[styles.chatTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                          {chat.transactionTitle}
                        </Text>
                      </View>
                      <View style={[styles.headerRight, isRTL && styles.headerRightRTL]}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                            {chat.status}
                          </Text>
                        </View>
                        <Text style={[styles.chatTime, isRTL && styles.textRTL]}>{chat.lastMessageTime}</Text>
                      </View>
                    </View>
                    <View style={[styles.chatMessageRow, isRTL && styles.chatMessageRowRTL]}>
                      <Text style={[styles.chatOtherParty, isRTL && styles.textRTL]}>{chat.otherParty}</Text>
                      <Text style={[styles.chatLastMessage, isRTL && styles.textRTL]} numberOfLines={1}>
                        {chat.lastMessage}
                      </Text>
                      {chat.unreadCount > 0 && (
                        <View style={[styles.unreadBadge, isRTL && styles.unreadBadgeRTL]}>
                          <Text style={styles.unreadBadgeText}>{chat.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  textRTL: {
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  chatsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chatItemRTL: {
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatContentRTL: {
    alignItems: 'flex-end',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  chatTitleContainer: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerRightRTL: {
    flexDirection: 'row-reverse',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chatTime: {
    fontSize: 12,
    color: '#64748b',
    flexShrink: 0,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingRight: 40,
  },
  chatMessageRowRTL: {
    flexDirection: 'row-reverse',
    paddingRight: 0,
    paddingLeft: 40,
  },
  chatOtherParty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 8,
    flexShrink: 0,
  },
  chatLastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    minWidth: 0,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeRTL: {
    right: 'auto',
    left: 0,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
});
