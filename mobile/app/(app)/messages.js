import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Image } from 'react-native';
import { StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { getStateColors, getStateDisplayName, getTranslatedStatusName } from '../../src/constants/transactionStates';
import * as DatabaseService from '../../src/services/databaseService';
import { supabase } from '../../src/lib/supabase';
import * as ImageCacheService from '../../src/services/imageCacheService';

export default function MessagesScreen() {
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const router = useRouter();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [cachedImageUris, setCachedImageUris] = useState({});

  const fetchChats = useCallback(async () => {
    if (!state.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await DatabaseService.getChatsForUser(state.user.id);
      if (result.data) {
        const chatsData = result.data;
        
        setChats(chatsData);
        
        const avatarUrls = chatsData
          .map(chat => chat.otherPartyAvatarUrl)
          .filter(url => url);
        
        if (avatarUrls.length > 0) {
          const cachePromises = avatarUrls.map(async (url) => {
            const cachedUri = await ImageCacheService.getCachedImageUri(url);
            return { url, cachedUri };
          });
          
          const cachedResults = await Promise.all(cachePromises);
          const uriMap = {};
          cachedResults.forEach(({ url, cachedUri }) => {
            if (cachedUri) {
              uriMap[url] = cachedUri;
            }
          });
          
          setCachedImageUris(prev => ({ ...prev, ...uriMap }));
        }
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

  // Fetch messages for all chats when needed for search
  const fetchChatMessages = useCallback(async (chatList) => {
    if (!chatList || chatList.length === 0) {
      setChatMessages({});
      return;
    }

    setLoadingMessages(true);
    try {
      const transactionIds = chatList.map(chat => chat.transactionId).filter(Boolean);
      if (transactionIds.length > 0) {
        const result = await DatabaseService.getMessagesForTransactions(transactionIds);
        if (result.data) {
          setChatMessages(result.data);
        } else if (result.error) {
          console.error('Error fetching chat messages:', result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (state.user?.id) {
        fetchChats();
        // Also refresh unread count in navigation when messages page is focused
        // This will be handled by the navigation's realtime subscription
      }
    }, [state.user?.id, fetchChats])
  );

  // Fetch messages when chats are loaded (for search functionality)
  useEffect(() => {
    if (chats.length > 0) {
      fetchChatMessages(chats);
    }
  }, [chats, fetchChatMessages]);

  // Set up realtime subscriptions for new messages and transactions
  useEffect(() => {
    if (!state.user?.id) {
      return;
    }

    console.log('Setting up realtime subscriptions for messages and transactions...');
    
    // Subscribe to INSERT events on messages table
    const messagesChannel = supabase
      .channel(`messages-changes-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('New message detected:', payload.new);
          // Refresh chats list when a new message is sent
          fetchChats();
        }
      )
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
      });

    // Subscribe to INSERT events on transactions table (for new chats)
    const transactionsChannel = supabase
      .channel(`transactions-changes-messages-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          // Check if the new transaction involves the current user
          if (payload.new.buyer_id === state.user.id || payload.new.seller_id === state.user.id) {
            console.log('New transaction detected (relevant for chats):', payload.new);
            // Refresh chats list when a new transaction is created
            fetchChats();
          }
        }
      )
      .subscribe((status) => {
        console.log('Transactions subscription status:', status);
      });

    // Subscribe to profile updates for online status changes
    // Use a separate channel that listens to all profile updates
    const profilesChannel = supabase
      .channel(`profiles-online-status-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile update detected:', payload.new);
          if (payload.new?.is_online !== undefined) {
            setChats(prevChats => 
              prevChats.map(chat => 
                chat.otherPartyId === payload.new.id
                  ? { ...chat, otherPartyIsOnline: payload.new.is_online }
                  : chat
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Profiles subscription status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up realtime subscriptions...');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [state.user?.id, fetchChats]);


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

  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    // Search in chat metadata
    const matchesMetadata = (
      chat.otherParty?.toLowerCase().includes(query) ||
      chat.transactionTitle?.toLowerCase().includes(query) ||
      chat.lastMessage?.toLowerCase().includes(query)
    );

    // Search in all messages for this chat
    const messages = chatMessages[chat.transactionId] || [];
    const matchesMessages = messages.some(msg => 
      msg.message?.toLowerCase().includes(query)
    );

    return matchesMetadata || matchesMessages;
  });

  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('chats') || 'Chats'}</Text>
        
        {/* Search Bar */}
        <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
          <Search size={20} color="#9ca3af" style={[styles.searchIcon, isRTL && styles.searchIconRTL]} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder={t('searchConversations') || "Search conversations..."}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>

      {/* Chats List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>{t('noMessages') || 'No Messages'}</Text>
            <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
              {t('noMessagesDesc') || 'You don\'t have any messages yet. Start a conversation from a transaction.'}
            </Text>
          </View>
        ) : (
          <View style={styles.chatsList}>
            {filteredChats.map((chat) => {
              return (
                <TouchableOpacity
                  key={chat.id}
                  style={[styles.chatItem, isRTL && styles.chatItemRTL]}
                  onPress={() => router.push(`/(app)/chat?transactionId=${chat.transactionId}&chatId=${chat.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={[styles.avatarContainer, isRTL && styles.avatarContainerRTL]}>
                    <View style={styles.avatarWrapper}>
                      <LinearGradient
                        colors={['#2563eb', '#8b5cf6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.chatAvatarGradient}
                      >
                        <Text style={styles.chatAvatarText}>
                          {getUserInitials(chat.otherParty)}
                        </Text>
                      </LinearGradient>
                      {chat.otherPartyAvatarUrl && (
                        <Image
                          source={{ uri: cachedImageUris[chat.otherPartyAvatarUrl] || chat.otherPartyAvatarUrl }}
                          style={styles.chatAvatarImage}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Error loading avatar for chat:', chat.otherPartyId);
                          }}
                        />
                      )}
                    </View>
                    {chat.otherPartyIsOnline !== undefined && (
                      <View style={[
                        styles.onlineIndicator,
                        { backgroundColor: chat.otherPartyIsOnline ? '#00c950' : '#9ca3af' }
                      ]} />
                    )}
                  </View>

                  {/* Conversation Info */}
                  <View style={[styles.chatContent, isRTL && styles.chatContentRTL]}>
                    {/* Transaction Title with Status Tag and Timestamp Row */}
                    <View style={[styles.chatHeader, isRTL && styles.chatHeaderRTL]}>
                      <View style={[styles.titleWithStatus, isRTL && styles.titleWithStatusRTL]}>
                        <Text style={[styles.chatTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                          {chat.transactionTitle}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStateColors(chat.status).bg }]}>
                          <Text style={[styles.statusBadgeText, { color: getStateColors(chat.status).text }]}>
                            {getTranslatedStatusName(chat.status, t)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.chatTime, isRTL && styles.textRTL]}>{chat.lastMessageTime}</Text>
                    </View>
                    
                    {/* Sender Name */}
                    <Text style={[styles.chatName, isRTL && styles.textRTL]} numberOfLines={1}>
                      {chat.otherParty}
                    </Text>
                    
                    {/* Last Message and Unread Badge Row */}
                    <View style={[styles.chatMessageRow, isRTL && styles.chatMessageRowRTL]}>
                      <Text 
                        style={[
                          styles.chatLastMessage, 
                          isRTL && styles.chatLastMessageRTL,
                          isRTL && styles.textRTL,
                          chat.unreadCount > 0 && styles.chatLastMessageUnread
                        ]} 
                        numberOfLines={1}
                      >
                        {chat.lastMessage || 'No messages yet'}
                      </Text>
                      {chat.unreadCount > 0 && (
                        <View style={[styles.unreadBadge, isRTL && styles.unreadBadgeRTL]}>
                          <Text style={styles.unreadBadgeText} numberOfLines={1}>
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </Text>
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
    backgroundColor: '#f9fafb', // gray-50 from Figma
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom bar
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24, // p-6 from Figma
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 24, // p-6 from Figma
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // border-gray-200 from Figma
  },
  headerTitle: {
    fontSize: 28, // text-3xl from Figma
    fontWeight: 'bold',
    color: '#0f172a', // gray-900 from Figma
    marginBottom: 16, // mb-4 from Figma
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  headerRTL: {
    flexDirection: 'column',
  },
  headerRTL: {
    flexDirection: 'column',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  searchContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchIconRTL: {
    left: 'auto',
    right: 12,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  searchInputRTL: {
    paddingLeft: 16,
    paddingRight: 40,
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
    // No padding, items handle their own spacing
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // p-4 from Figma
    paddingHorizontal: 16, // p-4 from Figma
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6', // border-gray-100 from Figma
  },
  chatItemRTL: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    position: 'relative',
    flexShrink: 0,
    marginRight: 12, // gap-3 from Figma
  },
  avatarContainerRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  chatAvatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chatAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12, // w-3 from Figma
    height: 12, // h-3 from Figma
    backgroundColor: '#00c950', // Green dot for online
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 6,
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af', // Grey dot for offline
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
  },
  chatContentRTL: {
    // No special alignment needed for RTL
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4, // mb-1 from Figma (0.25rem = 4px)
  },
  chatHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  titleWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  titleWithStatusRTL: {
    flexDirection: 'row-reverse',
    marginRight: 0,
    marginLeft: 8,
  },
  chatTitle: {
    fontSize: 16, // text-base from Figma
    fontWeight: '600', // font-semibold from Figma
    color: '#0f172a', // text-gray-900 from Figma
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
  },
  chatName: {
    fontSize: 14, // text-sm from Figma
    fontWeight: '400', // normal weight
    color: '#0f172a', // text-gray-900 from Figma
    marginBottom: 4, // mb-1 from Figma
  },
  chatTime: {
    fontSize: 14, // text-sm from Figma
    color: '#6b7280', // text-gray-500 from Figma
    flexShrink: 0,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatMessageRowRTL: {
    flexDirection: 'row-reverse',
  },
  chatLastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    minWidth: 0,
    marginRight: 8,
  },
  chatLastMessageRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  chatLastMessageUnread: {
    color: '#0f172a', // text-gray-900 from Figma (when unread)
    fontWeight: '500', // font-medium from Figma
  },
  unreadBadge: {
    backgroundColor: '#2563eb', // bg-blue-600 from Figma
    borderRadius: 9999, // rounded-full from Figma
    minWidth: 20, // w-5 from Figma (1.25rem = 20px) - minWidth to allow expansion for larger numbers
    height: 20, // h-5 from Figma (1.25rem = 20px)
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 8, // ml-2 from Figma (0.5rem = 8px)
    paddingHorizontal: 6, // Allow padding for larger numbers
  },
  unreadBadgeRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  unreadBadgeText: {
    fontSize: 12, // text-xs from Figma
    fontWeight: '600', // font-medium from Figma
    color: '#ffffff',
    textAlign: 'center',
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
