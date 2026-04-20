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
  TextField,
  Typography,
} from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import api from './services/api';
import {
  AdminLog,
  AuthTokens,
  Category,
  LikeToggleResponse,
  PaginatedResponse,
  StreamUrlResponse,
  SystemStats,
  Track,
  TrackLikeListResponse,
  TrackModerationPayload,
  User,
} from './types';


type HealthResponse = {
  status: string;
  version: string;
};

type AuthMode = 'login' | 'register';

type TrackFormState = {
  title: string;
  description: string;
  genre: string;
  category_id: string;
  is_public: boolean;
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
  is_public: true,
  is_downloadable: false,
  license_type: 'all-rights-reserved',
  tags: '',
  bpm: '',
  key_signature: '',
};

type StreamQuality = '128' | '320' | 'original';
type CatalogSort = 'newest' | 'popular' | 'title';
type OwnerTrackStateTone = 'info' | 'warning' | 'success' | 'error';


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


function getOwnerTrackState(track: Track): { tone: OwnerTrackStateTone; title: string; description: string } {
  const hasMedia = Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);

  if (track.status === 'deleted') {
    return {
      tone: 'error',
      title: 'Удалён из активного оборота',
      description: 'Трек скрыт из каталога и больше не участвует в пользовательских сценариях.',
    };
  }

  if (track.status === 'processing') {
    return {
      tone: 'warning',
      title: 'Идёт media processing',
      description: 'Исходный файл уже принят. Worker готовит производные MP3 и waveform для плеера.',
    };
  }

  if (track.status === 'rejected') {
    return {
      tone: 'error',
      title: 'Нужны правки перед повторной отправкой',
      description: 'Исправьте metadata или замените файл, затем снова отправьте трек на review.',
    };
  }

  if (track.status === 'approved' && track.is_public) {
    return {
      tone: 'success',
      title: 'Трек опубликован',
      description: 'Медиа прошло модерацию и уже может воспроизводиться в публичном каталоге.',
    };
  }

  if (track.status === 'approved' && !track.is_public) {
    return {
      tone: 'success',
      title: 'Трек одобрен, но остаётся приватным',
      description: 'Поток доступен владельцу и ролям модерации, но в публичный каталог трек не попадает.',
    };
  }

  if (track.status === 'pending' && !hasMedia) {
    return {
      tone: 'info',
      title: 'Ждёт исходный файл',
      description: 'Metadata уже сохранено. Следующий шаг: загрузить MP3 или WAV, чтобы запустить processing.',
    };
  }

  return {
    tone: 'warning',
    title: 'Ждёт модерацию',
    description: 'Файл уже обработан, но трек пока не опубликован. Его должен проверить moderator или admin.',
  };
}


function formatModerationAction(log: AdminLog) {
  if (log.action === 'track_approved') {
    return 'Трек одобрен';
  }

  if (log.action === 'track_rejected') {
    return 'Трек отклонён';
  }

  return log.action;
}


function WaveformPreview({ track, active }: { track: Track; active: boolean }) {
  const samples = Array.isArray(track.waveform_data_json?.samples) ? track.waveform_data_json.samples : [];
  if (samples.length === 0) {
    return (
      <Box
        sx={{
          height: 56,
          borderRadius: 3,
          border: '1px dashed rgba(15,118,110,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: 12,
        }}
      >
        Waveform will appear after media processing.
      </Box>
    );
  }

  const step = Math.max(1, Math.floor(samples.length / 64));
  const downsampled = samples.filter((_: number, index: number) => index % step === 0).slice(0, 64);

  return (
    <Stack
      direction="row"
      spacing={0.4}
      alignItems="end"
      sx={{
        height: 56,
        px: 1,
        py: 0.75,
        borderRadius: 3,
        bgcolor: active ? 'rgba(15,118,110,0.12)' : 'rgba(15,118,110,0.06)',
        border: '1px solid rgba(15,118,110,0.14)',
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
            bgcolor: active ? '#0f766e' : 'rgba(15,118,110,0.45)',
            flexShrink: 0,
          }}
        />
      ))}
    </Stack>
  );
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


