/**
 * Transaction Fees Configuration
 * 
 * This file contains the fee percentage used throughout the app.
 * To change the fee percentage, simply update the TRANSACTION_FEE_PERCENTAGE constant below.
 * 
 * Example: If TRANSACTION_FEE_PERCENTAGE = 0.05, then fees = amount * 0.05 (5%)
 */

// Transaction fee percentage (as a decimal)
// Example: 0.05 = 5%, 0.10 = 10%, 0.025 = 2.5%
export const TRANSACTION_FEE_PERCENTAGE = 0.015; // 0%

/**
 * Calculate transaction fees based on amount
 * @param {number} amount - Transaction amount
 * @returns {number} - Calculated fee amount
 */
export const calculateTransactionFee = (amount) => {
  if (!amount || amount <= 0) return 0;
  return amount * TRANSACTION_FEE_PERCENTAGE;
};

/**
 * Get fee percentage as a display string
 * @returns {string} - Fee percentage as string (e.g., "5%")
 */
export const getFeePercentageDisplay = () => {
  return `${(TRANSACTION_FEE_PERCENTAGE * 100).toFixed(1)}%`;
};

