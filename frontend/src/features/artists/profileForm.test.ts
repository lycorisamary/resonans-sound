import { describe, expect, it } from 'vitest';

import { buildProfilePayload, parseLinksText, profileToForm } from './profileForm';

describe('artist profile form helpers', () => {
  it('parses conservative keyed links', () => {
    expect(parseLinksText('telegram=https://t.me/demo\nwebsite=https://example.com', ['telegram', 'website'])).toEqual({
      telegram: 'https://t.me/demo',
      website: 'https://example.com',
    });
  });

  it('rejects unsupported link keys', () => {
    expect(() => parseLinksText('unsafe=https://example.com', ['website'])).toThrow('Unsupported link key');
  });

  it('builds profile payload from text fields', () => {
    const payload = buildProfilePayload({
      displayName: ' Demo ',
      bio: '',
      location: ' Kaliningrad ',
      profileGenres: 'Ambient, Pop',
      socialLinks: 'website=https://example.com',
      streamingLinks: '',
    });

    expect(payload).toEqual({
      display_name: 'Demo',
      bio: null,
      location: 'Kaliningrad',
      profile_genres: ['Ambient', 'Pop'],
      social_links: { website: 'https://example.com' },
      streaming_links: {},
    });
  });

  it('serializes loaded profile links back to editable text', () => {
    const form = profileToForm({
      id: 1,
      username: 'demo',
      display_name: 'Demo',
      avatar_url: null,
      banner_image_url: null,
      bio: null,
      location: null,
      profile_genres: ['Ambient'],
      social_links: { website: 'https://example.com' },
      streaming_links: {},
      track_count: 0,
      play_count: 0,
      like_count: 0,
      created_at: new Date().toISOString(),
    });

    expect(form.profileGenres).toBe('Ambient');
    expect(form.socialLinks).toBe('website=https://example.com');
  });
});
