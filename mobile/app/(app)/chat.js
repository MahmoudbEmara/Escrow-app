import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, TouchableWithoutFeedback, Alert, Linking, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MessageCircle, Send, MoreVertical, X, Paperclip, Image as ImageIcon, FileText, Camera } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../../src/context/AuthContext';
import { LanguageContext } from '../../src/context/LanguageContext';
import { getStateColors, getStateDisplayName, getTranslatedStatusName } from '../../src/constants/transactionStates';
import * as DatabaseService from '../../src/services/databaseService';
import { supabase } from '../../src/lib/supabase';
import * as ImageCacheService from '../../src/services/imageCacheService';
import * as StorageService from '../../src/services/storageService';
import * as ChatCacheService from '../../src/services/chatCacheService';

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
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState(null);
  const [cachedAvatarUri, setCachedAvatarUri] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Map());
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [pickerInProgress, setPickerInProgress] = useState(false);
  const [pendingPickerAction, setPendingPickerAction] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollViewRef = useRef(null);
  const firstUnreadMessageRef = useRef(null);
  const insets = useSafeAreaInsets();

  const formatMessages = useCallback((messagesData, otherPartyName, userId) => {
    return messagesData.map((msg) => {
      const isMe = msg.sender_id === userId;
      const senderName = isMe ? 'You' : (msg.sender_profile?.name || otherPartyName);
      const messageDate = new Date(msg.created_at);
      const timestamp = messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
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
        fileUrl: msg.file_url,
        fileType: msg.file_type,
        fileName: msg.file_name,
        timestamp: timestamp,
        dateKey: dateKey,
        dateLabel: dateLabel,
        isMe: isMe,
        readAt: msg.read_at,
        downloadedAt: msg.downloaded_at,
      };
    });
  }, []);

  const fetchChatData = useCallback(async (shouldMarkAsRead = true, useCache = true) => {
    if (!transactionId || !state.user?.id) {
      setLoading(false);
      return;
    }

    if (useCache) {
      const cachedMessages = await ChatCacheService.getMessagesFromCache(transactionId);
      if (cachedMessages && cachedMessages.length > 0) {
        const transactionResult = await DatabaseService.getTransaction(transactionId);
        if (transactionResult.data) {
          const txn = transactionResult.data;
          const otherPartyId = txn.buyer_id === state.user.id ? txn.seller_id : txn.buyer_id;

          const otherPartyProfileResult = await DatabaseService.getUserProfile(otherPartyId);
          const otherPartyProfile = otherPartyProfileResult.data;
          const otherPartyName = otherPartyProfile?.name || 
            (txn.buyer_id === state.user.id 
              ? (txn.seller_profile?.name || txn.seller_profile?.username || 'Seller')
              : (txn.buyer_profile?.name || txn.buyer_profile?.username || 'Buyer'));
          const otherPartyAvatarUrl = otherPartyProfile?.avatar_url || null;
          const otherPartyInitials = otherPartyProfile 
            ? `${otherPartyProfile.first_name?.[0] || ''}${otherPartyProfile.last_name?.[0] || ''}`.toUpperCase() || 'U'
            : 'U';
          const otherPartyIsOnline = otherPartyProfile?.is_online || false;

          const sellerId = txn.seller_id;
          const sellerProfileResult = await DatabaseService.getUserProfile(sellerId);
          const sellerName = sellerProfileResult.data?.name || txn.seller_profile?.name || 'Seller';

          setChatInfo({
            transactionId: transactionId,
            transactionTitle: txn.title,
            otherParty: otherPartyName,
            otherPartyId: otherPartyId,
            otherPartyAvatarUrl: otherPartyAvatarUrl,
            otherPartyInitials: otherPartyInitials,
            otherPartyIsOnline: otherPartyIsOnline,
            transactionStatus: txn.status,
            sellerName: sellerName,
          });

          const formattedMessages = formatMessages(cachedMessages, otherPartyName, state.user.id);
          setMessages(formattedMessages);
          setLoading(false);
          
          setTimeout(() => {
            if (scrollViewRef.current) {
              const firstUnread = formattedMessages.find(msg => !msg.isMe && !msg.readAt);
              if (firstUnread && firstUnreadMessageRef.current) {
                firstUnreadMessageRef.current.measureLayout(
                  scrollViewRef.current,
                  (x, y) => {
                    scrollViewRef.current?.scrollTo({
                      y: Math.max(0, y - 100),
                      animated: false
                    });
                  },
                  () => {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }
                );
              } else {
                scrollViewRef.current?.scrollToEnd({ animated: false });
              }
            }
          }, 50);
          
          if (shouldMarkAsRead) {
            DatabaseService.markMessagesAsRead(transactionId, state.user.id).then(async () => {
              const messagesResult = await DatabaseService.getMessages(transactionId, { userId: state.user.id });
              if (messagesResult.data) {
                await ChatCacheService.saveMessagesToCache(transactionId, messagesResult.data);
                const otherPartyName = chatInfo?.otherParty || 'User';
                const formattedMessages = formatMessages(messagesResult.data, otherPartyName, state.user.id);
                setMessages(formattedMessages);
              }
            }).catch(console.error);
          }
          
          return;
        }
      }
    }

    setLoading(true);

    try {

      const transactionResult = await DatabaseService.getTransaction(transactionId);
      if (!transactionResult.data) {
        setLoading(false);
        return;
      }

      const txn = transactionResult.data;
      const otherPartyId = txn.buyer_id === state.user.id ? txn.seller_id : txn.buyer_id;

          const otherPartyProfileResult = await DatabaseService.getUserProfile(otherPartyId);
          const otherPartyProfile = otherPartyProfileResult.data;
          const otherPartyName = otherPartyProfile?.name || 
            (txn.buyer_id === state.user.id 
              ? (txn.seller_profile?.name || txn.seller_profile?.username || 'Seller')
              : (txn.buyer_profile?.name || txn.buyer_profile?.username || 'Buyer'));
          const otherPartyAvatarUrl = otherPartyProfile?.avatar_url || null;
          const otherPartyInitials = otherPartyProfile 
            ? `${otherPartyProfile.first_name?.[0] || ''}${otherPartyProfile.last_name?.[0] || ''}`.toUpperCase() || 'U'
            : 'U';
          const otherPartyIsOnline = otherPartyProfile?.is_online || false;

          const sellerId = txn.seller_id;
          const sellerProfileResult = await DatabaseService.getUserProfile(sellerId);
          const sellerName = sellerProfileResult.data?.name || txn.seller_profile?.name || 'Seller';

          setChatInfo({
            transactionId: transactionId,
            transactionTitle: txn.title,
            otherParty: otherPartyName,
            otherPartyId: otherPartyId,
            otherPartyAvatarUrl: otherPartyAvatarUrl,
            otherPartyInitials: otherPartyInitials,
            otherPartyIsOnline: otherPartyIsOnline,
            transactionStatus: txn.status,
            sellerName: sellerName,
          });

      const messagesResult = await DatabaseService.getMessages(transactionId, { userId: state.user.id });
      if (messagesResult.data) {
        await ChatCacheService.saveMessagesToCache(transactionId, messagesResult.data);
        
        const formattedMessages = formatMessages(messagesResult.data, otherPartyName, state.user.id);
        setMessages(formattedMessages);

        if (shouldMarkAsRead) {
          await DatabaseService.markMessagesAsRead(transactionId, state.user.id);
          const updatedMessagesResult = await DatabaseService.getMessages(transactionId, { userId: state.user.id });
          if (updatedMessagesResult.data) {
            await ChatCacheService.saveMessagesToCache(transactionId, updatedMessagesResult.data);
            const updatedFormattedMessages = formatMessages(updatedMessagesResult.data, otherPartyName, state.user.id);
            setMessages(updatedFormattedMessages);
          }
        }
        
        setTimeout(() => {
          if (scrollViewRef.current) {
            const firstUnread = formattedMessages.find(msg => !msg.isMe && !msg.readAt);
            if (firstUnread && firstUnreadMessageRef.current) {
              firstUnreadMessageRef.current.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({
                    y: Math.max(0, y - 100),
                    animated: false
                  });
                },
                () => {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }
              );
            } else {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  }, [transactionId, state.user?.id, formatMessages]);

  useEffect(() => {
    fetchChatData(true, true);
  }, [fetchChatData]);

  useEffect(() => {
    if (chatInfo?.otherPartyAvatarUrl) {
      ImageCacheService.getCachedImageUri(chatInfo.otherPartyAvatarUrl).then(cachedUri => {
        setCachedAvatarUri(cachedUri);
      });
    }
  }, [chatInfo?.otherPartyAvatarUrl]);

  useFocusEffect(
    useCallback(() => {
      if (transactionId && state.user?.id) {
        fetchChatData(true, true);
      }
    }, [transactionId, state.user?.id, fetchChatData])
  );

  useEffect(() => {
    if (!transactionId || !state.user?.id) return;

    const channel = supabase
      .channel(`messages-${transactionId}-${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `transaction_id=eq.${transactionId}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          if (newMessage.sender_id !== state.user.id) {
            const messagesResult = await DatabaseService.getMessages(transactionId, { userId: state.user.id });
            if (messagesResult.data) {
              await ChatCacheService.saveMessagesToCache(transactionId, messagesResult.data);
              const otherPartyName = chatInfo?.otherParty || 'User';
              const formattedMessages = formatMessages(messagesResult.data, otherPartyName, state.user.id);
              setMessages(formattedMessages);
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
          filter: `transaction_id=eq.${transactionId}`,
        },
        async (payload) => {
          const updatedMessage = payload.new;
          setMessages(prev => prev.map(msg => {
            if (msg.id === updatedMessage.id) {
              return {
                ...msg,
                readAt: updatedMessage.read_at,
                downloadedAt: updatedMessage.downloaded_at
              };
            }
            return msg;
          }));
          
          const messagesResult = await DatabaseService.getMessages(transactionId, { userId: state.user.id });
          if (messagesResult.data) {
            await ChatCacheService.saveMessagesToCache(transactionId, messagesResult.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, state.user?.id, chatInfo?.otherParty, formatMessages]);

  const scrollToFirstUnread = useCallback(() => {
    if (!scrollViewRef.current || messages.length === 0 || !state.user?.id) return;
    
    const firstUnreadMessage = messages.find(msg => 
      !msg.isMe && !msg.readAt
    );
    
    if (firstUnreadMessage && firstUnreadMessageRef.current) {
      setTimeout(() => {
        firstUnreadMessageRef.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 100),
              animated: true
            });
          },
          () => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        );
      }, 500);
    } else {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [messages, state.user?.id]);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0 && !loading) {
      scrollToFirstUnread();
    }
  }, [messages, loading, scrollToFirstUnread]);

  // Subscribe to online status changes for the other party
  useEffect(() => {
    const otherPartyId = chatInfo?.otherPartyId;
    if (!otherPartyId) return;

    const channelName = `online-status-${otherPartyId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherPartyId}`,
        },
        (payload) => {
          if (payload.new?.is_online !== undefined) {
            setChatInfo(prev => {
              if (prev?.otherPartyId === otherPartyId && prev?.otherPartyIsOnline !== payload.new.is_online) {
                return {
                  ...prev,
                  otherPartyIsOnline: payload.new.is_online,
                };
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatInfo?.otherPartyId]);

  useEffect(() => {
    if (!showAttachmentMenu && pendingPickerAction) {
      const action = pendingPickerAction;
      setPendingPickerAction(null);
      setTimeout(() => {
        action();
      }, 800);
    }
  }, [showAttachmentMenu, pendingPickerAction]);

  const handlePickImage = async () => {
    console.log('handlePickImage called', { transactionId, userId: state.user?.id, pickerInProgress });
    
    if (!transactionId) {
      Alert.alert('Error', 'Transaction ID is missing');
      return;
    }
    
    if (!state.user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    if (pickerInProgress) {
      Alert.alert('Please wait', 'Another operation is in progress');
      return;
    }

    try {
      setPickerInProgress(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Image picker permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos to send images.');
        setPickerInProgress(false);
        return;
      }

      console.log('Launching image picker...');
      let result;
      try {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: false,
          quality: 0.8,
          allowsMultipleSelection: false,
        });
        console.log('Image picker promise resolved');
      } catch (pickerError) {
        console.error('Image picker launch error:', pickerError);
        throw pickerError;
      }

      if (!result) {
        console.error('Image picker returned null/undefined');
        Alert.alert('Error', 'Image picker did not return a result');
        return;
      }

      console.log('Image picker result received:', JSON.stringify({
        canceled: result?.canceled,
        hasAssets: !!result?.assets,
        assetCount: result?.assets?.length,
        firstAsset: result?.assets?.[0] ? {
          uri: result.assets[0].uri?.substring(0, 50) + '...',
          type: result.assets[0].type,
          name: result.assets[0].fileName || result.assets[0].name,
        } : null,
      }, null, 2));

      if (!result) {
        console.log('Image picker returned null/undefined');
        Alert.alert('Error', 'Image picker did not return a result');
      } else if (result.canceled) {
        console.log('User canceled image picker');
      } else if (result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];
        const fileType = asset.type === 'video' ? 'video' : 'image';
        console.log(`${fileType} selected, starting upload...`, { uri: asset.uri?.substring(0, 50), type: asset.type });
        await handleFileUpload(asset, fileType);
      } else {
        console.log('No media selected - result:', { canceled: result.canceled, assets: result.assets });
        Alert.alert('No Media Selected', 'Please select an image or video to send');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    } finally {
      setPickerInProgress(false);
    }
  };

  const handleTakePicture = async () => {
    console.log('handleTakePicture called', { transactionId, userId: state.user?.id, pickerInProgress });
    
    if (!transactionId) {
      Alert.alert('Error', 'Transaction ID is missing');
      return;
    }
    
    if (!state.user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    if (pickerInProgress) {
      Alert.alert('Please wait', 'Another operation is in progress');
      return;
    }

    try {
      setPickerInProgress(true);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your camera to take photos.');
        setPickerInProgress(false);
        return;
      }

      console.log('Launching camera...');
      let result;
      try {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
        console.log('Camera promise resolved');
      } catch (cameraError) {
        console.error('Camera launch error:', cameraError);
        throw cameraError;
      }

      if (!result) {
        console.error('Camera returned null/undefined');
        Alert.alert('Error', 'Camera did not return a result');
        return;
      }

      console.log('Camera result received:', JSON.stringify({
        canceled: result?.canceled,
        hasAssets: !!result?.assets,
        assetCount: result?.assets?.length,
        firstAsset: result?.assets?.[0] ? {
          uri: result.assets[0].uri?.substring(0, 50) + '...',
          type: result.assets[0].type,
          name: result.assets[0].fileName || result.assets[0].name,
        } : null,
      }, null, 2));

      if (!result) {
        console.log('Camera returned null/undefined');
        Alert.alert('Error', 'Camera did not return a result');
      } else if (result.canceled) {
        console.log('User canceled camera');
      } else if (result.assets && result.assets.length > 0 && result.assets[0]) {
        console.log('Photo taken, starting upload...', { uri: result.assets[0].uri?.substring(0, 50) });
        await handleFileUpload(result.assets[0], 'image');
      } else {
        console.log('No photo taken - result:', { canceled: result.canceled, assets: result.assets });
        Alert.alert('No Photo Taken', 'Please take a photo to send');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', `Failed to take picture: ${error.message || 'Unknown error'}`);
    } finally {
      setPickerInProgress(false);
    }
  };

  const handlePickDocument = async () => {
    console.log('handlePickDocument called', { transactionId, userId: state.user?.id, pickerInProgress });
    
    if (!transactionId) {
      Alert.alert('Error', 'Transaction ID is missing');
      return;
    }
    
    if (!state.user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    if (pickerInProgress) {
      Alert.alert('Please wait', 'Another operation is in progress');
      return;
    }

    try {
      setPickerInProgress(true);
      
      console.log('Launching document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', { canceled: result.canceled, hasAssets: !!result.assets, assetCount: result.assets?.length });

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Starting file upload for document...');
        await handleFileUpload(result.assets[0], 'document');
      } else if (result.canceled) {
        console.log('User canceled document picker');
      } else {
        console.log('No document selected or result invalid');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', `Failed to pick document: ${error.message || 'Unknown error'}`);
    } finally {
      setPickerInProgress(false);
    }
  };

  const handleFileUpload = async (fileAsset, fileType) => {
    if (!transactionId || !state.user?.id) return;

    const tempMessageId = `upload_${Date.now()}`;
    const fileUri = fileAsset.uri;
    const getFileExtension = () => {
      if (fileType === 'video') return 'mp4';
      if (fileType === 'image') return 'jpg';
      return 'pdf';
    };
    const fileName = fileAsset.name || `file_${Date.now()}.${getFileExtension()}`;
    const getMimeType = () => {
      if (fileAsset.mimeType) return fileAsset.mimeType;
      if (fileAsset.type === 'video') return 'video/mp4';
      if (fileType === 'image') return 'image/jpeg';
      return 'application/pdf';
    };
    const mimeType = getMimeType();
    
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const getMessageText = () => {
      if (fileType === 'image' || fileType === 'video') return ' ';
      return `📄 ${fileName}`;
    };
    const tempMessage = {
      id: tempMessageId,
      senderId: state.user.id,
      senderName: 'You',
      text: getMessageText(),
      fileUrl: fileUri,
      fileType: fileType,
      fileName: fileName,
      timestamp: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      dateKey: dateKey,
      dateLabel: 'Today',
      isMe: true,
      uploadStatus: 'uploading',
    };

    setMessages(prev => [...prev, tempMessage]);
    setUploadingFiles(prev => new Map(prev).set(tempMessageId, true));
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    (async () => {
      try {
        const filePath = `${transactionId}/${Date.now()}_${fileName}`;
        
        const uploadResult = await StorageService.uploadFile(
          'chat-attachments',
          filePath,
          {
            uri: fileUri,
            name: fileName,
          },
          {
            contentType: mimeType,
            upsert: false,
          }
        );

        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }

        const messageText = fileType === 'image' ? ' ' : `📄 ${fileName}`;
        
        const result = await DatabaseService.sendMessage({
          transaction_id: transactionId,
          sender_id: state.user.id,
          message: messageText,
          file_url: uploadResult.publicUrl,
          file_type: fileType,
          file_name: fileName,
        });

        if (result.error) {
          throw new Error(result.error);
        }

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
        
        const newMessage = {
          id: result.data.id,
          senderId: result.data.sender_id,
          senderName: 'You',
          text: result.data.message,
          fileUrl: result.data.file_url,
          fileType: result.data.file_type,
          fileName: result.data.file_name,
          timestamp: messageDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          dateKey: dateKey,
          dateLabel: dateLabel,
          isMe: true,
          uploadStatus: 'uploaded',
        };

        setMessages(prev => prev.map(msg => msg.id === tempMessageId ? newMessage : msg));
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempMessageId);
          return newMap;
        });
        
        const messageForCache = {
          ...result.data,
          sender_profile: { name: 'You' }
        };
        await ChatCacheService.updateMessageInCache(transactionId, messageForCache);
      } catch (error) {
        console.error('Error uploading file:', error);
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessageId 
            ? { ...msg, uploadStatus: 'failed' }
            : msg
        ));
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempMessageId);
          return newMap;
        });
        Alert.alert('Error', 'Failed to send file. Please try again.');
      }
    })();
  };

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
          fileUrl: result.data.file_url,
          fileType: result.data.file_type,
          fileName: result.data.file_name,
          timestamp: messageDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          dateKey: dateKey,
          dateLabel: dateLabel,
          isMe: true,
        };
        setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? realMessage : msg));
        
        const messageForCache = {
          ...result.data,
          sender_profile: { name: 'You' }
        };
        await ChatCacheService.updateMessageInCache(transactionId, messageForCache);
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
          <Text style={[styles.backIcon, isRTL && styles.backIconRTL]}>{isRTL ? '→' : '←'}</Text>
        </TouchableOpacity>
        {(() => {
          const getInitials = (name) => {
            if (!name) return 'U';
            const parts = name.trim().split(' ');
            if (parts.length >= 2) {
              return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
          };
          
          const statusColors = chatInfo.transactionStatus ? getStateColors(chatInfo.transactionStatus) : { bg: '#dbeafe', text: '#1e40af' };
          const statusDisplayName = chatInfo.transactionStatus ? getTranslatedStatusName(chatInfo.transactionStatus, t) : (t('statusPendingApproval') || 'Pending');
          const initials = getInitials(chatInfo.otherParty);
          
          return (
            <>
              <View style={[styles.profileContainer, isRTL && styles.profileContainerRTL]}>
                {chatInfo.otherPartyAvatarUrl ? (
                  <TouchableOpacity
                    onPress={() => {
                      setViewerImageUri(cachedAvatarUri || chatInfo.otherPartyAvatarUrl);
                      setImageViewerVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: cachedAvatarUri || chatInfo.otherPartyAvatarUrl }}
                      style={styles.profilePicture}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <LinearGradient
                    colors={['#2563eb', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profilePicture}
                  >
                    <Text style={styles.profileInitials}>{initials}</Text>
                  </LinearGradient>
                )}
                {chatInfo.otherPartyIsOnline !== undefined && (
                  <View style={[
                    styles.onlineIndicator,
                    { backgroundColor: chatInfo.otherPartyIsOnline ? '#00c950' : '#9ca3af' }
                  ]} />
                )}
              </View>
              <View style={[styles.headerInfo, isRTL && styles.headerInfoRTL]}>
                <View style={[styles.headerTitleRow, isRTL && styles.headerTitleRowRTL]}>
                  <Text style={[styles.headerTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                    {chatInfo.transactionTitle}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                      {statusDisplayName}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
                  {chatInfo.otherParty || 'User'}
                </Text>
              </View>
              <TouchableOpacity style={styles.menuButton}>
                <MoreVertical size={20} color="#6a7282" />
              </TouchableOpacity>
            </>
          );
        })()}
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
          contentContainerStyle={messages.length === 0 ? styles.messagesContentEmpty : styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconContainer}>
                <MessageCircle size={32} color="#9CA3AF" />
              </View>
              <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>
                {t('noMessages') || 'No messages yet'}
              </Text>
              <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
                {chatInfo ? `Start the conversation with ${chatInfo.otherParty} about ${chatInfo.transactionTitle}` : (t('startConversation') || 'Start the conversation by sending a message.')}
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
              
              const firstUnreadMessageId = messages.find(msg => !msg.isMe && !msg.readAt)?.id;
              
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
                const isFirstUnread = msg.id === firstUnreadMessageId;
                
                return (
                  <View
                    ref={isFirstUnread ? firstUnreadMessageRef : null}
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
                      {msg.fileUrl && (msg.fileType === 'image' || msg.fileType === 'video') ? (
                        <View style={styles.attachmentImageContainer}>
                          <TouchableOpacity
                            onPress={() => {
                              if (msg.uploadStatus !== 'uploading') {
                                if (msg.fileType === 'image') {
                                  setViewerImageUri(msg.fileUrl);
                                  setImageViewerVisible(true);
                                } else if (msg.fileType === 'video') {
                                  Linking.openURL(msg.fileUrl);
                                }
                              }
                            }}
                            activeOpacity={msg.uploadStatus === 'uploading' ? 1 : 0.8}
                            disabled={msg.uploadStatus === 'uploading'}
                          >
                            {msg.fileType === 'image' ? (
                              <Image
                                source={{ uri: msg.fileUrl }}
                                style={[
                                  styles.messageImage,
                                  msg.uploadStatus === 'uploading' && styles.attachmentImageUploading
                                ]}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.videoContainer}>
                                <View style={styles.videoThumbnail}>
                                  <Text style={styles.videoIcon}>▶</Text>
                                </View>
                                <Text style={[
                                  styles.videoLabel,
                                  msg.isMe ? styles.videoLabelMe : styles.videoLabelOther
                                ]}>
                                  Video
                                </Text>
                              </View>
                            )}
                            {msg.uploadStatus === 'uploading' && (
                              <View style={styles.uploadOverlay}>
                                <ActivityIndicator size="small" color="#ffffff" />
                                <Text style={styles.uploadText}>Uploading...</Text>
                              </View>
                            )}
                            {msg.uploadStatus === 'failed' && (
                              <View style={styles.uploadOverlay}>
                                <Text style={styles.uploadErrorText}>Failed</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : msg.fileUrl && msg.fileType === 'document' ? (
                        <View style={styles.documentContainerWrapper}>
                          <TouchableOpacity
                            style={styles.documentContainer}
                            onPress={() => {
                              if (msg.uploadStatus !== 'uploading' && msg.uploadStatus !== 'failed') {
                                Linking.openURL(msg.fileUrl);
                              }
                            }}
                            activeOpacity={msg.uploadStatus === 'uploading' ? 1 : 0.7}
                            disabled={msg.uploadStatus === 'uploading' || msg.uploadStatus === 'failed'}
                          >
                            <FileText size={24} color={msg.isMe ? '#ffffff' : '#155dfc'} />
                            <Text style={[
                              styles.documentName,
                              msg.isMe ? styles.documentNameMe : styles.documentNameOther
                            ]} numberOfLines={1}>
                              {msg.fileName || 'Document'}
                            </Text>
                            {msg.uploadStatus === 'uploading' && (
                              <View style={styles.documentUploadIndicator}>
                                <ActivityIndicator size="small" color={msg.isMe ? '#ffffff' : '#155dfc'} />
                              </View>
                            )}
                            {msg.uploadStatus === 'failed' && (
                              <Text style={[
                                styles.uploadErrorText,
                                msg.isMe ? styles.uploadErrorTextMe : styles.uploadErrorTextOther
                              ]}>
                                Failed
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      {msg.text && msg.text.trim() && (
                        <Text style={[
                          styles.messageText,
                          msg.isMe ? styles.messageTextMe : styles.messageTextOther,
                          isRTL && styles.textRTL
                        ]}>
                          {msg.text}
                        </Text>
                      )}
                      <View style={styles.messageFooter}>
                        {msg.isMe && msg.uploadStatus !== 'uploading' && (
                          <View style={styles.messageStatus}>
                            {msg.readAt ? (
                              <Ionicons name="checkmark-done" size={14} color="#00a63e" />
                            ) : msg.downloadedAt ? (
                              <Ionicons name="checkmark-done" size={14} color="#9ca3af" />
                            ) : !msg.id.startsWith('temp_') ? (
                              <Ionicons name="checkmark-outline" size={14} color="#9ca3af" />
                            ) : null}
                          </View>
                        )}
                        <Text style={[
                          styles.messageTime,
                          msg.isMe ? styles.messageTimeMe : styles.messageTimeOther
                        ]}>
                          {msg.timestamp}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              });
            })()
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL, { paddingBottom: Math.max(insets.bottom, 24) + 28 }]}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => setShowAttachmentMenu(true)}
          >
            <Paperclip size={20} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, inputFocused && styles.inputFocused, isRTL && styles.textRTL]}
            value={message}
            onChangeText={setMessage}
            placeholder={t('typeMessage') || 'Type a message...'}
            placeholderTextColor="rgba(10, 10, 10, 0.5)"
            multiline
            textAlign={isRTL ? 'right' : 'left'}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!sending}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Image Viewer Modal */}
      <Modal
          visible={imageViewerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageViewerVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setImageViewerVisible(false)}>
            <View style={styles.imageViewerContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.imageViewerContent}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setImageViewerVisible(false)}
                  >
                    <X size={24} color="#ffffff" />
                  </TouchableOpacity>
                  {viewerImageUri && (
                    <Image
                      source={{ uri: viewerImageUri }}
                      style={styles.fullSizeImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      {/* Attachment Menu Modal */}
      <Modal
        visible={showAttachmentMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
          <TouchableWithoutFeedback onPress={() => setShowAttachmentMenu(false)}>
            <View style={styles.attachmentModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.attachmentModalContent}>
                  <View style={styles.attachmentModalHandle} />
                  
                  <View style={styles.attachmentOptionsContainer}>
                    <TouchableOpacity
                      style={styles.attachmentOptionButton}
                      onPress={() => {
                        console.log('Photo button pressed');
                        setPendingPickerAction(() => () => {
                          handlePickImage().catch(error => {
                            console.error('Error in handlePickImage:', error);
                            setPickerInProgress(false);
                          });
                        });
                        setShowAttachmentMenu(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.attachmentOptionIconCircle, { backgroundColor: '#e9d5ff' }]}>
                        <ImageIcon size={28} color="#9333ea" />
                      </View>
                      <Text style={[styles.attachmentOptionLabel, isRTL && styles.textRTL]}>Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.attachmentOptionButton}
                      onPress={() => {
                        console.log('Camera button pressed');
                        setPendingPickerAction(() => () => {
                          handleTakePicture().catch(error => {
                            console.error('Error in handleTakePicture:', error);
                            setPickerInProgress(false);
                          });
                        });
                        setShowAttachmentMenu(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.attachmentOptionIconCircle, { backgroundColor: '#dbeafe' }]}>
                        <Camera size={28} color="#2563eb" />
                      </View>
                      <Text style={[styles.attachmentOptionLabel, isRTL && styles.textRTL]}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.attachmentOptionButton}
                      onPress={() => {
                        console.log('Document button pressed');
                        setPendingPickerAction(() => () => {
                          handlePickDocument().catch(error => {
                            console.error('Error in handlePickDocument:', error);
                            setPickerInProgress(false);
                          });
                        });
                        setShowAttachmentMenu(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.attachmentOptionIconCircle, { backgroundColor: '#d1fae5' }]}>
                        <FileText size={28} color="#10b981" />
                      </View>
                      <Text style={[styles.attachmentOptionLabel, isRTL && styles.textRTL]}>Document</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.attachmentModalCancelButton}
                    onPress={() => setShowAttachmentMenu(false)}
                  >
                    <Text style={[styles.attachmentModalCancelText, isRTL && styles.textRTL]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  profileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileContainerRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#ffffff',
    fontFamily: 'Arimo',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00c950',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerInfoRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerTitleRowRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0a0a',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
    fontFamily: 'Arimo',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6a7282',
    lineHeight: 20,
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
  messagesContentEmpty: {
    flexGrow: 1,
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
    backgroundColor: '#3b3e54',
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageTimeOther: {
    color: '#94a3b8',
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  attachmentImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImageUploading: {
    opacity: 0.6,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Arimo',
  },
  uploadErrorText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Arimo',
    fontWeight: '500',
  },
  uploadErrorTextMe: {
    color: '#ffffff',
  },
  uploadErrorTextOther: {
    color: '#dc2626',
  },
  documentContainerWrapper: {
    position: 'relative',
  },
  documentUploadIndicator: {
    marginLeft: 8,
  },
  videoContainer: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  videoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoIcon: {
    fontSize: 24,
    color: '#000000',
    marginLeft: 4,
  },
  videoLabel: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Arimo',
  },
  videoLabelMe: {
    color: '#ffffff',
  },
  videoLabelOther: {
    color: '#0f172a',
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  documentNameMe: {
    color: '#ffffff',
  },
  documentNameOther: {
    color: '#155dfc',
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  attachmentButtonsRTL: {
    flexDirection: 'row-reverse',
    marginRight: 0,
    marginLeft: 8,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtonDisabled: {
    opacity: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    minHeight: 73,
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#0a0a0a',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#2563eb',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#155dfc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#155dfc',
    opacity: 0.5,
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
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#101828',
    marginBottom: 0,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6a7282',
    textAlign: 'center',
    lineHeight: 20,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachmentButtonDisabled: {
    opacity: 0.5,
  },
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  attachmentModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  attachmentModalHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#d1d5dc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  attachmentOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  attachmentOptionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  attachmentOptionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentOptionLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#364153',
    lineHeight: 24,
    fontFamily: 'Arimo',
    textAlign: 'center',
  },
  attachmentModalCancelButton: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  attachmentModalCancelText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4a5565',
    lineHeight: 24,
    fontFamily: 'Arimo',
    textAlign: 'center',
  },
});

