import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import * as DatabaseService from '../../src/services/databaseService';

export default function ChatScreen() {
  const router = useRouter();
  const { transactionId, chatId } = useLocalSearchParams();
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  const fetchChatData = useCallback(async () => {
    if (!transactionId || !state.user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch transaction details
      const transactionResult = await DatabaseService.getTransaction(transactionId);
      if (!transactionResult.data) {
        setLoading(false);
        return;
      }

      const txn = transactionResult.data;
      const userRole = txn.buyer_id === state.user.id ? 'Buyer' : 'Seller';
      const otherPartyId = txn.buyer_id === state.user.id ? txn.seller_id : txn.buyer_id;

      // Fetch other party profile
      let otherPartyName = 'User';
      if (otherPartyId) {
        const otherPartyProfile = await DatabaseService.getUserProfile(otherPartyId);
        otherPartyName = otherPartyProfile.data?.name || (userRole === 'Buyer' ? 'Seller' : 'Buyer');
      }

      setChatInfo({
        transactionId: txn.id,
        transactionTitle: txn.title,
        otherParty: otherPartyName,
        otherPartyId: otherPartyId,
      });

      // Fetch messages
      const messagesResult = await DatabaseService.getMessages(transactionId);
      if (messagesResult.data) {
        const formattedMessages = messagesResult.data.map((msg) => {
          const isMe = msg.sender_id === state.user.id;
          const senderName = isMe ? 'You' : (msg.sender_profile?.name || otherPartyName);
          const messageDate = new Date(msg.created_at);
          const timestamp = messageDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          // Get date string for grouping (YYYY-MM-DD format)
          const dateKey = messageDate.toISOString().split('T')[0];
          const dateObj = new Date(dateKey);
          dateObj.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dateLabel = '';
          if (dateObj.getTime() === today.getTime()) {
            dateLabel = 'Today';
          } else if (dateObj.getTime() === yesterday.getTime()) {
            dateLabel = 'Yesterday';
          } else {
            dateLabel = messageDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
          }

          return {
            id: msg.id,
            senderId: msg.sender_id,
            senderName: senderName,
            text: msg.message,
            timestamp: timestamp,
            dateKey: dateKey,
            dateLabel: dateLabel,
            isMe: isMe,
          };
        });
        setMessages(formattedMessages);

        // Mark messages as read
        await DatabaseService.markMessagesAsRead(transactionId, state.user.id);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionId, state.user?.id]);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  useFocusEffect(
    useCallback(() => {
      if (transactionId && state.user?.id) {
        fetchChatData();
      }
    }, [transactionId, state.user?.id, fetchChatData])
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !transactionId || !state.user?.id || sending) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    // Optimistically add message to UI
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: state.user.id,
      senderName: 'You',
      text: messageText,
      timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      dateKey: dateKey,
      dateLabel: 'Today',
      isMe: true,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const result = await DatabaseService.sendMessage({
        transaction_id: transactionId,
        sender_id: state.user.id,
        message: messageText,
      });

      if (result.data) {
        // Replace temp message with real message
        const messageDate = new Date(result.data.created_at);
        const dateKey = messageDate.toISOString().split('T')[0];
        const dateObj = new Date(dateKey);
        dateObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateLabel = '';
        if (dateObj.getTime() === today.getTime()) {
          dateLabel = 'Today';
        } else if (dateObj.getTime() === yesterday.getTime()) {
          dateLabel = 'Yesterday';
        } else {
          dateLabel = messageDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          });
        }
        
        const realMessage = {
          id: result.data.id,
          senderId: result.data.sender_id,
          senderName: 'You',
          text: result.data.message,
          timestamp: messageDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          dateKey: dateKey,
          dateLabel: dateLabel,
          isMe: true,
        };
        setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? realMessage : msg));
      } else if (result.error) {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setMessage(messageText); // Restore message text
        console.error('Error sending message:', result.error);
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setMessage(messageText); // Restore message text
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  if (loading || !chatInfo) {
    return (
      <View style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t('loading') || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.push('/(app)/messages')} style={styles.backButton}>
          <Text style={[styles.backIcon, isRTL && styles.backIconRTL]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]} numberOfLines={1}>
            {chatInfo.transactionTitle}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
            {chatInfo.otherParty}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💬</Text>
              <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>
                {t('noMessages') || 'No messages yet'}
              </Text>
              <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
                {t('startConversation') || 'Start the conversation by sending a message.'}
              </Text>
            </View>
          ) : (
            (() => {
              // Group messages by date
              const groupedMessages = [];
              let currentDateKey = null;
              
              messages.forEach((msg, index) => {
                // Add date separator if this is a new day
                if (msg.dateKey !== currentDateKey) {
                  currentDateKey = msg.dateKey;
                  groupedMessages.push({
                    type: 'date',
                    dateKey: msg.dateKey,
                    dateLabel: msg.dateLabel,
                    id: `date_${msg.dateKey}`,
                  });
                }
                // Add the message
                groupedMessages.push(msg);
              });
              
              return groupedMessages.map((item, index) => {
                if (item.type === 'date') {
                  return (
                    <View key={item.id} style={styles.dateSeparator}>
                      <View style={styles.dateSeparatorLine} />
                      <Text style={styles.dateSeparatorText}>{item.dateLabel}</Text>
                      <View style={styles.dateSeparatorLine} />
                    </View>
                  );
                }
                
                const msg = item;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageWrapper,
                      msg.isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
                      isRTL && (msg.isMe ? styles.messageWrapperMeRTL : styles.messageWrapperOtherRTL)
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        msg.isMe ? styles.messageBubbleMe : styles.messageBubbleOther
                      ]}
                    >
                      {!msg.isMe && (
                        <Text style={styles.messageSender}>{msg.senderName}</Text>
                      )}
                      <Text style={[
                        styles.messageText,
                        msg.isMe ? styles.messageTextMe : styles.messageTextOther,
                        isRTL && styles.textRTL
                      ]}>
                        {msg.text}
                      </Text>
                      <Text style={[
                        styles.messageTime,
                        msg.isMe ? styles.messageTimeMe : styles.messageTimeOther
                      ]}>
                        {msg.timestamp}
                      </Text>
                    </View>
                  </View>
                );
              });
            })()
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL, { paddingBottom: Math.max(insets.bottom, 24) + 28 }]}>
          <TextInput
            style={[styles.input, isRTL && styles.textRTL]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('typeMessage') || 'Type a message...'}
            placeholderTextColor="#94a3b8"
            multiline
            textAlign={isRTL ? 'right' : 'left'}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.sendButtonText}>→</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#0f172a',
  },
  backIconRTL: {
    transform: [{ scaleX: -1 }],
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  placeholder: {
    width: 40,
  },
  textRTL: {
    textAlign: 'right',
  },
  messagesContainer: {
    flex: 1,
    flexGrow: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dateSeparatorText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageWrapperMe: {
    alignItems: 'flex-end',
  },
  messageWrapperMeRTL: {
    alignItems: 'flex-start',
  },
  messageWrapperOther: {
    alignItems: 'flex-start',
  },
  messageWrapperOtherRTL: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleMe: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#0f172a',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageTimeOther: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

