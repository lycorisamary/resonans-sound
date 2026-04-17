import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle token expiration
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, username: string) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      username,
    });
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  // User endpoints
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateUser(data: any) {
    const response = await this.client.put('/users/me', data);
    return response.data;
  }

  async getUserById(id: number) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  // Track endpoints
  async getTracks(params?: any) {
    const response = await this.client.get('/tracks', { params });
    return response.data;
  }

  async getTrack(id: number) {
    const response = await this.client.get(`/tracks/${id}`);
    return response.data;
  }

  async createTrack(data: FormData) {
    const response = await this.client.post('/tracks/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateTrack(id: number, data: any) {
    const response = await this.client.put(`/tracks/${id}`, data);
    return response.data;
  }

  async deleteTrack(id: number) {
    await this.client.delete(`/tracks/${id}`);
  }

  async streamTrack(id: number, quality: number = 320) {
    // Return the stream URL - actual streaming is handled by browser
    return `${API_BASE_URL}/tracks/${id}/stream?quality=${quality}`;
  }

  // Category endpoints
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/categories', data);
    return response.data;
  }

  // Playlist endpoints
  async getPlaylists() {
    const response = await this.client.get('/playlists');
    return response.data;
  }

  async getPlaylist(id: number) {
    const response = await this.client.get(`/playlists/${id}`);
    return response.data;
  }

  async createPlaylist(data: any) {
    const response = await this.client.post('/playlists', data);
    return response.data;
  }

  async addTrackToPlaylist(playlistId: number, trackId: number) {
    const response = await this.client.post(`/playlists/${playlistId}/tracks`, {
      track_id: trackId,
    });
    return response.data;
  }

  async removeTrackFromPlaylist(playlistId: number, trackId: number) {
    await this.client.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  }

  // Interaction endpoints
  async likeTrack(trackId: number) {
    const response = await this.client.post('/interactions/like', {
      track_id: trackId,
    });
    return response.data;
  }

  async unlikeTrack(trackId: number) {
    await this.client.delete(`/interactions/like?track_id=${trackId}`);
  }

  async addComment(trackId: number, content: string, parentId?: number) {
    const response = await this.client.post('/interactions/comment', {
      track_id: trackId,
      content,
      parent_id: parentId,
    });
    return response.data;
  }

  async getComments(trackId: number) {
    const response = await this.client.get(`/tracks/${trackId}/comments`);
    return response.data;
  }

  // Follow endpoints
  async followUser(userId: number) {
    const response = await this.client.post('/interactions/follow', {
      following_id: userId,
    });
    return response.data;
  }

  async unfollowUser(userId: number) {
    await this.client.delete(`/interactions/follow?following_id=${userId}`);
  }

  // Search
  async search(query: string, filters?: any) {
    const response = await this.client.get('/tracks/search', {
      params: { q: query, ...filters },
    });
    return response.data;
  }

  // Admin endpoints
  async getSystemStats() {
    const response = await this.client.get('/admin/stats');
    return response.data;
  }

  async getUsersForModeration(params?: any) {
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }

  async moderateUser(userId: number, data: any) {
    const response = await this.client.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  async getModerationQueue(params?: any) {
    const response = await this.client.get('/admin/moderation', { params });
    return response.data;
  }

  async moderateTrack(trackId: number, data: any) {
    const response = await this.client.post(`/admin/moderate/${trackId}`, data);
    return response.data;
  }

  // Report
  async createReport(data: any) {
    const response = await this.client.post('/reports', data);
    return response.data;
  }

  // Notifications
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationAsRead(notificationId: number) {
    await this.client.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    await this.client.put('/notifications/read-all');
  }
}

export const api = new ApiClient();
export default api;
