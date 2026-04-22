import { ArtistProfile, ArtistProfilePayload } from '@/shared/api/types';

const SOCIAL_KEYS = ['instagram', 'telegram', 'vk', 'youtube', 'tiktok', 'x', 'website'];
const STREAMING_KEYS = ['soundcloud', 'spotify', 'apple_music', 'youtube_music', 'bandcamp', 'yandex_music', 'vk_music'];

export function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function linksToText(links: Record<string, string>): string {
  return Object.entries(links)
    .map(([key, url]) => `${key}=${url}`)
    .join('\n');
}

export function parseLinksText(value: string, allowedKeys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error('Links must use key=https://example.com format.');
    }
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const url = line.slice(separatorIndex + 1).trim();
    if (!allowedKeys.includes(key)) {
      throw new Error(`Unsupported link key: ${key}`);
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw new Error('Links must start with http:// or https://.');
    }
    result[key] = url;
  }
  return result;
}

export function buildProfilePayload(form: ArtistProfileFormState): ArtistProfilePayload {
  return {
    display_name: form.displayName.trim() || null,
    bio: form.bio.trim() || null,
    location: form.location.trim() || null,
    profile_genres: parseCommaList(form.profileGenres),
    social_links: parseLinksText(form.socialLinks, SOCIAL_KEYS),
    streaming_links: parseLinksText(form.streamingLinks, STREAMING_KEYS),
  };
}

export interface ArtistProfileFormState {
  displayName: string;
  bio: string;
  location: string;
  profileGenres: string;
  socialLinks: string;
  streamingLinks: string;
}

export function profileToForm(profile: ArtistProfile | null): ArtistProfileFormState {
  return {
    displayName: profile?.display_name ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    profileGenres: profile?.profile_genres.join(', ') ?? '',
    socialLinks: linksToText(profile?.social_links ?? {}),
    streamingLinks: linksToText(profile?.streaming_links ?? {}),
  };
}
