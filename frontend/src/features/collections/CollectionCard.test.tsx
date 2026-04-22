import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Collection } from '@/shared/api/types';
import { renderWithTheme } from '@/test/render';
import { CollectionCard } from './CollectionCard';

const collection: Collection = {
  id: 3,
  user_id: 1,
  name: 'Staff Picks',
  description: 'Curated tracks from the team',
  cover_image_url: null,
  is_public: true,
  track_count: 1,
  created_at: '2026-04-22T00:00:00Z',
  updated_at: '2026-04-22T00:00:00Z',
  tracks: [
    {
      id: 7,
      user_id: 2,
      artist_id: 2,
      title: 'Public Track',
      description: null,
      genre: 'ambient',
      category_id: null,
      is_public: true,
      is_downloadable: false,
      license_type: 'all-rights-reserved',
      tags: null,
      status: 'approved',
      created_at: '2026-04-22T00:00:00Z',
      updated_at: '2026-04-22T00:00:00Z',
      play_count: 0,
      like_count: 0,
      comment_count: 0,
      duration_seconds: 120,
      cover_image_url: null,
      user: {
        id: 2,
        username: 'artist',
      },
    },
  ],
};

describe('CollectionCard', () => {
  it('renders a public curated collection with track preview', () => {
    const markup = renderWithTheme(
      <MemoryRouter>
        <CollectionCard collection={collection} onPlayCollection={() => undefined} />
      </MemoryRouter>
    );

    expect(markup).toContain('Staff Picks');
    expect(markup).toContain('Public Track');
    expect(markup).toContain('Play collection');
  });
});
