/**
 * Transaction State Machine Constants
 * Defines all possible states and valid transitions for escrow workflow
 */

// Transaction States Enum
export const TransactionState = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  ACCEPTED: 'accepted',
  FUNDED: 'funded',
  IN_PROGRESS: 'in_progress',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
};

// Valid state transitions map
// Format: { fromState: [allowedToStates] }
export const VALID_TRANSITIONS = {
  [TransactionState.DRAFT]: [TransactionState.PENDING_APPROVAL],
  [TransactionState.PENDING_APPROVAL]: [TransactionState.ACCEPTED, TransactionState.CANCELLED],
  [TransactionState.ACCEPTED]: [TransactionState.FUNDED, TransactionState.CANCELLED],
  [TransactionState.FUNDED]: [TransactionState.IN_PROGRESS],
  [TransactionState.IN_PROGRESS]: [TransactionState.DELIVERED],
  [TransactionState.DELIVERED]: [TransactionState.COMPLETED, TransactionState.DISPUTED],
  [TransactionState.DISPUTED]: [TransactionState.COMPLETED, TransactionState.CANCELLED],
  [TransactionState.COMPLETED]: [], // Terminal state
  [TransactionState.CANCELLED]: [], // Terminal state
};

// Actions to perform on state transitions
export const TRANSITION_ACTIONS = {
  [TransactionState.PENDING_APPROVAL]: 'notify_receiver',
  [TransactionState.ACCEPTED]: 'notify_buyer_to_pay',
  [TransactionState.FUNDED]: 'notify_seller_start_work',
  [TransactionState.IN_PROGRESS]: 'log_seller_started',
  [TransactionState.DELIVERED]: 'notify_buyer_review',
  [TransactionState.COMPLETED]: 'release_funds_to_seller',
  [TransactionState.DISPUTED]: 'notify_support_and_seller',
};

// State display names for UI
export const STATE_DISPLAY_NAMES = {
  [TransactionState.DRAFT]: 'Draft',
  [TransactionState.PENDING_APPROVAL]: 'Pending Approval',
  [TransactionState.ACCEPTED]: 'Accepted',
  [TransactionState.FUNDED]: 'Funded',
  [TransactionState.IN_PROGRESS]: 'In Progress',
  [TransactionState.DELIVERED]: 'Delivered',
  [TransactionState.COMPLETED]: 'Completed',
  [TransactionState.CANCELLED]: 'Cancelled',
  [TransactionState.DISPUTED]: 'Disputed',
};

// States that are terminal (no further transitions)
export const TERMINAL_STATES = [
  TransactionState.COMPLETED,
  TransactionState.CANCELLED,
];

// States that require admin intervention
export const ADMIN_STATES = [
  TransactionState.DISPUTED,
];

// State colors for UI
export const STATE_COLORS = {
  [TransactionState.DRAFT]: { bg: '#f3f4f6', text: '#374151' },
  [TransactionState.PENDING_APPROVAL]: { bg: '#fef3c7', text: '#d97706' },
  [TransactionState.ACCEPTED]: { bg: '#dbeafe', text: '#1e40af' },
  [TransactionState.FUNDED]: { bg: '#dbeafe', text: '#1e40af' },
  [TransactionState.IN_PROGRESS]: { bg: '#dbeafe', text: '#1e40af' },
  [TransactionState.DELIVERED]: { bg: '#e0e7ff', text: '#4338ca' },
  [TransactionState.COMPLETED]: { bg: '#d1fae5', text: '#065f46' },
  [TransactionState.CANCELLED]: { bg: '#fee2e2', text: '#991b1b' },
  [TransactionState.DISPUTED]: { bg: '#fee2e2', text: '#991b1b' },
};

/**
 * Check if a state transition is valid
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} - True if transition is valid
 */
export const isValidTransition = (fromState, toState) => {
  if (!fromState || !toState) return false;
  const allowedTransitions = VALID_TRANSITIONS[fromState] || [];
  return allowedTransitions.includes(toState);
};

/**
 * Get all valid next states for a given state
 * @param {string} currentState - Current state
 * @returns {string[]} - Array of valid next states
 */
export const getValidNextStates = (currentState) => {
  return VALID_TRANSITIONS[currentState] || [];
};

/**
 * Check if a state is terminal
 * @param {string} state - State to check
 * @returns {boolean} - True if state is terminal
 */
export const isTerminalState = (state) => {
  return TERMINAL_STATES.includes(state);
};

/**
 * Get the action to perform for a state transition
 * @param {string} toState - Target state
 * @returns {string|null} - Action name or null
 */
export const getTransitionAction = (toState) => {
  return TRANSITION_ACTIONS[toState] || null;
};

/**
 * Get display name for a state
 * @param {string} state - State value
 * @returns {string} - Display name
 */
export const getStateDisplayName = (state) => {
  return STATE_DISPLAY_NAMES[state] || state;
};

/**
 * Get color scheme for a state
 * @param {string} state - State value
 * @returns {object} - Color object with bg and text
 */
export const getStateColors = (state) => {
  return STATE_COLORS[state] || { bg: '#f3f4f6', text: '#374151' };
};
