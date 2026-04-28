import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import {
  AdminSystemStats,
  AdminTrackListParams,
  ArtistListParams,
  ArtistProfile,
  ArtistProfileCreatePayload,
  ArtistProfilePayload,
  AuthTokens,
  Category,
  Collection,
  CollectionPayload,
  CollectionReorderPayload,
  CollectionTrackPayload,
  HealthResponse,
  LikeToggleResponse,
  LoginCredentials,
  PaginatedResponse,
  RegisterCredentials,
  SiteContent,
  SiteContentPayload,
  StreamQuality,
  StreamUrlResponse,
  Track,
  TrackLikeListResponse,
  TrackListParams,
  TrackModerationPayload,
  TrackMetadataPayload,
  TrackPlayResponse,
  TrackReport,
  TrackReportPayload,
  TrackReportResolvePayload,
  User,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const uploadRequestConfig = {
  timeout: 0,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
} as const;

type RefreshTokenPayload = Pick<AuthTokens, 'refresh_token'>;

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (config.data instanceof FormData && config.headers) {
          delete config.headers['Content-Type'];
        }

        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error: unknown) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: unknown) => {
        if (!axios.isAxiosError(error)) {
          return Promise.reject(error);
        }

        const originalRequest = error.config as RetryRequestConfig | undefined;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post<AuthTokens, { data: AuthTokens }, RefreshTokenPayload>(
              `${API_BASE_URL}/auth/refresh`,
              { refresh_token: refreshToken }
            );

            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);

            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.assign('/login');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  async getSiteContent(): Promise<SiteContent> {
    const response = await this.client.get<SiteContent>('/site-content');
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens, { data: AuthTokens }, LoginCredentials>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(email: string, password: string, username: string): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens, { data: AuthTokens }, RegisterCredentials>('/auth/register', {
      email,
      password,
      username,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await this.client.post<void, { data: void }, RefreshTokenPayload>('/auth/logout', {
          refresh_token: refreshToken,
        });
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/users/me');
    return response.data;
  }

  async updateMyArtistProfile(data: ArtistProfilePayload): Promise<ArtistProfile> {
    const response = await this.client.put<ArtistProfile, { data: ArtistProfile }, ArtistProfilePayload>(
      '/users/me/profile',
      data
    );
    return response.data;
  }

  async getMyArtistProfile(): Promise<ArtistProfile | null> {
    const response = await this.client.get<ArtistProfile | null>('/users/me/artist');
    return response.data;
  }

  async createMyArtistProfile(data: ArtistProfileCreatePayload): Promise<ArtistProfile> {
    const response = await this.client.post<ArtistProfile, { data: ArtistProfile }, ArtistProfileCreatePayload>(
      '/users/me/artist',
      data
    );
    return response.data;
  }

  async uploadMyArtistAvatar(file: File): Promise<ArtistProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ArtistProfile>('/users/me/avatar', formData, uploadRequestConfig);
    return response.data;
  }

  async uploadMyArtistBanner(file: File): Promise<ArtistProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ArtistProfile>('/users/me/banner', formData, uploadRequestConfig);
    return response.data;
  }

  async getArtists(params?: ArtistListParams): Promise<PaginatedResponse<ArtistProfile>> {
    const response = await this.client.get<PaginatedResponse<ArtistProfile>>('/artists', { params });
    return response.data;
  }

  async getArtist(username: string): Promise<ArtistProfile> {
    const response = await this.client.get<ArtistProfile>(`/artists/${encodeURIComponent(username)}`);
    return response.data;
  }

  async getArtistTracks(username: string, params?: Pick<TrackListParams, 'page' | 'size' | 'sort'>): Promise<PaginatedResponse<Track>> {
    const response = await this.client.get<PaginatedResponse<Track>>(`/artists/${encodeURIComponent(username)}/tracks`, { params });
    return response.data;
  }

  async getTracks(params?: TrackListParams): Promise<PaginatedResponse<Track>> {
    const response = await this.client.get<PaginatedResponse<Track>>('/tracks', { params });
    return response.data;
  }

  async getMyTracks(params?: Pick<TrackListParams, 'page' | 'size'>): Promise<PaginatedResponse<Track>> {
    const response = await this.client.get<PaginatedResponse<Track>>('/tracks/mine', { params });
    return response.data;
  }

  async getTrack(id: number): Promise<Track> {
    const response = await this.client.get<Track>(`/tracks/${id}`);
    return response.data;
  }

  async createTrackMetadata(data: TrackMetadataPayload): Promise<Track> {
    const response = await this.client.post<Track, { data: Track }, TrackMetadataPayload>('/tracks', data);
    return response.data;
  }

  async uploadTrack(trackId: number, file: File): Promise<Track> {
    const formData = new FormData();
    formData.append('track_id', String(trackId));
    formData.append('file', file);

    const response = await this.client.post<Track>('/tracks/upload', formData, uploadRequestConfig);
    return response.data;
  }

  async uploadTrackCover(trackId: number, file: File): Promise<Track> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<Track>(`/tracks/${trackId}/cover`, formData, uploadRequestConfig);
    return response.data;
  }

  async updateTrack(id: number, data: TrackMetadataPayload): Promise<Track> {
    const response = await this.client.put<Track, { data: Track }, TrackMetadataPayload>(`/tracks/${id}`, data);
    return response.data;
  }

  async deleteTrack(id: number): Promise<void> {
    await this.client.delete(`/tracks/${id}`);
  }

  async getTrackStreamUrl(id: number, quality: StreamQuality = '320'): Promise<StreamUrlResponse> {
    const response = await this.client.get<StreamUrlResponse>(`/tracks/${id}/stream-url`, {
      params: { quality },
    });
    return response.data;
  }

  getDirectTrackStreamUrl(id: number, quality: StreamQuality): string {
    return `${API_BASE_URL}/tracks/${id}/stream?quality=${encodeURIComponent(quality)}`;
  }

  async getCategories(): Promise<Category[]> {
    const response = await this.client.get<Category[]>('/categories');
    return response.data;
  }

  async getCollections(params?: Pick<TrackListParams, 'page' | 'size'>): Promise<PaginatedResponse<Collection>> {
    const response = await this.client.get<PaginatedResponse<Collection>>('/collections', { params });
    return response.data;
  }

  async getCollection(id: number): Promise<Collection> {
    const response = await this.client.get<Collection>(`/collections/${id}`);
    return response.data;
  }

  async likeTrack(trackId: number): Promise<LikeToggleResponse> {
    const response = await this.client.post<LikeToggleResponse, { data: LikeToggleResponse }, { track_id: number }>(
      '/interactions/like',
      { track_id: trackId }
    );
    return response.data;
  }

  async unlikeTrack(trackId: number): Promise<LikeToggleResponse> {
    const response = await this.client.delete<LikeToggleResponse>('/interactions/like', {
      params: { track_id: trackId },
    });
    return response.data;
  }

  async getMyLikedTrackIds(): Promise<TrackLikeListResponse> {
    const response = await this.client.get<TrackLikeListResponse>('/interactions/likes/mine');
    return response.data;
  }

  async getMyLikedTracks(params?: Pick<TrackListParams, 'page' | 'size'>): Promise<PaginatedResponse<Track>> {
    const response = await this.client.get<PaginatedResponse<Track>>('/interactions/likes/mine/tracks', { params });
    return response.data;
  }

  async reportTrackPlay(trackId: number): Promise<TrackPlayResponse> {
    const response = await this.client.post<TrackPlayResponse, { data: TrackPlayResponse }, { track_id: number }>(
      '/interactions/play',
      { track_id: trackId }
    );
    return response.data;
  }

  async reportTrack(data: TrackReportPayload): Promise<TrackReport> {
    const response = await this.client.post<TrackReport, { data: TrackReport }, TrackReportPayload>(
      '/interactions/reports/track',
      data
    );
    return response.data;
  }

  async getAdminStats(): Promise<AdminSystemStats> {
    const response = await this.client.get<AdminSystemStats>('/admin/stats');
    return response.data;
  }

  async getAdminSiteContent(): Promise<SiteContent> {
    const response = await this.client.get<SiteContent>('/admin/site-content');
    return response.data;
  }

  async updateAdminSiteContent(data: SiteContentPayload): Promise<SiteContent> {
    const response = await this.client.put<SiteContent, { data: SiteContent }, SiteContentPayload>('/admin/site-content', data);
    return response.data;
  }

  async getAdminTracks(params?: AdminTrackListParams): Promise<PaginatedResponse<Track>> {
    const response = await this.client.get<PaginatedResponse<Track>>('/admin/moderation', { params });
    return response.data;
  }

  async getAdminReports(params?: { status?: string; page?: number; size?: number }): Promise<PaginatedResponse<TrackReport>> {
    const response = await this.client.get<PaginatedResponse<TrackReport>>('/admin/reports', { params });
    return response.data;
  }

  async resolveAdminReport(id: number, data: TrackReportResolvePayload): Promise<TrackReport> {
    const response = await this.client.post<TrackReport, { data: TrackReport }, TrackReportResolvePayload>(
      `/admin/reports/${id}/resolve`,
      data
    );
    return response.data;
  }

  async moderateTrack(trackId: number, data: TrackModerationPayload): Promise<Track> {
    const response = await this.client.post<Track, { data: Track }, TrackModerationPayload>(
      `/admin/moderate/${trackId}`,
      data
    );
    return response.data;
  }

  async getAdminCollections(params?: { page?: number; size?: number; search?: string }): Promise<PaginatedResponse<Collection>> {
    const response = await this.client.get<PaginatedResponse<Collection>>('/admin/collections', { params });
    return response.data;
  }

  async createCollection(data: CollectionPayload): Promise<Collection> {
    const response = await this.client.post<Collection, { data: Collection }, CollectionPayload>('/admin/collections', data);
    return response.data;
  }

  async updateCollection(id: number, data: Partial<CollectionPayload>): Promise<Collection> {
    const response = await this.client.put<Collection, { data: Collection }, Partial<CollectionPayload>>(
      `/admin/collections/${id}`,
      data
    );
    return response.data;
  }

  async uploadCollectionCover(id: number, file: File): Promise<Collection> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<Collection>(`/admin/collections/${id}/cover`, formData, uploadRequestConfig);
    return response.data;
  }

  async deleteCollection(id: number): Promise<void> {
    await this.client.delete(`/admin/collections/${id}`);
  }

  async addCollectionTrack(collectionId: number, trackId: number): Promise<Collection> {
    const response = await this.client.post<Collection, { data: Collection }, CollectionTrackPayload>(
      `/admin/collections/${collectionId}/tracks`,
      { track_id: trackId }
    );
    return response.data;
  }

  async removeCollectionTrack(collectionId: number, trackId: number): Promise<Collection> {
    const response = await this.client.delete<Collection>(`/admin/collections/${collectionId}/tracks/${trackId}`);
    return response.data;
  }

  async reorderCollectionTracks(collectionId: number, trackIds: number[]): Promise<Collection> {
    const response = await this.client.put<Collection, { data: Collection }, CollectionReorderPayload>(
      `/admin/collections/${collectionId}/tracks/reorder`,
      { track_ids: trackIds }
    );
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
