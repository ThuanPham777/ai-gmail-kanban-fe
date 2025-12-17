/**
 * Utility functions for authentication operations
 */

import type { StoredUser } from '@/lib/auth';
import { STORAGE_KEYS, TOKEN_EXPIRY_BUFFER } from '../constants/constants.auth';

/**
 * Validates email format using regex
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with isValid flag and error message
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }
  if (password.length > 100) {
    return {
      isValid: false,
      error: 'Password must be less than 100 characters',
    };
  }
  return { isValid: true };
}

/**
 * Checks if refresh token is expired or about to expire
 * @param expiryTimestamp - Token expiry timestamp in seconds
 * @returns True if token is expired or within buffer period
 */
export function isTokenExpired(expiryTimestamp: number | null): boolean {
  if (!expiryTimestamp) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= expiryTimestamp - TOKEN_EXPIRY_BUFFER;
}

/**
 * Formats user display name from user object
 * Falls back to email if name not available
 * @param user - Stored user object
 * @returns Formatted display name
 */
export function getUserDisplayName(user: StoredUser | null): string {
  if (!user) return 'Guest';
  return user.name || user.email || 'User';
}

/**
 * Gets user initials for avatar display
 * @param user - Stored user object
 * @returns Uppercase initials (max 2 letters)
 */
export function getUserInitials(user: StoredUser | null): string {
  if (!user) return 'G';

  const name = user.name || user.email || 'User';
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/**
 * Checks if user has Gmail integration connected
 * @param user - Stored user object
 * @returns True if Gmail is connected
 */
export function hasGmailConnected(user: StoredUser | null): boolean {
  // Check if user has Gmail refresh token or relevant field
  // This would depend on your StoredUser interface
  return !!user; // Placeholder - adjust based on your data structure
}

/**
 * Safely parses stored user from localStorage
 * @returns Parsed user object or null if invalid
 */
export function parseStoredUser(): StoredUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Basic validation
    if (!parsed._id || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clears all authentication data from storage
 * Used during logout or auth errors
 */
export function clearAuthStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Formats API error message for display
 * @param error - Error object from API call
 * @returns User-friendly error message
 */
export function formatAuthError(error: any): string {
  if (typeof error === 'string') return error;

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  // Common error mappings
  const statusCode = error?.response?.status;
  if (statusCode === 401) return 'Invalid credentials';
  if (statusCode === 403) return 'Access forbidden';
  if (statusCode === 404) return 'User not found';
  if (statusCode === 409) return 'Email already registered';
  if (statusCode >= 500) return 'Server error. Please try again later';

  return 'Authentication failed. Please try again';
}

/**
 * Generates a random state parameter for OAuth
 * Used to prevent CSRF attacks
 * @returns Random state string
 */
export function generateOAuthState(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Calculates time until token expiry
 * @param expiryTimestamp - Token expiry timestamp in seconds
 * @returns Time remaining in milliseconds, or 0 if expired
 */
export function getTimeUntilExpiry(expiryTimestamp: number | null): number {
  if (!expiryTimestamp) return 0;
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiryTimestamp - now;
  return Math.max(0, remaining * 1000);
}

/**
 * Checks if code is a valid Gmail authorization code
 * @param code - Authorization code from OAuth callback
 * @returns True if code appears valid
 */
export function isValidAuthCode(code: string): boolean {
  return typeof code === 'string' && code.length > 10;
}

/**
 * Creates a timeout promise for async operations
 * @param ms - Timeout duration in milliseconds
 * @returns Promise that rejects after timeout
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), ms);
  });
}

/**
 * Executes async operation with timeout
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Result of promise or timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}
