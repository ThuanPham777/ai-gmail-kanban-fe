// src/lib/api/types/auth.types.ts
import type { StoredUser } from '../../auth';

export interface LoginResponseData {
  accessToken: string;
  // refreshToken is now in HttpOnly cookie - not in response body
  user: StoredUser;
  provider: 'google';
  isNewUser?: boolean;
}

export interface LoginResponse {
  status: 'success';
  message?: string;
  data: LoginResponseData;
}

export interface RotateTokenResponseData {
  accessToken: string;
  // refreshToken is now in HttpOnly cookie - not in response body
}

export interface RotateTokenResponse {
  status: 'success';
  message?: string;
  data: RotateTokenResponseData;
}
