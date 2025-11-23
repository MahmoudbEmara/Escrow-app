# Transaction State Machine Implementation

## Overview

The escrow app now uses a complete state machine for transaction workflow management. This ensures consistent state transitions, proper validation, and automatic notifications throughout the transaction lifecycle.

## States

The following states are defined in `mobile/src/constants/transactionStates.js`:

1. **`draft`** - Initial state when transaction is created
2. **`pending_approval`** - Buyer has submitted transaction for seller approval
3. **`accepted`** - Seller has accepted the transaction
4. **`funded`** - Buyer has funded the escrow
5. **`in_progress`** - Seller has started work
6. **`delivered`** - Seller has marked work as delivered
7. **`completed`** - Buyer has confirmed completion, funds released
8. **`cancelled`** - Transaction cancelled (terminal state)
9. **`disputed`** - Transaction is in dispute

## Valid Transitions

```
draft → pending_approval
pending_approval → accepted | cancelled
accepted → funded | cancelled
funded → in_progress
in_progress → delivered
delivered → completed | disputed
disputed → completed | cancelled (admin only)
```

## State Actions

Each state transition triggers specific actions:

- **`pending_approval`**: Notifies receiver (seller)
- **`accepted`**: Notifies buyer to pay
- **`funded`**: Notifies seller to start work
- **`in_progress`**: Logs seller started work
- **`delivered`**: Notifies buyer to review
- **`completed`**: Releases funds to seller
- **`disputed`**: Notifies support and seller

## Implementation Files

### Core Files

1. **`mobile/src/constants/transactionStates.js`**
   - State definitions
   - Transition validation
   - UI helpers (colors, display names)

2. **`mobile/src/services/transactionService.js`**
   - High-level transaction operations
   - State transition functions
   - User-friendly API

3. **`mobile/src/services/notificationService.js`**
   - Notification handlers for each state
   - Fund release logic
   - Dispute notifications

4. **`mobile/src/services/databaseService.js`**
   - `transitionTransactionState()` - Core state transition logic
   - Permission validation
   - State history logging

### Database Schema

**`mobile/SUPABASE_SCHEMA.sql`**
- Transaction status enum with all 9 states
- State transition validation function
- RLS policies for state-based access

## Usage Examples

### Creating a Transaction

```javascript
import * as TransactionService from '../services/transactionService';

const result = await TransactionService.createTransaction({
  title: 'Website Development',
  buyer_id: userId,
  seller_id: sellerId,
  amount: 2500,
  // ... other fields
});
// Transaction starts in 'draft' state
```

### State Transitions

```javascript
// Buyer submits for approval
await TransactionService.submitForApproval(transactionId, buyerId);

// Seller accepts
await TransactionService.acceptTransaction(transactionId, sellerId);

// Buyer funds escrow
await TransactionService.fundTransaction(transactionId, buyerId);

// Seller starts work
await TransactionService.startWork(transactionId, sellerId);

// Seller delivers
await TransactionService.markAsDelivered(transactionId, sellerId);

// Buyer completes
await TransactionService.completeTransaction(transactionId, buyerId);
```

### Getting Transaction with State Info

```javascript
const result = await TransactionService.getTransactionWithStateInfo(
  transactionId,
  userId
);

// result.data.stateInfo contains:
// - currentState
// - displayName
// - colors
// - validNextStates
// - availableActions (based on user role)
// - isBuyer / isSeller
```

## Frontend Integration

The `transaction-details.js` component automatically:
- Displays current state with proper colors
- Shows available actions based on user role and current state
- Handles state transitions with proper error handling
- Updates UI after successful transitions

## Permission Rules

- **Buyer** can: submit, fund, complete, dispute, cancel (in draft/accepted)
- **Seller** can: accept, start work, deliver, cancel (in draft/accepted)
- **Admin** can: resolve disputes (disputed → completed/cancelled)

## Database Setup

Run the SQL schema in Supabase SQL Editor:

```bash
# Execute mobile/SUPABASE_SCHEMA.sql in Supabase Dashboard
```

This will:
- Create transaction_states enum
- Set up validation function
- Configure RLS policies
- Create necessary indexes

## Migration Notes

### Old Status Values

If you have existing transactions with old status values, you'll need to migrate them:

```sql
-- Example migration (adjust based on your old values)
UPDATE transactions 
SET status = CASE
  WHEN status = 'pending' THEN 'pending_approval'
  WHEN status = 'active' THEN 'in_progress'
  WHEN status = 'done' THEN 'completed'
  -- ... other mappings
  ELSE 'draft'
END;
```

## Testing

Test the state machine by:

1. Creating a transaction (should be `draft`)
2. Submitting for approval (should transition to `pending_approval`)
3. Accepting (should transition to `accepted`)
4. Funding (should transition to `funded` and deduct from wallet)
5. Starting work (should transition to `in_progress`)
6. Delivering (should transition to `delivered`)
7. Completing (should transition to `completed` and release funds)

## Error Handling

All state transitions:
- Validate current state
- Check user permissions
- Verify transition is allowed
- Return structured error messages
- Log state changes to history

## Next Steps

1. Run the SQL schema in Supabase
2. Test state transitions end-to-end
3. Update any remaining UI components that reference old states
4. Add admin interface for dispute resolution (if needed)

