import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';

import api from './services/api';
import {
  AuthTokens,
  Category,
  LikeToggleResponse,
  PaginatedResponse,
  StreamUrlResponse,
  Track,
  TrackLikeListResponse,
  User,
} from './types';


type HealthResponse = {
  status: string;
  version: string;
};

type AuthMode = 'login' | 'register';
type CatalogView = 'catalog' | 'liked';
type StreamQuality = '128' | '320' | 'original';
type CatalogSort = 'newest' | 'popular' | 'title';
type OwnerTrackStateTone = 'info' | 'warning' | 'success' | 'error';

type TrackFormState = {
  title: string;
  description: string;
  genre: string;
  category_id: string;
  is_downloadable: boolean;
  license_type: string;
  tags: string;
  bpm: string;
  key_signature: string;
};

const initialTrackForm: TrackFormState = {
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

const artworkColors = ['#0f766e', '#f97316', '#1d4ed8', '#be123c', '#6d28d9'];


function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}


function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { data?: { detail?: unknown } };
      message?: unknown;
    };

    if (typeof maybeError.response?.data?.detail === 'string') {
      return maybeError.response.data.detail;
    }

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }
  }

  return fallback;
}


function saveTokens(tokens: AuthTokens) {
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}


function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}


function getTrackStatusColor(status: Track['status']): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved') {
    return 'success';
  }

  if (status === 'pending' || status === 'processing') {
    return 'warning';
  }

  if (status === 'rejected' || status === 'deleted') {
    return 'error';
  }

  return 'default';
}


function getOwnerTrackState(track: Track): { tone: OwnerTrackStateTone; title: string; description: string } {
  const hasMedia = Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);

  if (track.status === 'deleted') {
    return {
      tone: 'error',
      title: 'Трек снят с публикации',
      description: 'Этот трек переведён в deleted и больше не отображается в живом каталоге.',
    };
  }

  if (track.status === 'processing') {
    return {
      tone: 'warning',
      title: 'Идёт media processing',
      description: 'Сервис принял исходник и сейчас готовит MP3-версии и waveform для плеера.',
    };
  }

  if (track.status === 'rejected') {
    return {
      tone: 'error',
      title: 'Обработка завершилась с ошибкой',
      description: 'Исправьте файл или загрузите новый source, чтобы снова запустить processing.',
    };
  }

  if (track.status === 'approved') {
    return {
      tone: 'success',
      title: 'Трек опубликован автоматически',
      description: 'После успешной обработки запись сразу стала доступна в каталоге и в общем плеере.',
    };
  }

  if (track.status === 'pending' && !hasMedia) {
    return {
      tone: 'info',
      title: 'Ждёт исходный файл',
      description: 'Metadata уже сохранено. Следующий шаг: загрузить MP3 или WAV, чтобы трек дошёл до публикации.',
    };
  }

  return {
    tone: 'warning',
    title: 'Переходное состояние',
    description: 'Трек выглядит как legacy pending-запись. Загрузите новый source, чтобы привести его к актуальному flow.',
  };
}


function TrackArtwork({
  track,
  size = 88,
  radius = 24,
}: {
  track: Track;
  size?: number;
  radius?: number;
}) {
  const accent = artworkColors[track.id % artworkColors.length];
  const fallbackLabel = (track.title || 'R').slice(0, 1).toUpperCase();

  if (track.cover_image_url) {
    return (
      <Box
        component="img"
        src={track.cover_image_url}
        alt={`Обложка ${track.title}`}
        sx={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: `${radius}px`,
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 16px 32px rgba(15,23,42,0.12)',
          flexShrink: 0,
          backgroundColor: '#f8fafc',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        background: `linear-gradient(135deg, ${alpha(accent, 0.94)} 0%, ${alpha('#111827', 0.88)} 100%)`,
        color: '#fff7ed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(24, Math.round(size * 0.28)),
        fontWeight: 800,
        letterSpacing: '-0.04em',
        boxShadow: '0 16px 32px rgba(15,23,42,0.14)',
        flexShrink: 0,
      }}
    >
      {fallbackLabel}
    </Box>
  );
}


function WaveformPreview({ track, active }: { track: Track; active: boolean }) {
  const samples = Array.isArray(track.waveform_data_json?.samples) ? track.waveform_data_json.samples : [];
  if (samples.length === 0) {
    return (
      <Box
        sx={{
          height: 56,
          borderRadius: 999,
          border: '1px dashed rgba(15,118,110,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: 12,
          bgcolor: 'rgba(255,255,255,0.5)',
        }}
      >
        Waveform появится после media processing.
      </Box>
    );
  }

  const step = Math.max(1, Math.floor(samples.length / 64));
  const downsampled = samples.filter((_: number, index: number) => index % step === 0).slice(0, 64);

  return (
    <Stack
      direction="row"
      spacing={0.35}
      alignItems="end"
      sx={{
        height: 56,
        px: 1.25,
        py: 0.75,
        borderRadius: 999,
        bgcolor: active ? 'rgba(15,118,110,0.12)' : 'rgba(15,23,42,0.04)',
        border: '1px solid rgba(15,118,110,0.12)',
      }}
    >
      {downsampled.map((value: number, index: number) => (
        <Box
          key={`${track.id}-${index}`}
          sx={{
            width: 4,
            minHeight: 6,
            height: `${Math.max(10, Math.round(Number(value || 0) * 100))}%`,
            borderRadius: 999,
            bgcolor: active ? '#0f766e' : 'rgba(15,118,110,0.38)',
            flexShrink: 0,
          }}
        />
      ))}
    </Stack>
  );
}


