import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ArtistProfile } from '@/shared/api/types';
import { renderWithTheme } from '@/test/render';
import { ArtistSpotlightCard } from './ArtistSpotlightCard';

const artist: ArtistProfile = {
  id: 3,
  user_id: 2,
  slug: 'void-pulse',
  username: 'void-pulse',
  display_name: 'Void Pulse',
  avatar_url: null,
  banner_image_url: null,
  bio: 'Dark pop and raw trap.',
  location: 'Moscow',
  profile_genres: ['dark pop', 'trap'],
  social_links: {},
  streaming_links: {},
  track_count: 8,
  play_count: 3400,
  like_count: 280,
  created_at: '2026-04-28T00:00:00Z',
};

describe('ArtistSpotlightCard', () => {
  it('renders an editorial artist card with discovery actions', () => {
    const markup = renderWithTheme(
      <MemoryRouter>
        <ArtistSpotlightCard artist={artist} />
      </MemoryRouter>
    );

    expect(markup).toContain('Void Pulse');
    expect(markup).toContain('Moscow • 8 релизов');
    expect(markup).toContain('Профиль артиста');
    expect(markup).toContain('Открыть релизы');
  });
});
