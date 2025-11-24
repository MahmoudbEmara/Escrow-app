-- ============================================
-- Add delivered_at column to transactions table
-- ============================================

-- Add delivered_at column to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Optional: Add an index for faster lookups
CREATE INDEX IF NOT EXISTS transactions_delivered_at_idx ON public.transactions (delivered_at);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN public.transactions.delivered_at IS 'Timestamp when the transaction was marked as delivered by the seller';

