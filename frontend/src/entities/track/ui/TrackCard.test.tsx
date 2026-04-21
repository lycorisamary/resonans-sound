import { describe, expect, it } from 'vitest';

import { Track } from '@/shared/api/types';
import { renderWithTheme } from '@/test/render';
import { TrackCard } from './TrackCard';

const track: Track = {
  id: 7,
  user_id: 1,
  title: 'Morning Resonance',
  description: 'Live API smoke track',
  genre: 'ambient',
  is_public: true,
  is_downloadable: false,
  license_type: 'all-rights-reserved',
  tags: ['ambient', 'test'],
  status: 'approved',
  created_at: '2026-04-21T00:00:00Z',
  updated_at: '2026-04-21T00:00:00Z',
  play_count: 8,
  like_count: 2,
  comment_count: 0,
  duration_seconds: 125,
  mp3_320_url: '/api/v1/tracks/7/stream',
};

describe('TrackCard', () => {
  it('renders track metadata and catalog actions', () => {
    const markup = renderWithTheme(
      <TrackCard
        track={track}
        variant="catalog"
        active={false}
        isPlaying={false}
        playerLoading={false}
        liked={false}
        likeDisabled={false}
        deleteAllowed={false}
        studioBusy={false}
        uploadingTrackId={null}
        uploadingCoverTrackId={null}
        onPlayTrack={() => undefined}
        onToggleLike={() => undefined}
        onEditTrack={() => undefined}
        onDeleteTrack={() => undefined}
        onUploadTrack={() => undefined}
        onUploadCover={() => undefined}
      />
    );

    expect(markup).toContain('Morning Resonance');
    expect(markup).toContain('Duration 2:05');
    expect(markup).toContain('Слушать');
  });
});