export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [studioBusy, setStudioBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
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
  const [moderationQueue, setModerationQueue] = useState<Track[]>([]);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationStats, setModerationStats] = useState<SystemStats | null>(null);
  const [moderationLogs, setModerationLogs] = useState<AdminLog[]>([]);
  const [moderationReasonByTrack, setModerationReasonByTrack] = useState<Record<number, string>>({});
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
      setPageError(getErrorMessage(err, 'Could not load public catalog'));
    } finally {
      setCatalogBusy(false);
    }
  };

  const loadModeratorState = async (currentUser: User) => {
    if (!['moderator', 'admin'].includes(currentUser.role)) {
      setModerationQueue([]);
      setModerationStats(null);
      setModerationLogs([]);
      return;
    }

    const [statsResponse, moderationResponse, logResponse] = await Promise.all([
      api.getSystemStats(),
      api.getModerationQueue(),
      api.getAdminLogs({ target_type: 'track', size: 10 }),
    ]);

    setModerationStats(statsResponse as SystemStats);
    setModerationQueue((moderationResponse as PaginatedResponse<Track>).items);
    setModerationLogs((logResponse as PaginatedResponse<AdminLog>).items);
  };

  const loadAuthenticatedState = async () => {
    const [currentUser, myTracksResponse, likedTracksResponse] = await Promise.all([
      api.getCurrentUser(),
      api.getMyTracks(),
      api.getMyLikedTrackIds(),
    ]);

    setUser(currentUser as User);
    setMyTracks((myTracksResponse as PaginatedResponse<Track>).items);
    setLikedTrackIds((likedTracksResponse as TrackLikeListResponse).track_ids);
    await loadModeratorState(currentUser as User);
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
            setLikedTrackIds([]);
          }
        }
      } catch (err) {
        setPageError(getErrorMessage(err, 'Unknown error'));
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
      moderationQueue.find((track) => track.id === activeTrackId);

    if (latestTrack) {
      setActiveTrack(latestTrack);
    }
  }, [activeTrackId, myTracks, publicTracks, moderationQueue]);

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
      setPlayerError('Не удалось загрузить поток. Проверьте, что трек обработан и у текущей сессии есть доступ к media.');
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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const tokens = (await api.login(loginEmail, loginPassword)) as AuthTokens;
      saveTokens(tokens);
      await loadAuthenticatedState();
      setBanner('Вход выполнен. Теперь можно создавать metadata треков.');
      setLoginPassword('');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Login failed'));
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
      setBanner('Аккаунт создан и сессия уже открыта.');
      setRegisterPassword('');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Registration failed'));
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
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        delete audio.dataset.streamUrl;
        delete audio.dataset.trackId;
        delete audio.dataset.streamQuality;
        audio.load();
      }

      clearTokens();
      setUser(null);
      setMyTracks([]);
      setLikedTrackIds([]);
      setModerationQueue([]);
      setModerationStats(null);
      setModerationLogs([]);
      setEditingTrackId(null);
      setTrackForm(initialTrackForm);
      setActiveTrack(null);
      setActiveTrackId(null);
      setPlayerError(null);
      setPlayerCurrentTime(0);
      setPlayerDuration(0);
      setAuthBusy(false);
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
      is_public: trackForm.is_public,
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
        setBanner('Metadata updated.');
      } else {
        await api.createTrackMetadata(payload);
        setBanner('Track metadata created. Upload the source file from "My tracks" to start media processing.');
      }

      setEditingTrackId(null);
      setTrackForm(initialTrackForm);
      await Promise.all([loadAuthenticatedState(), loadPublicCatalog()]);
    } catch (err) {
      setPageError(getErrorMessage(err, 'Could not save track metadata'));
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
      is_public: track.is_public,
      is_downloadable: track.is_downloadable,
      license_type: track.license_type,
      tags: track.tags?.join(', ') ?? '',
      bpm: track.bpm ? String(track.bpm) : '',
      key_signature: track.key_signature ?? '',
    });
  };

  const handleDeleteTrack = async (trackId: number) => {
    setStudioBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.deleteTrack(trackId);
      if (editingTrackId === trackId) {
        setEditingTrackId(null);
        setTrackForm(initialTrackForm);
      }
      setBanner('Трек переведён в status deleted и скрыт из публичного каталога.');
      await Promise.all([loadAuthenticatedState(), loadPublicCatalog()]);
    } catch (err) {
      setPageError(getErrorMessage(err, 'Could not delete track'));
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
      setBanner(`Upload queued for "${track.title}". The track is now processing.`);
      await loadAuthenticatedState();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Could not upload audio file'));
    } finally {
      setUploadingTrackId(null);
      setStudioBusy(false);
    }
  };

  const canUploadTrackMedia = (track: Track) => track.status === 'pending' || track.status === 'rejected';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const hasPlayableMedia = (track: Track) => Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
  const isTrackLiked = (trackId: number) => likedTrackIds.includes(trackId);

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
      setPlayerError(getErrorMessage(err, 'Could not start playback'));
    }
  };

  const handleToggleLike = async (track: Track) => {
    if (!user) {
      setPageError('Чтобы ставить likes, сначала откройте сессию.');
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
      setActiveTrack((current) => (current?.id === track.id ? { ...current, like_count: response.like_count } : current));
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось обновить like'));
    }
  };

  const handleModerateTrack = async (track: Track, payload: TrackModerationPayload) => {
    setModerationBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.moderateTrack(track.id, payload);
      setBanner(`Moderation updated for "${track.title}".`);
      setModerationReasonByTrack((current) => ({ ...current, [track.id]: '' }));
      await Promise.all([loadAuthenticatedState(), loadPublicCatalog()]);
    } catch (err) {
      setPageError(getErrorMessage(err, 'Could not moderate track'));
    } finally {
      setModerationBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(15,118,110,0.16), transparent 35%), linear-gradient(160deg, #f6f1e7 0%, #efe6d6 100%)',
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="xl">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 8,
            border: '1px solid rgba(15,118,110,0.14)',
            background: 'rgba(255,250,242,0.92)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                <Chip
                  label="Resonance Sound"
                  sx={{
                    alignSelf: 'flex-start',
                    fontWeight: 700,
                    bgcolor: '#d7f5ef',
                    color: '#115e59',
                  }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={user ? `Сессия: ${user.username}` : 'Гость'} color={user ? 'success' : 'default'} />
                  {health ? <Chip label={`API ${health.status}`} color="success" variant="outlined" /> : null}
                </Stack>
              </Stack>

              <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4.5rem' }, lineHeight: 0.95 }}>
                Рабочая панель
                <br />
                раннего MVP
              </Typography>

              <Typography variant="h5" sx={{ maxWidth: 820, color: 'text.secondary', lineHeight: 1.45 }}>
                Это уже не статическая заглушка: экран работает с live API, показывает каталог, открывает сессию и проходит
                первый пользовательский flow создания metadata треков.
              </Typography>
            </Stack>

            {initialLoading ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={24} />
                <Typography>Поднимаем live-контекст приложения...</Typography>
              </Stack>
            ) : null}

            {pageError ? <Alert severity="error">{pageError}</Alert> : null}
            {banner ? <Alert severity="success">{banner}</Alert> : null}

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h5">Player</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Один и тот же плеер теперь работает и для публичных треков, и для owner/private preview через безопасные stream URL.
                    </Typography>
                  </Box>
                  <TextField
                    select
                    label="Качество потока"
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

                <audio ref={audioRef} controls style={{ width: '100%' }} />

                <Card variant="outlined" sx={{ borderRadius: 5, bgcolor: 'rgba(15,118,110,0.04)' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography variant="h6">{activeTrack?.title ?? 'Ничего не выбрано'}</Typography>
                          <Typography color="text.secondary">
                            {activeTrack
                              ? `${activeTrack.user?.username ?? 'Unknown artist'} • ${activeTrack.category?.name ?? 'Без категории'}`
                              : 'Выберите любой готовый трек ниже, чтобы начать playback.'}
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
                          <Chip label={`Качество: ${playerQuality}`} variant="outlined" />
                        </Stack>
                      </Stack>

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
                            ? activeTrack.is_public && activeTrack.status === 'approved'
                              ? 'Публичный playback доступен всем.'
                              : 'Это приватный или moderation preview поток, доступный по текущей роли.'
                            : 'Выбранный поток появится здесь вместе с прогрессом и текущим статусом.'}
                        </Typography>
                      </Stack>

                      {activeTrack ? <WaveformPreview track={activeTrack} active={isPlaying || playerLoading} /> : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Paper>

            <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
              <Paper variant="outlined" sx={{ flex: 1.2, p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                    <Typography variant="h5">Состояние и доступ</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label="HTTPS включён" color="success" variant="outlined" />
                      <Chip label="Auth live" color="success" variant="outlined" />
                      <Chip label="Catalog live" color="success" variant="outlined" />
                    </Stack>
                  </Stack>

                  {health ? (
                    <Alert severity="success">
                      Backend доступен: <strong>{health.status}</strong>, версия <strong>{health.version}</strong>
                    </Alert>
                  ) : null}

                  {!user ? (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1}>
                        <Button variant={authMode === 'login' ? 'contained' : 'outlined'} onClick={() => setAuthMode('login')}>
                          Вход
                        </Button>
                        <Button
                          variant={authMode === 'register' ? 'contained' : 'outlined'}
                          onClick={() => setAuthMode('register')}
                        >
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
                    <Card variant="outlined" sx={{ borderRadius: 5 }}>
                      <CardContent>
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
                            Аккаунт уже связан с live auth API. Можно создавать metadata треки и сразу видеть их в личной панели.
                          </Typography>
                          <Button variant="outlined" onClick={handleLogout} disabled={authBusy}>
                            Выйти
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ flex: 1, p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h5">Публичный каталог</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Базовый discovery уже живой: категории, поиск и сортировка работают поверх production API.
                      </Typography>
                    </Box>
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
                  </Stack>

                  <Box component="form" onSubmit={handleCatalogSearch}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
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
                    <Chip
                      label="Все"
                      color={selectedCategory === 'all' ? 'primary' : 'default'}
                      onClick={() => setSelectedCategory('all')}
                    />
                    {categories.map((category) => (
                      <Chip
                        key={category.id}
                        label={`${category.name} (${category.track_count ?? 0})`}
                        color={selectedCategory === category.slug ? 'primary' : 'default'}
                        onClick={() => setSelectedCategory(category.slug)}
                      />
                    ))}
                  </Stack>

                  {catalogSearch ? <Chip label={`Активный поиск: ${catalogSearch}`} color="secondary" variant="outlined" /> : null}

                  {catalogBusy ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography>Обновляем каталог...</Typography>
                    </Stack>
                  ) : null}

                  <Stack spacing={2}>
                    {publicTracks.length === 0 ? (
                      <Alert severity="info">
                        {catalogSearch
                          ? 'По текущему поисковому запросу пока ничего не найдено. Попробуйте сбросить поиск или сменить категорию.'
                          : 'В публичном каталоге пока нет approved треков. Это нормально: созданные сейчас metadata идут в статус `pending`.'}
                      </Alert>
                    ) : null}

                    {publicTracks.map((track) => (
                      <Card key={track.id} variant="outlined" sx={{ borderRadius: 5 }}>
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                              <Typography variant="h6">{track.title}</Typography>
                              <Chip label={track.status} color={getTrackStatusColor(track.status)} size="small" />
                            </Stack>
                            <Typography color="text.secondary">
                              {(track.user?.username ?? 'Unknown artist')} | {track.category?.name ?? 'Без категории'}
                            </Typography>
                            {track.description ? <Typography>{track.description}</Typography> : null}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip label={`Likes: ${track.like_count}`} size="small" variant="outlined" />
                              <Chip label={`Plays: ${track.play_count}`} size="small" variant="outlined" />
                              <Chip label={`Duration: ${formatTime(track.duration_seconds ?? 0)}`} size="small" variant="outlined" />
                            </Stack>
                            <WaveformPreview track={track} active={activeTrackId === track.id && isPlaying} />
                            <Stack direction="row" spacing={1}>
                              <Button variant="contained" size="small" onClick={() => void handlePlayTrack(track)} disabled={!hasPlayableMedia(track)}>
                                {activeTrackId === track.id && isPlaying ? 'Пауза' : 'Слушать'}
                              </Button>
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
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Stack>

            <Divider />

            <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
              <Paper variant="outlined" sx={{ flex: 1.1, p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h5">Studio: metadata flow</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Здесь уже работает первый write-срез backend: create, update и soft-delete для собственных треков.
                      </Typography>
                    </Box>
                    {editingTrackId ? <Chip label={`Редактирование #${editingTrackId}`} color="secondary" /> : null}
                  </Stack>

                  {!user ? (
                    <Alert severity="warning">Для создания или редактирования треков сначала откройте сессию через auth API.</Alert>
                  ) : (
                    <Box component="form" onSubmit={handleTrackSubmit}>
                      <Stack spacing={2}>
                        <TextField
                          label="Название трека"
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
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={trackForm.is_public}
                                onChange={(event) => setTrackForm((current) => ({ ...current, is_public: event.target.checked }))}
                              />
                            }
                            label="Публичный после модерации"
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
                        </Stack>
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

              <Paper variant="outlined" sx={{ flex: 1, p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
                <Stack spacing={3}>
                  <Typography variant="h5">Мои треки</Typography>
                  {!user ? (
                    <Alert severity="info">После логина здесь появятся ваши pending и deleted tracks.</Alert>
                  ) : myTracks.length === 0 ? (
                    <Alert severity="info">У вас пока нет metadata треков. Создайте первый в студийной форме слева.</Alert>
                  ) : (
                    <Stack spacing={2}>
                      {myTracks.map((track) => (
                        <Card key={track.id} variant="outlined" sx={{ borderRadius: 5 }}>
                          <CardContent>
                            <Stack spacing={1.5}>
                              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                                <Typography variant="h6">{track.title}</Typography>
                                <Chip label={track.status} color={getTrackStatusColor(track.status)} size="small" />
                              </Stack>
                              <Alert severity={getOwnerTrackState(track).tone}>
                                <strong>{getOwnerTrackState(track).title}</strong> {getOwnerTrackState(track).description}
                              </Alert>
                              <Typography color="text.secondary">
                                {track.genre ?? 'Без жанра'} | {track.category?.name ?? 'Без категории'}
                              </Typography>
                              {track.description ? <Typography>{track.description}</Typography> : null}
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Public: ${track.is_public ? 'yes' : 'no'}`} variant="outlined" size="small" />
                                <Chip label={`BPM: ${track.bpm ?? '-'}`} variant="outlined" size="small" />
                                <Chip label={`Tags: ${track.tags?.join(', ') || '-'}`} variant="outlined" size="small" />
                                <Chip
                                  label={track.original_url ? 'Source uploaded' : 'Source missing'}
                                  variant="outlined"
                                  size="small"
                                  color={track.original_url ? 'success' : 'default'}
                                />
                                <Chip
                                  label={track.mp3_128_url ? '128 ready' : '128 pending'}
                                  variant="outlined"
                                  size="small"
                                  color={track.mp3_128_url ? 'success' : 'default'}
                                />
                                <Chip
                                  label={track.mp3_320_url ? '320 ready' : '320 pending'}
                                  variant="outlined"
                                  size="small"
                                  color={track.mp3_320_url ? 'success' : 'default'}
                                />
                              </Stack>
                              {track.metadata ? (
                                <Typography variant="body2" color="text.secondary">
                                  Media: {track.metadata.format ?? 'unknown'} | duration {track.metadata.duration_seconds ?? '-'}s |
                                  size {track.metadata.file_size_bytes ?? '-'} bytes
                                </Typography>
                              ) : null}
                              {track.rejection_reason ? <Alert severity="error">{track.rejection_reason}</Alert> : null}
                              <WaveformPreview track={track} active={activeTrackId === track.id && isPlaying} />
                              <Stack direction="row" spacing={1}>
                                <Button variant="contained" size="small" onClick={() => void handlePlayTrack(track)} disabled={!hasPlayableMedia(track)}>
                                  {activeTrackId === track.id && isPlaying ? 'Пауза' : 'Проверить playback'}
                                </Button>
                                <Button variant="outlined" size="small" onClick={() => startEditingTrack(track)}>
                                  Редактировать
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  component="label"
                                  disabled={studioBusy || !canUploadTrackMedia(track)}
                                >
                                  {uploadingTrackId === track.id
                                    ? 'Uploading...'
                                    : track.original_url
                                      ? 'Replace audio'
                                      : 'Upload audio'}
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
                                <Button variant="outlined" color="error" size="small" onClick={() => void handleDeleteTrack(track.id)}>
                                  Удалить
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Stack>

            {isModerator ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 6, backgroundColor: '#fff' }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="h5">Moderation area</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Это уже не просто технический блок. Здесь видно очередь review и недавние moderation-решения.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                      <Chip label={`Pending review: ${moderationStats?.tracks_pending_moderation ?? 0}`} color="warning" variant="outlined" />
                      <Chip label={`Users: ${moderationStats?.total_users ?? 0}`} variant="outlined" />
                      <Chip label={`Tracks: ${moderationStats?.total_tracks ?? 0}`} variant="outlined" />
                      <IconButton
                        color="primary"
                        onClick={() => {
                          if (user) {
                            void loadModeratorState(user);
                          }
                        }}
                      >
                        <RefreshRoundedIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {moderationQueue.length === 0 ? (
                    <Alert severity="info">No tracks are waiting for moderation right now.</Alert>
                  ) : (
                    <Stack spacing={2}>
                      {moderationQueue.map((track) => (
                        <Card key={`moderation-${track.id}`} variant="outlined" sx={{ borderRadius: 5 }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                                <Box>
                                  <Typography variant="h6">{track.title}</Typography>
                                  <Typography color="text.secondary">
                                    {(track.user?.username ?? 'Unknown artist')} | {track.genre ?? 'No genre'}
                                  </Typography>
                                </Box>
                                <Chip label={track.status} color={getTrackStatusColor(track.status)} size="small" />
                              </Stack>
                              {track.description ? <Typography>{track.description}</Typography> : null}
                              <Alert severity="warning">
                                После approve трек {track.is_public ? 'попадёт в публичный каталог' : 'останется приватным, но станет валидным для owner playback'}.
                              </Alert>
                              <WaveformPreview track={track} active={activeTrackId === track.id && isPlaying} />
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Format: ${track.metadata?.format ?? '-'}`} variant="outlined" size="small" />
                                <Chip label={`Duration: ${track.metadata?.duration_seconds ?? '-'}s`} variant="outlined" size="small" />
                                <Chip label={`BPM: ${track.bpm ?? '-'}`} variant="outlined" size="small" />
                              </Stack>
                              <TextField
                                label="Rejection reason"
                                value={moderationReasonByTrack[track.id] ?? ''}
                                onChange={(event) =>
                                  setModerationReasonByTrack((current) => ({ ...current, [track.id]: event.target.value }))
                                }
                                multiline
                                minRows={2}
                              />
                              <Stack direction="row" spacing={1}>
                                <Button variant="contained" size="small" onClick={() => void handlePlayTrack(track)} disabled={!hasPlayableMedia(track)}>
                                  {activeTrackId === track.id && isPlaying ? 'Pause' : 'Preview'}
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  disabled={moderationBusy}
                                  onClick={() => void handleModerateTrack(track, { status: 'approved' })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  disabled={moderationBusy}
                                  onClick={() =>
                                    void handleModerateTrack(track, {
                                      status: 'rejected',
                                      rejection_reason: moderationReasonByTrack[track.id] || 'Rejected during moderation',
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}

                  <Divider />

                  <Stack spacing={2}>
                    <Typography variant="h6">Последние moderation-действия</Typography>
                    {moderationLogs.length === 0 ? (
                      <Alert severity="info">История модерации пока пуста.</Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {moderationLogs.map((log) => (
                          <Card key={`log-${log.id}`} variant="outlined" sx={{ borderRadius: 4 }}>
                            <CardContent>
                              <Stack spacing={1}>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                                  <Typography variant="subtitle1">{formatModerationAction(log)}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(log.timestamp).toLocaleString('ru-RU')}
                                  </Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  Track #{log.target_id ?? '-'} • admin #{log.admin_id}
                                </Typography>
                                {typeof log.details?.rejection_reason === 'string' && log.details.rejection_reason ? (
                                  <Alert severity="error">{String(log.details.rejection_reason)}</Alert>
                                ) : null}
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
