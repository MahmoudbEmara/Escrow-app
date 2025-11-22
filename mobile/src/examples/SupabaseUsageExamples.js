/**
 * Supabase Usage Examples
 * 
 * This file contains practical examples of how to use Supabase services
 * in your React Native/Expo app components.
 */

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Button, Alert, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import * as AuthService from '../services/authService';
import * as DatabaseService from '../services/databaseService';
import * as StorageService from '../services/storageService';
import * as RealtimeService from '../services/realtimeService';

// ==================== AUTHENTICATION EXAMPLES ====================

/**
 * Example: Login Component with Email/Password
 */
export function LoginExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useContext(AuthContext);

  const handleLogin = async () => {
    const result = await signIn(email, password);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Logged in successfully!');
    }
  };

  return (
    <View>
      {/* Your login form UI */}
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

/**
 * Example: Sign Up Component
 */
export function SignUpExample() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signUp } = useContext(AuthContext);

  const handleSignUp = async () => {
    const result = await signUp(name, email, password);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else if (result.message) {
      Alert.alert('Success', result.message);
    } else {
      Alert.alert('Success', 'Account created!');
    }
  };

  return (
    <View>
      {/* Your signup form UI */}
      <Button title="Sign Up" onPress={handleSignUp} />
    </View>
  );
}

/**
 * Example: OTP Login
 */
export function OTPLoginExample() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const { signInWithOTP, verifyOTP } = useContext(AuthContext);

  const handleSendOTP = async () => {
    const result = await signInWithOTP(email);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setOtpSent(true);
      Alert.alert('Success', result.message);
    }
  };

  const handleVerifyOTP = async () => {
    const result = await verifyOTP(email, otp);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Logged in with OTP!');
    }
  };

  return (
    <View>
      {!otpSent ? (
        <Button title="Send OTP" onPress={handleSendOTP} />
      ) : (
        <>
          {/* OTP input field */}
          <Button title="Verify OTP" onPress={handleVerifyOTP} />
        </>
      )}
    </View>
  );
}

/**
 * Example: OAuth Login
 */
export function OAuthLoginExample() {
  const { signInWithOAuth } = useContext(AuthContext);

  const handleGoogleLogin = async () => {
    const result = await signInWithOAuth('google');
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      // Handle OAuth redirect
      // In React Native, you'll need to handle deep linking
      console.log('OAuth URL:', result.url);
    }
  };

  return (
    <View>
      <Button title="Sign in with Google" onPress={handleGoogleLogin} />
    </View>
  );
}

/**
 * Example: Password Reset
 */
export function PasswordResetExample() {
  const [email, setEmail] = useState('');
  const { resetPassword } = useContext(AuthContext);

  const handleResetPassword = async () => {
    const result = await resetPassword(email);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Password reset email sent!');
    }
  };

  return (
    <View>
      {/* Email input */}
      <Button title="Reset Password" onPress={handleResetPassword} />
    </View>
  );
}

// ==================== DATABASE EXAMPLES ====================

/**
 * Example: Fetch and Display Transactions
 */
