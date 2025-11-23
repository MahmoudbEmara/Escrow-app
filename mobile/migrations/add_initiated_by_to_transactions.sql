-- ============================================
-- Add initiated_by column to transactions table
-- This tracks who created/initiated the transaction
-- ============================================

-- Add initiated_by column
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_by 
ON public.transactions(initiated_by);

-- Update existing transactions to set initiated_by based on created_at
-- For existing transactions, we'll set it to buyer_id as a default
-- (This is a best guess - new transactions will have the correct value)
UPDATE public.transactions
SET initiated_by = buyer_id
WHERE initiated_by IS NULL;

