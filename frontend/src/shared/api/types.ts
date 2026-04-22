export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type TrackStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'hidden' | 'deleted';
export type AuthMode = 'login' | 'register';
export type CatalogView = 'catalog' | 'liked';
export type StreamQuality = '128' | '320' | 'original';
export type CatalogSort = 'newest' | 'popular' | 'title';
export type OwnerTrackStateTone = 'info' | 'warning' | 'success' | 'error';
export type TrackReportReason = 'spam' | 'copyright' | 'offensive' | 'not_music' | 'other';
export type TrackReportStatus = 'open' | 'reviewed' | 'dismissed' | 'resolved';

export interface HealthResponse {
  status: string;
  version: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  display_name?: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string | null;
  banner_image_url?: string | null;
  bio?: string | null;
  created_at: string;
  email_verified: boolean;
}

export interface UserPublic {
  id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  banner_image_url?: string | null;
  bio?: string | null;
  track_count?: number;
  follower_count?: number;
  following_count?: number;
}

export interface ArtistProfile {
  id: number;
  user_id: number;
  slug: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  banner_image_url?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_genres: string[];
  social_links: Record<string, string>;
  streaming_links: Record<string, string>;
  track_count: number;
  play_count: number;
  like_count: number;
  created_at: string;
}

export interface ArtistPublic {
  id: number;
  slug: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface ArtistProfilePayload {
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_genres?: string[] | null;
  social_links?: Record<string, string> | null;
  streaming_links?: Record<string, string> | null;
}

export interface ArtistProfileCreatePayload extends ArtistProfilePayload {
  slug: string;
  display_name: string;
}

export interface ArtistListParams {
  search?: string;
  page?: number;
  size?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  track_count?: number;
}

export interface WaveformData {
  samples?: number[];
  duration_seconds?: number;
  sample_rate?: number;
  channels?: number;
}

export interface TrackMetadata {
  duration_seconds?: number;
  file_size_bytes?: number;
  bitrate?: number;
  sample_rate?: number;
  channels?: number;
  format?: string;
}

export interface Track {
  id: number;
  user_id: number;
  artist_id: number;
  title: string;
  description?: string | null;
  genre?: string | null;
  category_id?: number | null;
  is_public: boolean;
  is_downloadable: boolean;
  license_type: string;
  tags?: string[] | null;
  status: TrackStatus;
  created_at: string;
  updated_at: string;
  play_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds?: number | null;
  cover_image_url?: string | null;
  waveform_data_json?: WaveformData | null;
  metadata?: TrackMetadata | null;
  user?: UserPublic | null;
  artist?: ArtistPublic | null;
  category?: Category | null;
  original_url?: string | null;
  mp3_128_url?: string | null;
  mp3_320_url?: string | null;
  rejection_reason?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
}

export interface TrackFormState {
  title: string;
  description: string;
  genre: string;
  category_id: string;
  is_downloadable: boolean;
  license_type: string;
  tags: string;
}

export interface TrackMetadataPayload {
  title: string;
  description: string | null;
  genre: string | null;
  category_id: number | null;
  is_downloadable: boolean;
  license_type: string;
  tags: string[];
}

export interface TrackListParams {
  category?: string;
  genre?: string;
  tag?: string;
  search?: string;
  sort?: CatalogSort;
  page?: number;
  size?: number;
}

export interface StreamUrlResponse {
  url: string;
  quality: string;
  expires_at?: string | null;
}

export interface LikeToggleResponse {
  track_id: number;
  liked: boolean;
  like_count: number;
}

export interface TrackLikeListResponse {
  track_ids: number[];
}

export interface TrackPlayResponse {
  track_id: number;
  counted: boolean;
  play_count: number;
  dedupe_window_seconds: number;
}

export interface TrackReportPayload {
  track_id: number;
  reason: TrackReportReason;
  description?: string | null;
}

export interface TrackReportResolvePayload {
  status: TrackReportStatus;
  resolution_notes?: string | null;
  hide_track: boolean;
}

export interface TrackReport {
  id: number;
  reporter_id: number;
  track_id?: number | null;
  reason: TrackReportReason;
  description?: string | null;
  status: TrackReportStatus;
  moderator_id?: number | null;
  reviewed_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  track?: Track | null;
}

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_public: boolean;
  track_count: number;
  created_at: string;
  updated_at: string;
  tracks: Track[];
}

export interface CollectionPayload {
  name: string;
  description?: string | null;
  is_public: boolean;
}

export interface CollectionTrackPayload {
  track_id: number;
}

export interface CollectionReorderPayload {
  track_ids: number[];
}

export interface AdminSystemStats {
  total_users: number;
  total_tracks: number;
  total_plays: number;
  total_likes: number;
  active_users_today: number;
  new_users_today: number;
  tracks_pending_moderation: number;
  tracks_hidden: number;
}

export interface TrackModerationPayload {
  status: Extract<TrackStatus, 'approved' | 'rejected' | 'hidden'>;
  rejection_reason?: string | null;
}

export interface AdminTrackListParams {
  status?: TrackStatus;
  search?: string;
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
