import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';

export default function ChatScreen() {
  const router = useRouter();
  const { transactionId, chatId } = useLocalSearchParams();
  const { state } = useContext(AuthContext);
  const { t, isRTL } = useContext(LanguageContext);
  const [message, setMessage] = useState('');
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Sample chat data - in real app, fetch from API
  const chatInfo = {
    transactionId: transactionId || 'TXN001',
    transactionTitle: 'Website Development',
    otherParty: 'Sarah Johnson',
    otherPartyId: 'USER456',
  };

  // Sample messages - in real app, fetch from API
  const [messages, setMessages] = useState([
    {
      id: 'MSG001',
      senderId: 'USER123',
      senderName: 'You',
      text: 'Hello, I wanted to discuss the project timeline.',
      timestamp: '10:30 AM',
      isMe: true,
    },
    {
      id: 'MSG002',
      senderId: 'USER456',
      senderName: chatInfo.otherParty,
      text: 'Hi! Sure, I can provide an update. The first milestone is almost complete.',
      timestamp: '10:32 AM',
      isMe: false,
    },
    {
      id: 'MSG003',
      senderId: 'USER123',
      senderName: 'You',
      text: 'That sounds great! When do you expect to finish?',
      timestamp: '10:33 AM',
      isMe: true,
    },
    {
      id: 'MSG004',
      senderId: 'USER456',
      senderName: chatInfo.otherParty,
      text: 'I should have it ready by tomorrow. I will send it for your review.',
      timestamp: '10:35 AM',
      isMe: false,
    },
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: `MSG${Date.now()}`,
      senderId: state.user?.id || 'USER123',
      senderName: 'You',
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages([...messages, newMessage]);
    setMessage('');
    
    // Scroll to bottom after sending
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
          {messages.map((msg) => (
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
          ))}
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
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Text style={styles.sendButtonText}>→</Text>
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
});

