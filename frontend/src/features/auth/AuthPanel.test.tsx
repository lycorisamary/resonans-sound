import { describe, expect, it } from 'vitest';

import { AuthPanel } from './AuthPanel';
import { UseAuthResult } from '@/hooks/useAuth';
import { renderWithTheme } from '@/test/render';

const baseAuth: UseAuthResult = {
  authBusy: false,
  authMode: 'login',
  isStaff: false,
  login: async () => undefined,
  logout: async () => undefined,
  register: async () => undefined,
  setAuthMode: () => undefined,
  user: null,
};

describe('AuthPanel', () => {
  it('renders the login form for guests', () => {
    const markup = renderWithTheme(
      <AuthPanel auth={baseAuth} likedTrackIdsCount={0} myTracksCount={0} publicTracksCount={2} onLogout={() => undefined} />
    );

    expect(markup).toContain('Сессия и доступ');
    expect(markup).toContain('Открыть сессию');
  });

  it('renders account metrics for an authenticated user', () => {
    const markup = renderWithTheme(
      <AuthPanel
        auth={{
          ...baseAuth,
          isStaff: true,
          user: {
            id: 1,
            email: 'admin@example.com',
            username: 'admin',
            role: 'admin',
            status: 'active',
            created_at: '2026-04-21T00:00:00Z',
            email_verified: true,
          },
        }}
        likedTrackIdsCount={3}
        myTracksCount={4}
        publicTracksCount={5}
        onLogout={() => undefined}
      />
    );

    expect(markup).toContain('admin@example.com');
    expect(markup).toContain('Лайки 3');
  });
});
