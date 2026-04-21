import { create } from 'zustand';

import {
  AuthMode,
  CatalogSort,
  CatalogView,
  Category,
  HealthResponse,
  StreamQuality,
  Track,
  TrackFormState,
  User,
} from '@/shared/api/types';

export const initialTrackForm: TrackFormState = {
  title: '',
  description: '',
  genre: '',
  category_id: '',
  is_downloadable: false,
  license_type: 'all-rights-reserved',
  tags: '',
  bpm: '',
  key_signature: '',
};

interface AppStatusState {
  health: HealthResponse | null;
  initialLoading: boolean;
  pageError: string | null;
  banner: string | null;
  setHealth: (health: HealthResponse | null) => void;
  setInitialLoading: (initialLoading: boolean) => void;
  setPageError: (pageError: string | null) => void;
  setBanner: (banner: string | null) => void;
}

interface AuthState {
  authMode: AuthMode;
  authBusy: boolean;
  user: User | null;
  setAuthMode: (authMode: AuthMode) => void;
  setAuthBusy: (authBusy: boolean) => void;
  setUser: (user: User | null) => void;
}

interface CatalogState {
  catalogBusy: boolean;
  catalogView: CatalogView;
  categories: Category[];
  publicTracks: Track[];
  likedTracks: Track[];
  myTracks: Track[];
  selectedCategory: string;
  catalogSearchInput: string;
  catalogSearch: string;
  catalogSort: CatalogSort;
  likedTrackIds: number[];
  setCatalogBusy: (catalogBusy: boolean) => void;
  setCatalogView: (catalogView: CatalogView) => void;
  setCategories: (categories: Category[]) => void;
  setPublicTracks: (publicTracks: Track[]) => void;
  setLikedTracks: (likedTracks: Track[]) => void;
  setMyTracks: (myTracks: Track[]) => void;
  setSelectedCategory: (selectedCategory: string) => void;
  setCatalogSearchInput: (catalogSearchInput: string) => void;
  setCatalogSearch: (catalogSearch: string) => void;
  setCatalogSort: (catalogSort: CatalogSort) => void;
  setLikedTrackIds: (likedTrackIds: number[]) => void;
}

interface PlayerState {
  activeTrack: Track | null;
  activeTrackId: number | null;
  playerQuality: StreamQuality;
  isPlaying: boolean;
  playerLoading: boolean;
  playerError: string | null;
  playerCurrentTime: number;
  playerDuration: number;
  setActiveTrack: (activeTrack: Track | null) => void;
  setActiveTrackId: (activeTrackId: number | null) => void;
  setPlayerQuality: (playerQuality: StreamQuality) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayerLoading: (playerLoading: boolean) => void;
  setPlayerError: (playerError: string | null) => void;
  setPlayerCurrentTime: (playerCurrentTime: number) => void;
  setPlayerDuration: (playerDuration: number) => void;
  resetPlayer: () => void;
}

interface StudioState {
  studioBusy: boolean;
  editingTrackId: number | null;
  uploadingTrackId: number | null;
  uploadingCoverTrackId: number | null;
  trackForm: TrackFormState;
  setStudioBusy: (studioBusy: boolean) => void;
  setEditingTrackId: (editingTrackId: number | null) => void;
  setUploadingTrackId: (uploadingTrackId: number | null) => void;
  setUploadingCoverTrackId: (uploadingCoverTrackId: number | null) => void;
  setTrackForm: (trackForm: TrackFormState) => void;
  updateTrackForm: (patch: Partial<TrackFormState>) => void;
  resetTrackForm: () => void;
}

export const useAppStatusStore = create<AppStatusState>((set) => ({
  health: null,
  initialLoading: true,
  pageError: null,
  banner: null,
  setHealth: (health) => set({ health }),
  setInitialLoading: (initialLoading) => set({ initialLoading }),
  setPageError: (pageError) => set({ pageError }),
  setBanner: (banner) => set({ banner }),
}));

export const useAuthStore = create<AuthState>((set) => ({
  authMode: 'login',
  authBusy: false,
  user: null,
  setAuthMode: (authMode) => set({ authMode }),
  setAuthBusy: (authBusy) => set({ authBusy }),
  setUser: (user) => set({ user }),
}));

export const useCatalogStore = create<CatalogState>((set) => ({
  catalogBusy: false,
  catalogView: 'catalog',
  categories: [],
  publicTracks: [],
  likedTracks: [],
  myTracks: [],
  selectedCategory: 'all',
  catalogSearchInput: '',
  catalogSearch: '',
  catalogSort: 'newest',
  likedTrackIds: [],
  setCatalogBusy: (catalogBusy) => set({ catalogBusy }),
  setCatalogView: (catalogView) => set({ catalogView }),
  setCategories: (categories) => set({ categories }),
  setPublicTracks: (publicTracks) => set({ publicTracks }),
  setLikedTracks: (likedTracks) => set({ likedTracks }),
  setMyTracks: (myTracks) => set({ myTracks }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setCatalogSearchInput: (catalogSearchInput) => set({ catalogSearchInput }),
  setCatalogSearch: (catalogSearch) => set({ catalogSearch }),
  setCatalogSort: (catalogSort) => set({ catalogSort }),
  setLikedTrackIds: (likedTrackIds) => set({ likedTrackIds }),
}));

export const usePlayerStore = create<PlayerState>((set) => ({
  activeTrack: null,
  activeTrackId: null,
  playerQuality: '320',
  isPlaying: false,
  playerLoading: false,
  playerError: null,
  playerCurrentTime: 0,
  playerDuration: 0,
  setActiveTrack: (activeTrack) => set({ activeTrack }),
  setActiveTrackId: (activeTrackId) => set({ activeTrackId }),
  setPlayerQuality: (playerQuality) => set({ playerQuality }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlayerLoading: (playerLoading) => set({ playerLoading }),
  setPlayerError: (playerError) => set({ playerError }),
  setPlayerCurrentTime: (playerCurrentTime) => set({ playerCurrentTime }),
  setPlayerDuration: (playerDuration) => set({ playerDuration }),
  resetPlayer: () =>
    set({
      activeTrack: null,
      activeTrackId: null,
      isPlaying: false,
      playerLoading: false,
      playerError: null,
      playerCurrentTime: 0,
      playerDuration: 0,
    }),
}));

export const useStudioStore = create<StudioState>((set) => ({
  studioBusy: false,
  editingTrackId: null,
  uploadingTrackId: null,
  uploadingCoverTrackId: null,
  trackForm: initialTrackForm,
  setStudioBusy: (studioBusy) => set({ studioBusy }),
  setEditingTrackId: (editingTrackId) => set({ editingTrackId }),
  setUploadingTrackId: (uploadingTrackId) => set({ uploadingTrackId }),
  setUploadingCoverTrackId: (uploadingCoverTrackId) => set({ uploadingCoverTrackId }),
  setTrackForm: (trackForm) => set({ trackForm }),
  updateTrackForm: (patch) => set((state) => ({ trackForm: { ...state.trackForm, ...patch } })),
  resetTrackForm: () => set({ editingTrackId: null, trackForm: initialTrackForm }),
}));
