-- ============================================
-- Supabase Database Schema for Escrow App
-- Transaction State Machine Implementation
-- ============================================

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  buyer_id UUID REFERENCES auth.users(id) NOT NULL,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_approval',
    'accepted',
    'funded',
    'in_progress',
    'delivered',
    'completed',
    'cancelled',
    'disputed'
  )),
  category TEXT,
  terms TEXT,
  fees_responsibility TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- ==================== WALLETS ====================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==================== TRANSACTION HISTORY ====================
CREATE TABLE IF NOT EXISTS public.transaction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN (
    'deposit',
    'withdrawal',
    'escrow_hold',
    'escrow_release',
    'refund',
    'status_change'
  )),
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2),
  balance_after DECIMAL(10, 2),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transaction history"
  ON public.transaction_history FOR SELECT
  USING (auth.uid() = user_id);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN (
    'info',
    'transaction_update',
    'payment_required',
    'work_start',
    'delivery_review',
    'funds_released',
    'dispute',
    'refund'
  )),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_messages_transaction_id ON public.messages(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON public.transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction_id ON public.transaction_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==================== FUNCTIONS ====================

-- Function to auto-create profile and wallet on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(SPLIT_PART(NEW.email, '@', 1)))
  );
  
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION public.validate_transaction_state_transition(
  old_status TEXT,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Define valid transitions
  CASE old_status
    WHEN 'draft' THEN
      RETURN new_status = 'pending_approval';
    WHEN 'pending_approval' THEN
      RETURN new_status IN ('accepted', 'cancelled');
    WHEN 'accepted' THEN
      RETURN new_status IN ('funded', 'cancelled');
    WHEN 'funded' THEN
      RETURN new_status = 'in_progress';
    WHEN 'in_progress' THEN
      RETURN new_status = 'delivered';
    WHEN 'delivered' THEN
      RETURN new_status IN ('completed', 'disputed');
    WHEN 'disputed' THEN
      RETURN new_status IN ('completed', 'cancelled');
    WHEN 'completed' THEN
      RETURN FALSE; -- Terminal state
    WHEN 'cancelled' THEN
      RETURN FALSE; -- Terminal state
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(username_input TEXT)
RETURNS TABLE(available BOOLEAN, username_exists BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    NOT EXISTS(SELECT 1 FROM public.profiles WHERE username = LOWER(username_input)) as available,
    EXISTS(SELECT 1 FROM public.profiles WHERE username = LOWER(username_input)) as username_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check email availability
CREATE OR REPLACE FUNCTION public.check_email_available(email_input TEXT)
RETURNS TABLE(available BOOLEAN, email_exists BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    NOT EXISTS(SELECT 1 FROM public.profiles WHERE email = LOWER(email_input)) as available,
    EXISTS(SELECT 1 FROM public.profiles WHERE email = LOWER(email_input)) as email_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email by username (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(username_input TEXT)
RETURNS TABLE(id UUID, email TEXT, username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE p.username = LOWER(username_input)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email by email (for login with email)
CREATE OR REPLACE FUNCTION public.get_email_by_email(email_input TEXT)
RETURNS TABLE(id UUID, email TEXT, username TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE p.email = LOWER(email_input)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== COMMENTS ====================
COMMENT ON TABLE public.transactions IS 'Transactions with state machine workflow';
COMMENT ON COLUMN public.transactions.status IS 'Transaction state: draft, pending_approval, accepted, funded, in_progress, delivered, completed, cancelled, disputed';
COMMENT ON TABLE public.transaction_history IS 'Audit log for all transaction-related activities';
COMMENT ON TABLE public.notifications IS 'User notifications for state transitions and events';
