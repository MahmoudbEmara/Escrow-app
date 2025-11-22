/**
 * Service Index
 * Centralized exports for all Supabase services
 */

// Authentication Service
export * as AuthService from './authService';

// Real-time Service
export * as RealtimeService from './realtimeService';

// Storage Service
export * as StorageService from './storageService';

// Database Service
export * as DatabaseService from './databaseService';

// Legacy API service (can be removed if not needed)
export { default as api } from './api';

