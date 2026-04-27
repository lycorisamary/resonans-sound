import { describe, expect, it } from 'vitest';

import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { renderWithTheme } from '@/test/render';
import { AdminCollectionsPanel } from './AdminCollectionsPanel';

const auth: UseAuthResult = {
  authBusy: false,
  authMode: 'login',
  isStaff: true,
  login: async () => undefined,
  logout: async () => undefined,
  register: async () => undefined,
  setAuthMode: () => undefined,
  user: {
    id: 1,
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    status: 'active',
    created_at: '2026-04-22T00:00:00Z',
    email_verified: true,
  },
};

const player: UseAudioPlayerResult = {
  activeTrack: null,
  activeTrackId: null,
  audioRef: { current: null },
  isPlaying: false,
  playTrack: async () => undefined,
  playTrackQueue: async () => undefined,
  playerCurrentTime: 0,
  playerDuration: 0,
  playerError: null,
  playerLoading: false,
  playerQuality: '320',
  setPlayerQuality: () => undefined,
  stopAndResetAudio: () => undefined,
};

describe('AdminCollectionsPanel', () => {
  it('renders staff collection controls', () => {
    const markup = renderWithTheme(<AdminCollectionsPanel auth={auth} player={player} />);

    expect(markup).toContain('Управление подборками');
    expect(markup).toContain('Создать');
  });
});