export function TransactionsListExample({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    const result = await DatabaseService.getTransactions(userId, {
      limit: 20,
      orderBy: { column: 'created_at', ascending: false },
    });

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setTransactions(result.data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      {transactions.map((transaction) => (
        <View key={transaction.id}>
          <Text>{transaction.title}</Text>
          <Text>${transaction.amount}</Text>
          <Text>Status: {transaction.status}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Example: Create New Transaction
 */
export function CreateTransactionExample({ userId }) {
  const [loading, setLoading] = useState(false);

  const handleCreateTransaction = async () => {
    setLoading(true);
    const result = await DatabaseService.createTransaction({
      title: 'Website Development',
      buyer_id: userId,
      seller_id: 'seller-id-here',
      amount: 2500.00,
      category: 'Service',
      terms: 'Complete website in 2 weeks',
      delivery_date: new Date('2025-12-01').toISOString(),
      status: 'pending',
    });

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      Alert.alert('Success', 'Transaction created!');
    }
    setLoading(false);
  };

  return (
    <Button
      title={loading ? 'Creating...' : 'Create Transaction'}
      onPress={handleCreateTransaction}
      disabled={loading}
    />
  );
}

/**
 * Example: Real-time Transactions with Subscriptions
 */
export function RealTimeTransactionsExample({ userId }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Load initial transactions
    const loadTransactions = async () => {
      const result = await DatabaseService.getTransactions(userId);
      if (!result.error && result.data) {
        setTransactions(result.data);
      }
    };

    loadTransactions();

    // Subscribe to real-time updates
    const subscription = RealtimeService.subscribeToTransactions(
      (payload) => {
        console.log('Transaction update:', payload);

        if (payload.event === 'INSERT') {
          // Add new transaction
          setTransactions((prev) => [payload.new, ...prev]);
        } else if (payload.event === 'UPDATE') {
          // Update existing transaction
          setTransactions((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          );
        } else if (payload.event === 'DELETE') {
          // Remove deleted transaction
          setTransactions((prev) =>
            prev.filter((t) => t.id !== payload.old.id)
          );
        }
      },
      userId
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return (
    <View>
      {transactions.map((transaction) => (
        <View key={transaction.id}>
          <Text>{transaction.title}</Text>
          <Text>${transaction.amount}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Example: Messages with Real-time Updates
 */
export function MessagesExample({ transactionId, userId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Load initial messages
    const loadMessages = async () => {
      const result = await DatabaseService.getMessages(transactionId);
      if (!result.error && result.data) {
        setMessages(result.data);
      }
    };

    loadMessages();

    // Subscribe to real-time message updates
    const subscription = RealtimeService.subscribeToMessages(
      (payload) => {
        if (payload.event === 'INSERT') {
          setMessages((prev) => [...prev, payload.new]);
        }
      },
      transactionId
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [transactionId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const result = await DatabaseService.sendMessage({
      transaction_id: transactionId,
      sender_id: userId,
      message: newMessage,
    });

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setNewMessage('');
    }
  };

  return (
    <View>
      {messages.map((message) => (
        <View key={message.id}>
          <Text>{message.message}</Text>
          <Text>{new Date(message.created_at).toLocaleString()}</Text>
        </View>
      ))}
      {/* Message input */}
      <Button title="Send" onPress={handleSendMessage} />
    </View>
  );
}

// ==================== STORAGE EXAMPLES ====================

/**
 * Example: Upload and Display Avatar
 */
export function AvatarUploadExample({ userId }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePickAndUpload = async () => {
    setUploading(true);

    // Pick image
    const imageResult = await StorageService.pickImage({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (imageResult.cancelled) {
      setUploading(false);
      return;
    }

    // Upload image
    const uploadResult = await StorageService.uploadAvatar(userId, imageResult);

    if (uploadResult.error) {
      Alert.alert('Error', uploadResult.error);
    } else {
      setAvatarUrl(uploadResult.publicUrl);
      // Update user profile with avatar URL
      await DatabaseService.updateUserProfile(userId, {
        avatar_url: uploadResult.publicUrl,
      });
      Alert.alert('Success', 'Avatar updated!');
    }

    setUploading(false);
  };

  return (
    <View>
      {avatarUrl && (
        <Image source={{ uri: avatarUrl }} style={{ width: 100, height: 100 }} />
      )}
      <Button
        title={uploading ? 'Uploading...' : 'Upload Avatar'}
        onPress={handlePickAndUpload}
        disabled={uploading}
      />
    </View>
  );
}

/**
 * Example: Upload Transaction Document
 */
export function TransactionDocumentUploadExample({ transactionId }) {
  const [uploading, setUploading] = useState(false);

  const handleUploadDocument = async () => {
    setUploading(true);

    // Pick document
    const docResult = await StorageService.pickDocument({
      type: 'application/pdf',
    });

    if (docResult.cancelled) {
      setUploading(false);
      return;
    }

    // Upload document
    const uploadResult = await StorageService.uploadTransactionAttachment(
      transactionId,
      docResult,
      'document'
    );

    if (uploadResult.error) {
      Alert.alert('Error', uploadResult.error);
    } else {
      // Save document URL to message or transaction
      await DatabaseService.sendMessage({
        transaction_id: transactionId,
        sender_id: 'current-user-id',
        message: 'Document attached',
        attachment_url: uploadResult.publicUrl,
      });
      Alert.alert('Success', 'Document uploaded!');
    }

    setUploading(false);
  };

  return (
    <Button
      title={uploading ? 'Uploading...' : 'Upload Document'}
      onPress={handleUploadDocument}
      disabled={uploading}
    />
  );
}

/**
 * Example: Upload Multiple Images
 */
export function MultipleImagesUploadExample({ transactionId }) {
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);

  const handleUploadImages = async () => {
    setUploading(true);

    // Pick multiple images (you'll need to implement this in your picker)
    // For now, this is a simplified example
    const imageResult1 = await StorageService.pickImage();
    const imageResult2 = await StorageService.pickImage();

    const images = [imageResult1, imageResult2].filter(
      (img) => !img.cancelled
    );

    // Upload all images
    const uploadResults = await StorageService.uploadMultipleImages(
      'transaction-images',
      images,
      (index) => `${transactionId}/${Date.now()}_${index}.jpg`
    );

    const urls = uploadResults
      .filter((result) => !result.error && result.publicUrl)
      .map((result) => result.publicUrl);

    setImageUrls([...imageUrls, ...urls]);
    setUploading(false);
  };

  return (
    <View>
      {imageUrls.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={{ width: 100, height: 100 }} />
      ))}
      <Button
        title={uploading ? 'Uploading...' : 'Upload Images'}
        onPress={handleUploadImages}
        disabled={uploading}
      />
    </View>
  );
}

/**
 * Example: Wallet Balance Display
 */
export function WalletExample({ userId }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, [userId]);

  const loadWallet = async () => {
    setLoading(true);
    const result = await DatabaseService.getUserWallet(userId);
    if (!result.error && result.data) {
      setWallet(result.data);
    }
    setLoading(false);
  };

  // Subscribe to wallet updates
  useEffect(() => {
    if (!userId) return;

    const subscription = RealtimeService.subscribeToWallet(
      (payload) => {
        if (payload.new) {
          setWallet(payload.new);
        }
      },
      userId
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  if (loading) {
    return <Text>Loading wallet...</Text>;
  }

  return (
    <View>
      <Text>Balance: ${wallet?.balance || 0}</Text>
    </View>
  );
}

