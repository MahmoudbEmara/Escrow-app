/**
 * Service Index
 * Centralized exports for all Supabase services
 */

// Authentication Service
export * as AuthService from './authService';

// Database Service
export * as DatabaseService from './databaseService';

// Transaction Service (with state machine)
export * as TransactionService from './transactionService';

// Notification Service
export * as NotificationService from './notificationService';

// State Machine Constants
export * from '../constants/transactionStates';

// Legacy API service (can be removed if not needed)
export { default as api } from './api';

