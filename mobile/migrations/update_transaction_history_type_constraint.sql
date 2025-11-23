-- ============================================
-- Update transaction_history type constraint to include 'status_change'
-- ============================================

-- Drop the existing constraint
ALTER TABLE public.transaction_history
DROP CONSTRAINT IF EXISTS transaction_history_type_check;

-- Add the new constraint with 'status_change' included
ALTER TABLE public.transaction_history
ADD CONSTRAINT transaction_history_type_check
CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'refund', 'status_change'));

-- Verify the constraint was updated
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.transaction_history'::regclass
AND conname = 'transaction_history_type_check';

