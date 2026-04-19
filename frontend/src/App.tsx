import { FormEvent, useEffect, useState } from 'react';
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
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import api from './services/api';
import { AuthTokens, Category, PaginatedResponse, Track, User } from './types';


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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [trackForm, setTrackForm] = useState<TrackFormState>(initialTrackForm);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [uploadingTrackId, setUploadingTrackId] = useState<number | null>(null);

  const loadPublicCatalog = async (category: string) => {
    setCatalogBusy(true);
    try {
      const [categoriesResponse, tracksResponse] = await Promise.all([
        api.getCategories(),
        api.getTracks(category === 'all' ? undefined : { category }),
      ]);

      setCategories(categoriesResponse as Category[]);
      setPublicTracks((tracksResponse as PaginatedResponse<Track>).items);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not load public catalog');
    } finally {
      setCatalogBusy(false);
    }
  };

  const loadAuthenticatedState = async () => {
    const [currentUser, myTracksResponse] = await Promise.all([
      api.getCurrentUser(),
      api.getMyTracks(),
    ]);

    setUser(currentUser as User);
    setMyTracks((myTracksResponse as PaginatedResponse<Track>).items);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const healthResponse = await fetch('/api/v1/health');
        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        await loadPublicCatalog('all');

        if (localStorage.getItem('access_token')) {
          try {
            await loadAuthenticatedState();
          } catch {
            clearTokens();
            setUser(null);
            setMyTracks([]);
          }
        }
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Unknown error');
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

    void loadPublicCatalog(selectedCategory);
  }, [selectedCategory, initialLoading]);

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
      setPageError(err instanceof Error ? err.message : 'Login failed');
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
      setPageError(err instanceof Error ? err.message : 'Registration failed');
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
      clearTokens();
      setUser(null);
      setMyTracks([]);
      setEditingTrackId(null);
      setTrackForm(initialTrackForm);
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
      await Promise.all([loadAuthenticatedState(), loadPublicCatalog(selectedCategory)]);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not save track metadata');
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
      await Promise.all([loadAuthenticatedState(), loadPublicCatalog(selectedCategory)]);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Could not delete track');
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
      setPageError(err instanceof Error ? err.message : 'Could not upload audio file');
    } finally {
      setUploadingTrackId(null);
      setStudioBusy(false);
    }
  };

  const canUploadTrackMedia = (track: Track) => track.status === 'pending' || track.status === 'rejected';

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
                  <Typography variant="h5">Публичный каталог</Typography>
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

                  {catalogBusy ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography>Обновляем каталог...</Typography>
                    </Stack>
                  ) : null}

                  <Stack spacing={2}>
                    {publicTracks.length === 0 ? (
                      <Alert severity="info">
                        В публичном каталоге пока нет approved треков. Это нормально: созданные сейчас metadata идут в статус `pending`.
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
                              <Stack direction="row" spacing={1}>
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
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
