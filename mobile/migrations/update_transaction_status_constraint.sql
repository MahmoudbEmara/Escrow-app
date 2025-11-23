-- ============================================
-- Update transactions table status constraint
-- This migration updates the status check constraint to include all state machine values
-- ============================================

-- Step 1: Drop the old constraint (if it exists)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Step 2: Add the new constraint with all required status values
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_status_check 
CHECK (status IN (
  'draft',
  'pending',
  'pending_approval',
  'accepted',
  'funded',
  'in_progress',
  'delivered',
  'completed',
  'cancelled',
  'canceled',
  'disputed'
));

-- Step 3: Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.transactions'::regclass
AND conname = 'transactions_status_check';

