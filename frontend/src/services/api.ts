import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const uploadRequestConfig = {
  timeout: 0,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
} as const;

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
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token } = response.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.assign('/');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

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
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await this.client.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getTracks(params?: any) {
    const response = await this.client.get('/tracks', { params });
    return response.data;
  }

  async getMyTracks(params?: any) {
    const response = await this.client.get('/tracks/mine', { params });
    return response.data;
  }

  async getTrack(id: number) {
    const response = await this.client.get(`/tracks/${id}`);
    return response.data;
  }

  async createTrackMetadata(data: any) {
    const response = await this.client.post('/tracks', data);
    return response.data;
  }

  async uploadTrack(trackId: number, file: File) {
    const formData = new FormData();
    formData.append('track_id', String(trackId));
    formData.append('file', file);

    const response = await this.client.post('/tracks/upload', formData, uploadRequestConfig);
    return response.data;
  }

  async uploadTrackCover(trackId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/tracks/${trackId}/cover`, formData, uploadRequestConfig);
    return response.data;
  }

  async updateTrack(id: number, data: any) {
    const response = await this.client.put(`/tracks/${id}`, data);
    return response.data;
  }

  async deleteTrack(id: number) {
    await this.client.delete(`/tracks/${id}`);
  }

  async getTrackStreamUrl(id: number, quality: number | string = 320) {
    const response = await this.client.get(`/tracks/${id}/stream-url`, {
      params: { quality },
    });
    return response.data;
  }

  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  async createCategory(data: any) {
    const response = await this.client.post('/categories', data);
    return response.data;
  }

  async likeTrack(trackId: number) {
    const response = await this.client.post('/interactions/like', {
      track_id: trackId,
    });
    return response.data;
  }

  async unlikeTrack(trackId: number) {
    const response = await this.client.delete(`/interactions/like?track_id=${trackId}`);
    return response.data;
  }

  async getMyLikedTrackIds() {
    const response = await this.client.get('/interactions/likes/mine');
    return response.data;
  }

  async getMyLikedTracks(params?: any) {
    const response = await this.client.get('/interactions/likes/mine/tracks', { params });
    return response.data;
  }

  async search(query: string, filters?: any) {
    const response = await this.client.get('/tracks', {
      params: { search: query, ...filters },
    });
    return response.data;
  }

  async getSystemStats() {
    const response = await this.client.get('/admin/stats');
    return response.data;
  }

  async getModerationQueue(params?: any) {
    const response = await this.client.get('/admin/moderation', { params });
    return response.data;
  }

  async getAdminLogs(params?: any) {
    const response = await this.client.get('/admin/logs', { params });
    return response.data;
  }

  async moderateTrack(trackId: number, data: any) {
    const response = await this.client.post(`/admin/moderate/${trackId}`, data);
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
