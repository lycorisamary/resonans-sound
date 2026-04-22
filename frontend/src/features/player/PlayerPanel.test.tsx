import { describe, expect, it } from 'vitest';

import { getPlayReportThreshold, UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { renderWithTheme } from '@/test/render';
import { PlayerPanel } from './PlayerPanel';

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

describe('PlayerPanel', () => {
  it('renders idle compact player state', () => {
    const markup = renderWithTheme(<PlayerPanel player={player} />);

    expect(markup).toContain('Choose a track');
    expect(markup).toContain('Idle');
  });

  it('uses the earlier listen-threshold between thirty seconds and half duration', () => {
    expect(getPlayReportThreshold(120)).toBe(30);
    expect(getPlayReportThreshold(20)).toBe(10);
  });
});