export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [catalogView, setCatalogView] = useState<CatalogView>('catalog');
  const [authBusy, setAuthBusy] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [catalogSearchInput, setCatalogSearchInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSort, setCatalogSort] = useState<CatalogSort>('newest');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [trackForm, setTrackForm] = useState<TrackFormState>(initialTrackForm);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [uploadingTrackId, setUploadingTrackId] = useState<number | null>(null);
  const [uploadingCoverTrackId, setUploadingCoverTrackId] = useState<number | null>(null);
  const [likedTrackIds, setLikedTrackIds] = useState<number[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [playerQuality, setPlayerQuality] = useState<StreamQuality>('320');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isStaff = user?.role === 'moderator' || user?.role === 'admin';
  const displayedTracks = catalogView === 'liked' ? likedTracks : publicTracks;

  const loadPublicCatalog = async (
    overrides: {
      category?: string;
      search?: string;
      sort?: CatalogSort;
    } = {}
  ) => {
    setCatalogBusy(true);
    try {
      const category = overrides.category ?? selectedCategory;
      const search = overrides.search ?? catalogSearch;
      const sort = overrides.sort ?? catalogSort;
      const [categoriesResponse, tracksResponse] = await Promise.all([
        api.getCategories(),
        api.getTracks({
          ...(category === 'all' ? {} : { category }),
          ...(search ? { search } : {}),
          sort,
        }),
      ]);

      setCategories(categoriesResponse as Category[]);
      setPublicTracks((tracksResponse as PaginatedResponse<Track>).items);
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось загрузить каталог'));
    } finally {
      setCatalogBusy(false);
    }
  };

  const loadAuthenticatedState = async () => {
    const [currentUser, myTracksResponse, likedTracksResponse, likedTrackIdsResponse] = await Promise.all([
      api.getCurrentUser(),
      api.getMyTracks({ size: 100 }),
      api.getMyLikedTracks({ size: 100 }),
      api.getMyLikedTrackIds(),
    ]);

    setUser(currentUser as User);
    setMyTracks((myTracksResponse as PaginatedResponse<Track>).items);
    setLikedTracks((likedTracksResponse as PaginatedResponse<Track>).items);
    setLikedTrackIds((likedTrackIdsResponse as TrackLikeListResponse).track_ids);
  };

  const refreshWholeUi = async () => {
    await loadPublicCatalog();
    if (localStorage.getItem('access_token')) {
      await loadAuthenticatedState();
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const healthResponse = await fetch('/api/v1/health');
        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        await loadPublicCatalog({ category: 'all' });

        if (localStorage.getItem('access_token')) {
          try {
            await loadAuthenticatedState();
          } catch {
            clearTokens();
            setUser(null);
            setMyTracks([]);
            setLikedTracks([]);
            setLikedTrackIds([]);
          }
        }
      } catch (err) {
        setPageError(getErrorMessage(err, 'Не удалось загрузить приложение'));
      } finally {
        setInitialLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (initialLoading) {
      return;
    }

    void loadPublicCatalog();
  }, [selectedCategory, catalogSearch, catalogSort, initialLoading]);

  useEffect(() => {
    if (!activeTrackId) {
      return;
    }

    const latestTrack =
      myTracks.find((track) => track.id === activeTrackId) ??
      publicTracks.find((track) => track.id === activeTrackId) ??
      likedTracks.find((track) => track.id === activeTrackId);

    if (latestTrack) {
      setActiveTrack(latestTrack);
    }
  }, [activeTrackId, myTracks, publicTracks, likedTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onLoadStart = () => {
      setPlayerLoading(true);
      setPlayerError(null);
    };
    const onLoadedMetadata = () => {
      setPlayerDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setPlayerLoading(false);
    };
    const onTimeUpdate = () => setPlayerCurrentTime(audio.currentTime || 0);
    const onPlay = () => {
      setIsPlaying(true);
      setPlayerLoading(false);
      setPlayerError(null);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPlayerCurrentTime(0);
    };
    const onWaiting = () => setPlayerLoading(true);
    const onCanPlay = () => setPlayerLoading(false);
    const onError = () => {
      setIsPlaying(false);
      setPlayerLoading(false);
      setPlayerError('Не удалось загрузить поток. Проверьте, что трек уже обработан и для него есть готовый audio-asset.');
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const stopAndResetAudio = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.removeAttribute('src');
    delete audio.dataset.streamUrl;
    delete audio.dataset.trackId;
    delete audio.dataset.streamQuality;
    audio.load();
    setPlayerCurrentTime(0);
    setPlayerDuration(0);
    setIsPlaying(false);
    setPlayerLoading(false);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const tokens = (await api.login(loginEmail, loginPassword)) as AuthTokens;
      saveTokens(tokens);
      await loadAuthenticatedState();
      setBanner('Сессия открыта. Теперь можно создавать треки, загружать source и работать с лайками.');
      setLoginPassword('');
      setCatalogView('catalog');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось выполнить вход'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const tokens = (await api.register(registerEmail, registerPassword, registerUsername)) as AuthTokens;
      saveTokens(tokens);
      await loadAuthenticatedState();
      setBanner('Аккаунт создан, сессия уже открыта.');
      setRegisterPassword('');
      setCatalogView('catalog');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось создать аккаунт'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.logout();
    } finally {
      stopAndResetAudio();
      clearTokens();
      setUser(null);
      setMyTracks([]);
      setLikedTracks([]);
      setLikedTrackIds([]);
      setEditingTrackId(null);
      setTrackForm(initialTrackForm);
      setActiveTrack(null);
      setActiveTrackId(null);
      setPlayerError(null);
      setAuthBusy(false);
      setCatalogView('catalog');
    }
  };

  const handleTrackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    setStudioBusy(true);
    setPageError(null);
    setBanner(null);

    const payload = {
      title: trackForm.title,
      description: trackForm.description || null,
      genre: trackForm.genre || null,
      category_id: trackForm.category_id ? Number(trackForm.category_id) : null,
      is_downloadable: trackForm.is_downloadable,
      license_type: trackForm.license_type,
      tags: trackForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      bpm: trackForm.bpm ? Number(trackForm.bpm) : null,
      key_signature: trackForm.key_signature || null,
    };

    try {
      if (editingTrackId) {
        await api.updateTrack(editingTrackId, payload);
        setBanner('Metadata обновлено.');
      } else {
        await api.createTrackMetadata(payload);
        setBanner('Metadata создано. Теперь загрузите MP3 или WAV, чтобы трек автоматически дошёл до публикации.');
      }

      setEditingTrackId(null);
      setTrackForm(initialTrackForm);
      await refreshWholeUi();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось сохранить metadata трека'));
    } finally {
      setStudioBusy(false);
    }
  };

  const startEditingTrack = (track: Track) => {
    setEditingTrackId(track.id);
    setTrackForm({
      title: track.title,
      description: track.description ?? '',
      genre: track.genre ?? '',
      category_id: track.category_id ? String(track.category_id) : '',
      is_downloadable: track.is_downloadable,
      license_type: track.license_type,
      tags: track.tags?.join(', ') ?? '',
      bpm: track.bpm ? String(track.bpm) : '',
      key_signature: track.key_signature ?? '',
    });
  };

  const handleDeleteTrack = async (track: Track) => {
    const isDeletingOtherUsersTrack = user ? user.id !== track.user_id : false;
    const confirmMessage = isDeletingOtherUsersTrack
      ? `Удалить чужой трек "${track.title}"?`
      : `Удалить трек "${track.title}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setStudioBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.deleteTrack(track.id);
      if (editingTrackId === track.id) {
        setEditingTrackId(null);
        setTrackForm(initialTrackForm);
      }
      if (activeTrackId === track.id) {
        stopAndResetAudio();
        setActiveTrack(null);
        setActiveTrackId(null);
      }

      setBanner(
        isDeletingOtherUsersTrack
          ? `Трек "${track.title}" удалён по staff-праву.`
          : `Трек "${track.title}" переведён в deleted и снят с витрины.`
      );
      await refreshWholeUi();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось удалить трек'));
    } finally {
      setStudioBusy(false);
    }
  };

  const handleTrackUpload = async (track: Track, file: File | null) => {
    if (!file) {
      return;
    }

    setStudioBusy(true);
    setUploadingTrackId(track.id);
    setPageError(null);
    setBanner(null);

    try {
      await api.uploadTrack(track.id, file);
      setBanner(`Source для "${track.title}" принят. Сейчас начнётся processing, после которого трек опубликуется автоматически.`);
      await refreshWholeUi();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось загрузить аудиофайл'));
    } finally {
      setUploadingTrackId(null);
      setStudioBusy(false);
    }
  };

  const handleCoverUpload = async (track: Track, file: File | null) => {
    if (!file) {
      return;
    }

    setStudioBusy(true);
    setUploadingCoverTrackId(track.id);
    setPageError(null);
    setBanner(null);

    try {
      await api.uploadTrackCover(track.id, file);
      setBanner(`Обложка для "${track.title}" загружена.`);
      await refreshWholeUi();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось загрузить обложку'));
    } finally {
      setUploadingCoverTrackId(null);
      setStudioBusy(false);
    }
  };

  const canUploadTrackMedia = (track: Track) =>
    track.status === 'pending' || track.status === 'rejected' || track.status === 'approved';

  const hasPlayableMedia = (track: Track) => Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
  const isTrackLiked = (trackId: number) => likedTrackIds.includes(trackId);
  const canDeleteTrack = (track: Track) => Boolean(user && (user.id === track.user_id || isStaff));

  const resolvePlayableQuality = (track: Track, preferredQuality: StreamQuality): StreamQuality | null => {
    if (preferredQuality === 'original' && track.original_url) {
      return 'original';
    }
    if (preferredQuality === '320' && track.mp3_320_url) {
      return '320';
    }
    if (preferredQuality === '128' && track.mp3_128_url) {
      return '128';
    }
    if (track.mp3_320_url) {
      return '320';
    }
    if (track.mp3_128_url) {
      return '128';
    }
    if (track.original_url) {
      return 'original';
    }
    return null;
  };

  const handleCatalogSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCatalogSearch(catalogSearchInput.trim());
  };

  const handlePlayTrack = async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      setPlayerError(null);
      const quality = resolvePlayableQuality(track, playerQuality);
      if (!quality) {
        throw new Error('Для этого трека пока нет готового аудио-ассета для воспроизведения.');
      }

      const loadedTrackId = Number(audio.dataset.trackId ?? '0');
      const loadedQuality = audio.dataset.streamQuality as StreamQuality | undefined;
      const shouldReuseCurrentSource = loadedTrackId === track.id && loadedQuality === quality && Boolean(audio.src);

      if (activeTrackId === track.id && isPlaying && shouldReuseCurrentSource) {
        audio.pause();
        return;
      }

      if (!shouldReuseCurrentSource) {
        setPlayerLoading(true);
        const streamResponse = (await api.getTrackStreamUrl(track.id, quality)) as StreamUrlResponse;
        audio.pause();
        audio.src = streamResponse.url;
        audio.dataset.streamUrl = streamResponse.url;
        audio.dataset.trackId = String(track.id);
        audio.dataset.streamQuality = quality;
        audio.load();
        setPlayerCurrentTime(0);
        setPlayerDuration(track.duration_seconds ?? 0);
      }

      setActiveTrackId(track.id);
      setActiveTrack(track);

      try {
        await audio.play();
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          throw err;
        }
      }
    } catch (err) {
      setPlayerLoading(false);
      setPlayerError(getErrorMessage(err, 'Не удалось запустить воспроизведение'));
    }
  };

  const handleToggleLike = async (track: Track) => {
    if (!user) {
      setPageError('Чтобы ставить лайки, сначала откройте сессию.');
      return;
    }

    try {
      const liked = isTrackLiked(track.id);
      const response = liked
        ? ((await api.unlikeTrack(track.id)) as LikeToggleResponse)
        : ((await api.likeTrack(track.id)) as LikeToggleResponse);

      setLikedTrackIds((current) =>
        response.liked ? Array.from(new Set([...current, track.id])) : current.filter((value) => value !== track.id)
      );

      const applyLikeCount = (items: Track[]) =>
        items.map((item) => (item.id === track.id ? { ...item, like_count: response.like_count } : item));

      setPublicTracks((current) => applyLikeCount(current));
      setMyTracks((current) => applyLikeCount(current));
      setLikedTracks((current) => {
        const updatedCurrent = applyLikeCount(current);
        if (response.liked) {
          const updatedTrack = { ...track, like_count: response.like_count };
          return [updatedTrack, ...updatedCurrent.filter((item) => item.id !== track.id)];
        }
        return updatedCurrent.filter((item) => item.id !== track.id);
      });
      setActiveTrack((current) => (current?.id === track.id ? { ...current, like_count: response.like_count } : current));
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось обновить лайк'));
    }
  };

  const renderTrackCard = (track: Track, variant: 'catalog' | 'mine') => {
    const ownerState = getOwnerTrackState(track);
    const deleteAllowed = canDeleteTrack(track);
    const active = activeTrackId === track.id && (isPlaying || playerLoading);

    return (
      <Card
        key={`${variant}-${track.id}`}
        variant="outlined"
        sx={{
          borderRadius: 6,
          borderColor: active ? alpha('#0f766e', 0.35) : 'rgba(15,23,42,0.08)',
          boxShadow: active ? '0 22px 44px rgba(15,118,110,0.12)' : 'none',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TrackArtwork track={track} size={variant === 'mine' ? 112 : 96} radius={variant === 'mine' ? 28 : 24} />

              <Stack spacing={1.25} flex={1} minWidth={0}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.05 }}>
                      {track.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {track.user?.username ?? 'Unknown artist'} • {track.category?.name ?? 'Без категории'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Chip label={track.status} color={getTrackStatusColor(track.status)} size="small" />
                    <Chip label={`Likes ${track.like_count}`} variant="outlined" size="small" />
                    <Chip label={`Plays ${track.play_count}`} variant="outlined" size="small" />
                  </Stack>
                </Stack>

                {variant === 'mine' ? (
                  <Alert severity={ownerState.tone}>
                    <strong>{ownerState.title}</strong> {ownerState.description}
                  </Alert>
                ) : null}

                {track.description ? (
                  <Typography sx={{ color: 'text.secondary' }}>{track.description}</Typography>
                ) : (
                  <Typography sx={{ color: 'text.secondary' }}>
                    {track.genre ? `${track.genre}. ` : ''}Трек уже подключён к live API и доступен для воспроизведения.
                  </Typography>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Duration ${formatTime(track.duration_seconds ?? 0)}`} size="small" variant="outlined" />
                  <Chip label={`BPM ${track.bpm ?? '-'}`} size="small" variant="outlined" />
                  <Chip label={`Теги ${track.tags?.join(', ') || '-'}`} size="small" variant="outlined" />
                  <Chip
                    label={track.cover_image_url ? 'Cover ready' : 'Cover missing'}
                    size="small"
                    variant="outlined"
                    color={track.cover_image_url ? 'success' : 'default'}
                  />
                  {variant === 'mine' ? (
                    <>
                      <Chip
                        label={track.original_url ? 'Source uploaded' : 'Source missing'}
                        size="small"
                        variant="outlined"
                        color={track.original_url ? 'success' : 'default'}
                      />
                      <Chip
                        label={track.mp3_320_url ? '320 ready' : '320 pending'}
                        size="small"
                        variant="outlined"
                        color={track.mp3_320_url ? 'success' : 'default'}
                      />
                    </>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>

            <WaveformPreview track={track} active={active} />

            {variant === 'mine' && track.rejection_reason ? <Alert severity="error">{track.rejection_reason}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={activeTrackId === track.id && isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                  onClick={() => void handlePlayTrack(track)}
                  disabled={!hasPlayableMedia(track)}
                >
                  {activeTrackId === track.id && isPlaying ? 'Пауза' : variant === 'mine' ? 'Проверить playback' : 'Слушать'}
                </Button>

                {variant === 'catalog' ? (
                  <Button
                    variant={isTrackLiked(track.id) ? 'contained' : 'outlined'}
                    color="error"
                    size="small"
                    startIcon={isTrackLiked(track.id) ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                    onClick={() => void handleToggleLike(track)}
                    disabled={!user}
                  >
                    {track.like_count}
                  </Button>
                ) : null}

                {variant === 'mine' ? (
                  <>
                    <Button variant="outlined" size="small" onClick={() => startEditingTrack(track)}>
                      Редактировать
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={<PhotoCameraRoundedIcon />}
                      disabled={studioBusy}
                    >
                      {uploadingCoverTrackId === track.id ? 'Загружаем cover...' : track.cover_image_url ? 'Заменить cover' : 'Загрузить cover'}
                      <input
                        hidden
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleCoverUpload(track, file);
                          event.target.value = '';
                        }}
                      />
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      component="label"
                      startIcon={<CloudUploadRoundedIcon />}
                      disabled={studioBusy || !canUploadTrackMedia(track)}
                    >
                      {uploadingTrackId === track.id ? 'Загружаем audio...' : track.original_url ? 'Replace audio' : 'Upload audio'}
                      <input
                        hidden
                        type="file"
                        accept=".mp3,.wav,audio/mpeg,audio/wav"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleTrackUpload(track, file);
                          event.target.value = '';
                        }}
                      />
                    </Button>
                  </>
                ) : null}
              </Stack>

              {deleteAllowed ? (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => void handleDeleteTrack(track)}
                >
                  Удалить
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(15,118,110,0.18), transparent 28%), radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 30%), linear-gradient(180deg, #f8f2e8 0%, #f5ede0 40%, #f3f4f6 100%)',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3.5}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 8,
              border: '1px solid rgba(15,118,110,0.12)',
              overflow: 'hidden',
              position: 'relative',
              background:
                'linear-gradient(135deg, rgba(255,249,240,0.96) 0%, rgba(255,255,255,0.92) 46%, rgba(236,253,245,0.94) 100%)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                right: -80,
                top: -80,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(15,118,110,0.18) 0%, rgba(15,118,110,0) 70%)',
                pointerEvents: 'none',
              }}
            />

            <Stack spacing={3.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                  <Chip label="Resonance Sound" sx={{ fontWeight: 800, bgcolor: '#d7f5ef', color: '#115e59' }} />
                  <Chip label="Live production" variant="outlined" color="success" />
                  <Chip label="Auto-publish enabled" variant="outlined" color="primary" />
                  <Chip label="Cover uploads enabled" variant="outlined" color="secondary" />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Chip label={user ? `Сессия: ${user.username}` : 'Гость'} color={user ? 'success' : 'default'} />
                  {health ? <Chip label={`API ${health.status}`} color="success" variant="outlined" /> : null}
                </Stack>
              </Stack>

              <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} justifyContent="space-between">
                <Box sx={{ maxWidth: 860 }}>
                  <Typography variant="h1" sx={{ fontSize: { xs: '2.7rem', md: '4.8rem' }, lineHeight: 0.92 }}>
                    Рабочая сцена
                    <br />
                    аудио MVP
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 2, maxWidth: 760, color: 'text.secondary', lineHeight: 1.45 }}>
                    Платформа уже умеет создавать треки, загружать source, автоматически публиковать их после обработки,
                    воспроизводить в общем плеере, хранить обложки и собирать первые сигналы через лайки.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignSelf="flex-start">
                  <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 5, minWidth: 130 }}>
                    <Typography variant="overline" color="text.secondary">
                      Каталог
                    </Typography>
                    <Typography variant="h4">{publicTracks.length}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 5, minWidth: 130 }}>
                    <Typography variant="overline" color="text.secondary">
                      Лайкнуто
                    </Typography>
                    <Typography variant="h4">{likedTrackIds.length}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 5, minWidth: 130 }}>
                    <Typography variant="overline" color="text.secondary">
                      Мои треки
                    </Typography>
                    <Typography variant="h4">{myTracks.length}</Typography>
                  </Paper>
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          {initialLoading ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={22} />
              <Typography>Поднимаем live-контекст приложения...</Typography>
            </Stack>
          ) : null}

          {pageError ? <Alert severity="error">{pageError}</Alert> : null}
          {banner ? <Alert severity="success">{banner}</Alert> : null}

          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
            <Paper
              variant="outlined"
              sx={{
                flex: 1.35,
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 7,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.9) 100%)',
              }}
            >
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h4">Единый player flow</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
                      Плеер работает поверх live API, автоматически берёт доступный stream quality и не требует отдельной
                      ручной модерации для публикации.
                    </Typography>
                  </Box>
                  <TextField
                    select
                    label="Качество"
                    value={playerQuality}
                    onChange={(event) => setPlayerQuality(event.target.value as StreamQuality)}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="128">128 kbps</MenuItem>
                    <MenuItem value="320">320 kbps</MenuItem>
                    <MenuItem value="original">Original</MenuItem>
                  </TextField>
                </Stack>

                {playerError ? <Alert severity="error">{playerError}</Alert> : null}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  <TrackArtwork track={activeTrack ?? { id: 0, title: 'R', user_id: 0, is_public: true, is_downloadable: false, license_type: 'all-rights-reserved', status: 'approved', created_at: '', updated_at: '', play_count: 0, like_count: 0, comment_count: 0 }} size={160} radius={40} />

                  <Stack spacing={2} flex={1}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="h5">{activeTrack?.title ?? 'Выберите трек из каталога'}</Typography>
                        <Typography color="text.secondary">
                          {activeTrack
                            ? `${activeTrack.user?.username ?? 'Unknown artist'} • ${activeTrack.category?.name ?? 'Без категории'}`
                            : 'После выбора трека здесь появятся обложка, прогресс и текущая длительность.'}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={
                            playerLoading
                              ? 'Подключаем поток'
                              : isPlaying
                                ? 'Сейчас играет'
                                : activeTrackId
                                  ? 'Готов к продолжению'
                                  : 'Idle'
                          }
                          color={playerLoading ? 'warning' : isPlaying ? 'success' : 'default'}
                          variant={playerLoading || isPlaying ? 'filled' : 'outlined'}
                        />
                        <Chip label={`Quality ${playerQuality}`} variant="outlined" />
                      </Stack>
                    </Stack>

                    <audio ref={audioRef} controls style={{ width: '100%' }} />

                    <LinearProgress
                      variant={playerDuration > 0 ? 'determinate' : 'indeterminate'}
                      value={playerDuration > 0 ? Math.min(100, (playerCurrentTime / playerDuration) * 100) : 0}
                      sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(15,118,110,0.08)' }}
                    />

                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(playerCurrentTime)} / {formatTime(playerDuration || (activeTrack?.duration_seconds ?? 0))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activeTrack
                          ? activeTrack.status === 'approved'
                            ? 'Опубликованный трек играет напрямую через API stream.'
                            : 'Для этого трека пока доступен только owner preview.'
                          : 'Выберите любой готовый трек ниже, чтобы проверить playback.'}
                      </Typography>
                    </Stack>

                    {activeTrack ? <WaveformPreview track={activeTrack} active={isPlaying || playerLoading} /> : null}
                  </Stack>
                </Stack>
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                flex: 0.85,
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 7,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.92) 100%)',
              }}
            >
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h4">Сессия и доступ</Typography>
                    <Typography color="text.secondary">Авторизация, staff-права и быстрый входной контекст.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label="JWT auth" color="success" variant="outlined" />
                    <Chip label={isStaff ? 'Staff delete enabled' : 'User mode'} variant="outlined" color={isStaff ? 'secondary' : 'default'} />
                  </Stack>
                </Stack>

                {!user ? (
                  <Stack spacing={2.5}>
                    <Alert severity="info">
                      <strong>Admin:</strong> `admin@audioplatform.com` / `admin123`.
                      <br />
                      <strong>Moderator:</strong> создайте обычный аккаунт, затем смените ему роль в БД на `moderator`.
                    </Alert>

                    <Alert severity="warning">
                      Сейчас сервис работает по упрощённому flow: после успешного processing треки публикуются автоматически,
                      а роли `admin/moderator` нужны прежде всего для расширенных прав удаления.
                    </Alert>

                    <Stack direction="row" spacing={1}>
                      <Button variant={authMode === 'login' ? 'contained' : 'outlined'} onClick={() => setAuthMode('login')}>
                        Вход
                      </Button>
                      <Button variant={authMode === 'register' ? 'contained' : 'outlined'} onClick={() => setAuthMode('register')}>
                        Регистрация
                      </Button>
                    </Stack>

                    {authMode === 'login' ? (
                      <Box component="form" onSubmit={handleLogin}>
                        <Stack spacing={2}>
                          <TextField label="Email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
                          <TextField
                            label="Пароль"
                            type="password"
                            value={loginPassword}
                            onChange={(event) => setLoginPassword(event.target.value)}
                            required
                          />
                          <Button type="submit" variant="contained" disabled={authBusy}>
                            {authBusy ? 'Входим...' : 'Открыть сессию'}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box component="form" onSubmit={handleRegister}>
                        <Stack spacing={2}>
                          <TextField
                            label="Username"
                            value={registerUsername}
                            onChange={(event) => setRegisterUsername(event.target.value)}
                            required
                          />
                          <TextField
                            label="Email"
                            type="email"
                            value={registerEmail}
                            onChange={(event) => setRegisterEmail(event.target.value)}
                            required
                          />
                          <TextField
                            label="Пароль"
                            helperText="Минимум 8 символов, одна заглавная буква и одна цифра."
                            type="password"
                            value={registerPassword}
                            onChange={(event) => setRegisterPassword(event.target.value)}
                            required
                          />
                          <Button type="submit" variant="contained" disabled={authBusy}>
                            {authBusy ? 'Создаём...' : 'Создать аккаунт'}
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2.5}>
                    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 5 }}>
                      <Stack spacing={2}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="h6">{user.username}</Typography>
                            <Typography color="text.secondary">{user.email}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            <Chip label={user.role} color="success" variant="outlined" />
                            <Chip label={user.status} color="success" variant="outlined" />
                          </Stack>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          Аккаунт уже связан с live auth API. Можно создавать треки, загружать source/cover, ставить лайки и
                          воспроизводить опубликованные записи.
                        </Typography>

                        {isStaff ? (
                          <Alert severity="info" icon={<ShieldRoundedIcon fontSize="inherit" />}>
                            У этой роли есть расширенное право удалять любые треки, не только свои.
                          </Alert>
                        ) : null}

                        <Button variant="outlined" onClick={handleLogout} disabled={authBusy}>
                          Выйти
                        </Button>
                      </Stack>
                    </Paper>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`Лайки ${likedTrackIds.length}`} variant="outlined" />
                      <Chip label={`Мои треки ${myTracks.length}`} variant="outlined" />
                      <Chip label={`Каталог ${publicTracks.length}`} variant="outlined" />
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>

          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
            <Paper
              variant="outlined"
              sx={{
                flex: 1.2,
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 7,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.9) 100%)',
              }}
            >
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h4">Каталог и библиотека</Typography>
                    <Typography color="text.secondary">
                      Сейчас логика упрощена: после обработки треки публикуются автоматически, поэтому каталог показывает уже
                      живую общую витрину.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <TextField
                      select
                      label="Сортировка"
                      value={catalogSort}
                      onChange={(event) => setCatalogSort(event.target.value as CatalogSort)}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="newest">Сначала новые</MenuItem>
                      <MenuItem value="popular">По популярности</MenuItem>
                      <MenuItem value="title">По названию</MenuItem>
                    </TextField>
                    <IconButton color="primary" onClick={() => void refreshWholeUi()}>
                      <RefreshRoundedIcon />
                    </IconButton>
                  </Stack>
                </Stack>

                <Box component="form" onSubmit={handleCatalogSearch}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <TextField
                      fullWidth
                      label="Поиск по названию, описанию или жанру"
                      value={catalogSearchInput}
                      onChange={(event) => setCatalogSearchInput(event.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button type="submit" variant="contained">
                      Найти
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setCatalogSearchInput('');
                        setCatalogSearch('');
                      }}
                    >
                      Сбросить
                    </Button>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Все" color={selectedCategory === 'all' ? 'primary' : 'default'} onClick={() => setSelectedCategory('all')} />
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={`${category.name} (${category.track_count ?? 0})`}
                      color={selectedCategory === category.slug ? 'primary' : 'default'}
                      onClick={() => setSelectedCategory(category.slug)}
                    />
                  ))}
                </Stack>

                <Tabs value={catalogView} onChange={(_, value) => setCatalogView(value as CatalogView)} sx={{ minHeight: 40 }}>
                  <Tab
                    value="catalog"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <QueueMusicRoundedIcon fontSize="small" />
                        <span>Все треки</span>
                      </Stack>
                    }
                  />
                  <Tab
                    value="liked"
                    disabled={!user}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FavoriteRoundedIcon fontSize="small" />
                        <span>Лайкнутые</span>
                      </Stack>
                    }
                  />
                </Tabs>

                {catalogSearch ? <Chip label={`Активный поиск: ${catalogSearch}`} color="secondary" variant="outlined" /> : null}

                {catalogBusy ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography>Обновляем список треков...</Typography>
                  </Stack>
                ) : null}

                <Stack spacing={2}>
                  {displayedTracks.length === 0 ? (
                    <Alert severity="info">
                      {catalogView === 'liked'
                        ? user
                          ? 'У вас пока нет лайкнутых треков. Поставьте первый лайк прямо из каталога.'
                          : 'Лайкнутые треки доступны после входа.'
                        : catalogSearch
                          ? 'По текущему поисковому запросу ничего не найдено. Попробуйте сменить фильтр или сбросить поиск.'
                          : 'Каталог пока пуст. Загрузите и обработайте первый трек.'}
                    </Alert>
                  ) : null}

                  {displayedTracks.map((track) => renderTrackCard(track, 'catalog'))}
                </Stack>
              </Stack>
            </Paper>

            <Stack spacing={3} sx={{ flex: 1 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 7,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.92) 100%)',
                }}
              >
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h4">Studio</Typography>
                      <Typography color="text.secondary">
                        Здесь создаётся metadata, подключаются source и cover, а публикация происходит автоматически после
                        успешного processing.
                      </Typography>
                    </Box>
                    {editingTrackId ? <Chip label={`Редактирование #${editingTrackId}`} color="secondary" /> : null}
                  </Stack>

                  {!user ? (
                    <Alert severity="warning">Для создания и редактирования треков сначала откройте сессию.</Alert>
                  ) : (
                    <Box component="form" onSubmit={handleTrackSubmit}>
                      <Stack spacing={2}>
                        <TextField
                          label="Название"
                          value={trackForm.title}
                          onChange={(event) => setTrackForm((current) => ({ ...current, title: event.target.value }))}
                          required
                        />
                        <TextField
                          label="Описание"
                          multiline
                          minRows={3}
                          value={trackForm.description}
                          onChange={(event) => setTrackForm((current) => ({ ...current, description: event.target.value }))}
                        />
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                          <TextField
                            label="Жанр"
                            value={trackForm.genre}
                            onChange={(event) => setTrackForm((current) => ({ ...current, genre: event.target.value }))}
                            fullWidth
                          />
                          <TextField
                            select
                            label="Категория"
                            value={trackForm.category_id}
                            onChange={(event) => setTrackForm((current) => ({ ...current, category_id: event.target.value }))}
                            fullWidth
                          >
                            <MenuItem value="">Без категории</MenuItem>
                            {categories.map((category) => (
                              <MenuItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Stack>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                          <TextField
                            label="BPM"
                            type="number"
                            value={trackForm.bpm}
                            onChange={(event) => setTrackForm((current) => ({ ...current, bpm: event.target.value }))}
                            fullWidth
                          />
                          <TextField
                            label="Тональность"
                            value={trackForm.key_signature}
                            onChange={(event) => setTrackForm((current) => ({ ...current, key_signature: event.target.value }))}
                            fullWidth
                          />
                        </Stack>
                        <TextField
                          label="Теги через запятую"
                          value={trackForm.tags}
                          onChange={(event) => setTrackForm((current) => ({ ...current, tags: event.target.value }))}
                        />
                        <TextField
                          label="Лицензия"
                          value={trackForm.license_type}
                          onChange={(event) => setTrackForm((current) => ({ ...current, license_type: event.target.value }))}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={trackForm.is_downloadable}
                              onChange={(event) =>
                                setTrackForm((current) => ({ ...current, is_downloadable: event.target.checked }))
                              }
                            />
                          }
                          label="Разрешить скачивание"
                        />
                        <Alert severity="info" icon={<AutoAwesomeRoundedIcon fontSize="inherit" />}>
                          Ручная moderation сейчас отключена: после успешного processing трек публикуется автоматически.
                        </Alert>
                        <Stack direction="row" spacing={2}>
                          <Button type="submit" variant="contained" disabled={studioBusy}>
                            {studioBusy ? 'Сохраняем...' : editingTrackId ? 'Обновить metadata' : 'Создать metadata'}
                          </Button>
                          <Button
                            variant="outlined"
                            disabled={studioBusy}
                            onClick={() => {
                              setEditingTrackId(null);
                              setTrackForm(initialTrackForm);
                            }}
                          >
                            Сбросить форму
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 7,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,237,0.92) 100%)',
                }}
              >
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h4">Мои треки</Typography>
                      <Typography color="text.secondary">
                        Здесь видно весь owner flow: metadata, cover, source, processing и уже опубликованный результат.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`Всего ${myTracks.length}`} variant="outlined" />
                      <Chip label={`Лайкнуто ${likedTrackIds.length}`} variant="outlined" />
                    </Stack>
                  </Stack>

                  {!user ? (
                    <Alert severity="info">После логина здесь появятся ваши треки и управляющие действия.</Alert>
                  ) : myTracks.length === 0 ? (
                    <Alert severity="info">У вас пока нет треков. Создайте первый в форме выше.</Alert>
                  ) : (
                    <Stack spacing={2}>
                      {myTracks.map((track) => renderTrackCard(track, 'mine'))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Stack>

          <Divider />

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 7,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box>
                <Typography variant="h5">Что важно сейчас</Typography>
                <Typography color="text.secondary">
                  Все пользователи видят опубликованные треки, owner удаляет свои, staff может удалять любые, а вкладка
                  лайков уже даёт первый персональный loop поверх общего каталога.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip icon={<LibraryMusicRoundedIcon />} label="Плеер живой" color="success" variant="outlined" />
                <Chip icon={<FavoriteRoundedIcon />} label="Лайки отдельной вкладкой" color="secondary" variant="outlined" />
                <Chip icon={<PhotoCameraRoundedIcon />} label="Cover uploads" color="primary" variant="outlined" />
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
