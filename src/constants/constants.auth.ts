/**
 * Constants for Authentication
 * Centralizes auth-related configuration values
 */

/**
 * Google OAuth2 client ID
 * Loaded from environment variable
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Gmail API scopes required for email operations
 * Includes read, modify, and send permissions
 */
export const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

/**
 * Joined Gmail scopes string for OAuth requests
 */
export const GMAIL_SCOPE_STRING = GMAIL_SCOPES.join(' ');

/**
 * Google Identity Services script ID
 * Used to prevent duplicate script loading
 */
export const GSI_SCRIPT_ID = 'google-identity-services';

/**
 * Google Identity Services script URL
 */
export const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * LocalStorage keys for auth data
 */
export const STORAGE_KEYS = {
  USER: 'user',
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  REFRESH_EXPIRY: 'refreshTokenExpiry',
} as const;

/**
 * Token expiry buffer (in seconds)
 * Refresh token this many seconds before actual expiry
 */
export const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes

/**
 * Default token refresh interval (in milliseconds)
 * How often to check if token needs refresh
 */
export const TOKEN_REFRESH_INTERVAL = 60000; // 1 minute

/**
 * Session timeout duration (in milliseconds)
 * User logged out after this period of inactivity
 */
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * OAuth popup dimensions
 */
export const OAUTH_POPUP = {
  WIDTH: 500,
  HEIGHT: 600,
} as const;
