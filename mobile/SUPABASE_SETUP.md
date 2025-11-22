# Supabase Integration Setup Guide

This guide will help you set up and use Supabase with your Escrow mobile app.

## 📋 Table of Contents

1. [Supabase Project Setup](#supabase-project-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Schema](#database-schema)
4. [Storage Buckets](#storage-buckets)
5. [Authentication Setup](#authentication-setup)
6. [Usage Examples](#usage-examples)
7. [Real-time Subscriptions](#real-time-subscriptions)
8. [File Storage](#file-storage)

---

## 🚀 Supabase Project Setup

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: escrow-app (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

### 2. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 3. Configure Environment Variables

Update `mobile/src/lib/supabase.js` with your actual credentials:

```javascript
const SUPABASE_URL = "YOUR_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";
```

**OR** create a `.env` file in the `mobile` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Then install `expo-constants` and `dotenv` if needed.

---

## 🗄️ Database Schema

Run these SQL queries in your Supabase SQL Editor (Settings → SQL Editor) to create the required tables:

### Profiles Table

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Transactions Table

```sql
-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  buyer_id UUID REFERENCES auth.users(id),
  seller_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'disputed')),
  category TEXT,
  terms TEXT,
  fees_responsibility TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
```

### Messages Table

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages in their transactions"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = messages.transaction_id
      AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their transactions"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = messages.transaction_id
      AND (transactions.buyer_id = auth.uid() OR transactions.seller_id = auth.uid())
    )
  );
```

### Wallets Table

```sql
-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Transaction History Table

```sql
-- Create transaction_history table
CREATE TABLE IF NOT EXISTS public.transaction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  transaction_id UUID REFERENCES public.transactions(id),
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'refund')),
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their transaction history"
  ON public.transaction_history FOR SELECT
  USING (auth.uid() = user_id);
```

### Notifications Table

```sql
-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

### Create Function to Auto-create Profile and Wallet

```sql
-- Function to create profile and wallet on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📦 Storage Buckets

Create storage buckets in Supabase Dashboard → Storage:

### 1. Avatars Bucket

- **Name**: `avatars`
- **Public**: Yes
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### 2. Transaction Images Bucket

- **Name**: `transaction-images`
- **Public**: Yes (or No for private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### 3. Transaction Videos Bucket

- **Name**: `transaction-videos`
- **Public**: Yes (or No for private)
- **File size limit**: 100 MB
- **Allowed MIME types**: `video/mp4, video/mov, video/avi`

### 4. Transaction Documents Bucket

- **Name**: `transaction-documents`
- **Public**: No (private)
- **File size limit**: 50 MB
- **Allowed MIME types**: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Storage Policies

For private buckets, create policies:

```sql
-- Policy for transaction-documents
CREATE POLICY "Users can upload documents to their transactions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transaction-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view documents from their transactions"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transaction-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 🔐 Authentication Setup

### Email Authentication

Email authentication is enabled by default. Configure email templates in:
- **Authentication** → **Email Templates**

### OAuth Providers

To enable OAuth (Google, Apple, Facebook, etc.):

1. Go to **Authentication** → **Providers**
2. Enable your desired provider
3. Add OAuth credentials from the provider's developer console

**Example - Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

### Phone Authentication

To enable phone/SMS authentication:

1. Enable "Phone" provider in Authentication → Providers
2. Configure Twilio or similar SMS service
3. Add credentials in Supabase dashboard

---

## 💡 Usage Examples

### Authentication

```javascript
import { AuthService } from '../services';

// Sign Up
const signUpResult = await AuthService.signUp(
  'user@example.com',
  'password123',
  { name: 'John Doe' }
);

// Sign In
const signInResult = await AuthService.signIn(
  'user@example.com',
  'password123'
);

// Sign Out
await AuthService.signOut();

// OTP Login
await AuthService.sendOTP('user@example.com');
const verifyResult = await AuthService.verifyOTP('user@example.com', '123456');

// OAuth Login
await AuthService.signInWithOAuth('google');

// Reset Password
await AuthService.resetPassword('user@example.com');
await AuthService.updatePassword('newPassword123');
```

### Database Operations

```javascript
import { DatabaseService } from '../services';

// Get Transactions
const transactions = await DatabaseService.getTransactions(userId);

// Create Transaction
const newTransaction = await DatabaseService.createTransaction({
  title: 'Website Development',
  buyer_id: userId,
  seller_id: sellerId,
  amount: 2500.00,
  category: 'Service',
  terms: 'Complete website in 2 weeks',
  delivery_date: '2025-12-01',
});

// Update Transaction
await DatabaseService.updateTransactionStatus(
  transactionId,
  'in_progress'
);

// Get Messages
const messages = await DatabaseService.getMessages(transactionId);

// Send Message
await DatabaseService.sendMessage({
  transaction_id: transactionId,
  sender_id: userId,
  message: 'Hello!',
});

// Get User Profile
const profile = await DatabaseService.getUserProfile(userId);

// Update Profile
await DatabaseService.updateUserProfile(userId, {
  name: 'John Doe',
  phone: '+1234567890',
});
```

### Real-time Subscriptions

```javascript
import { RealtimeService } from '../services';
import { useEffect } from 'react';

function TransactionsList({ userId }) {
  useEffect(() => {
    // Subscribe to transactions
    const subscription = RealtimeService.subscribeToTransactions(
      (payload) => {
        console.log('Transaction updated:', payload);
        // Update your UI here
      },
      userId
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);
}

// Subscribe to messages
const messageSubscription = RealtimeService.subscribeToMessages(
  (payload) => {
    console.log('New message:', payload);
  },
  transactionId
);
```

### File Storage

```javascript
import { StorageService } from '../services';

// Pick and upload image
const imageResult = await StorageService.pickImage();
if (!imageResult.cancelled) {
  const uploadResult = await StorageService.uploadImage(
    'avatars',
    `avatars/${userId}/${Date.now()}.jpg`,
    imageResult
  );
  console.log('Image URL:', uploadResult.publicUrl);
}

// Upload user avatar (helper function)
const avatarResult = await StorageService.uploadAvatar(userId, imageResult);

// Upload transaction attachment
const docResult = await StorageService.pickDocument();
if (!docResult.cancelled) {
  const uploadResult = await StorageService.uploadTransactionAttachment(
    transactionId,
    docResult,
    'document'
  );
}

// List files
const { files } = await StorageService.listFiles('avatars', 'avatars/user123');

// Delete file
await StorageService.deleteFile('avatars', 'avatars/user123/image.jpg');
```

---

## 📝 Notes

1. **Row Level Security (RLS)**: All tables have RLS enabled for security. Make sure your policies match your app's requirements.

2. **Storage Limits**: Free tier includes 500 MB storage. Upgrade if needed.

3. **Database Limits**: Free tier includes 500 MB database storage.

4. **Real-time**: Free tier includes 200 concurrent connections and 2 million real-time messages/month.

5. **API Rate Limits**: Free tier has rate limits. Consider upgrading for production.

---

## 🔧 Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check API keys are correct
   - Verify email templates are configured
   - Check RLS policies

2. **Storage upload fails**
   - Verify bucket exists and is accessible
   - Check file size limits
   - Verify MIME types are allowed
   - Check storage policies

3. **Real-time not working**
   - Verify table has RLS enabled
   - Check subscription channel names
   - Ensure user has proper permissions

4. **Database queries fail**
   - Check RLS policies allow the operation
   - Verify table/column names
   - Check user authentication status

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

Happy coding! 🚀

