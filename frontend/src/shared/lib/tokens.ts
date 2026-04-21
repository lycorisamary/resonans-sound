import { AuthTokens } from '@/shared/api/types';

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function hasAccessToken(): boolean {
  return Boolean(localStorage.getItem('access_token'));
}
