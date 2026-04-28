import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ArtistProfile, Collection, Track } from '@/shared/api/types';
import { renderWithTheme } from '@/test/render';
import { HomePage } from './HomePage';

vi.mock('../catalog/CatalogPanel', () => ({
  CatalogPanel: () => <div>CATALOG_PANEL_STUB</div>,
}));

const recentTrack: Track = {
  id: 11,
  user_id: 1,
  artist_id: 1,
  title: 'Static Bloom',
  description: 'Featured release',
  genre: 'darkwave',
  is_public: true,
  is_downloadable: false,
  license_type: 'all-rights-reserved',
  tags: ['darkwave'],
  status: 'approved',
  created_at: '2026-04-28T00:00:00Z',
  updated_at: '2026-04-28T00:00:00Z',
  play_count: 128,
  like_count: 48,
  comment_count: 0,
  duration_seconds: 222,
  artist: { id: 1, slug: 'lycoris', display_name: 'Lycoris' },
};

const artist: ArtistProfile = {
  id: 1,
  user_id: 1,
  slug: 'lycoris',
  username: 'lycoris',
  display_name: 'Lycoris',
  avatar_url: null,
  banner_image_url: null,
  bio: 'Darkwave artist',
  location: 'Kaliningrad',
  profile_genres: ['darkwave', 'electronic'],
  social_links: {},
  streaming_links: {},
  track_count: 3,
  play_count: 1200,
  like_count: 410,
  created_at: '2026-04-28T00:00:00Z',
};

const collection: Collection = {
  id: 4,
  user_id: 1,
  name: 'Night selection',
  description: 'Curated after midnight',
  cover_image_url: null,
  is_public: true,
  track_count: 1,
  created_at: '2026-04-28T00:00:00Z',
  updated_at: '2026-04-28T00:00:00Z',
  tracks: [recentTrack],
};

vi.mock('./model/useHomeFeed', () => ({
  useHomeFeed: () => ({
    artists: [artist],
    collections: [collection],
    error: null,
    loading: false,
    popularTracks: [recentTrack],
    recentTracks: [recentTrack],
    reload: vi.fn(),
  }),
}));

describe('HomePage', () => {
  it('renders the curated discovery path and main surfaces', () => {
    const markup = renderWithTheme(
      <MemoryRouter>
        <HomePage
          auth={{ user: null } as never}
          catalog={{ publicTracks: new Array(8).fill(recentTrack) } as never}
          player={{ playTrack: vi.fn(), playTrackQueue: vi.fn() } as never}
          trackActions={{} as never}
        />
      </MemoryRouter>
    );

    expect(markup).toContain('Загрузка без ожидания');
    expect(markup).toContain('Первые прослушивания');
    expect(markup).toContain('Шанс попасть в отбор');
    expect(markup).toContain('Подборки от администрации');
    expect(markup).toContain('Новые артисты');
    expect(markup).toContain('Популярное сейчас');
    expect(markup).toContain('CATALOG_PANEL_STUB');
  });
});
