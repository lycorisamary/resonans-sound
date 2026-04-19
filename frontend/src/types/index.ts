export interface User {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'inactive' | 'banned';
  avatar_url?: string;
  bio?: string;
  created_at: string;
  email_verified: boolean;
}

export interface UserPublic {
  id: number;
  username: string;
  avatar_url?: string;
  bio?: string;
  track_count?: number;
  follower_count?: number;
  following_count?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  track_count?: number;
}

export interface Track {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  genre?: string;
  category_id?: number;
  is_public: boolean;
  is_downloadable: boolean;
  license_type: string;
  tags?: string[];
  bpm?: number;
  key_signature?: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'deleted';
  created_at: string;
  updated_at: string;
  play_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds?: number;
  waveform_data_json?: any;
  metadata?: TrackMetadata;
  user?: UserPublic;
  category?: Category;
  original_url?: string;
  mp3_128_url?: string;
  mp3_320_url?: string;
  rejection_reason?: string;
}

export interface TrackMetadata {
  duration_seconds?: number;
  file_size_bytes?: number;
  bitrate?: number;
  sample_rate?: number;
  channels?: number;
  format?: string;
}

export interface TrackModerationPayload {
  status: 'approved' | 'rejected';
  rejection_reason?: string | null;
}

export interface Playlist {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  track_count: number;
  tracks?: Track[];
}

export interface Interaction {
  id: number;
  user_id: number;
  track_id?: number;
  type: 'like' | 'comment' | 'repost' | 'follow';
  content?: string;
  created_at: string;
  user?: UserPublic;
}

export interface Comment extends Interaction {
  replies?: Comment[];
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower?: UserPublic;
  following?: UserPublic;
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

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SystemStats {
  total_users: number;
  total_tracks: number;
  total_plays: number;
  total_likes: number;
  active_users_today: number;
  new_users_today: number;
  tracks_pending_moderation: number;
}

export interface Report {
  id: number;
  reporter_id: number;
  track_id?: number;
  user_id?: number;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_user_id?: number;
  related_track_id?: number;
  related_interaction_id?: number;
  is_read: boolean;
  created_at: string;
}
