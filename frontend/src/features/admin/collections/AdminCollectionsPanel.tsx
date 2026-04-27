import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, Autocomplete, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';

import { TrackArtwork } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import api from '@/shared/api/client';
import { Collection, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import {
  DeleteOutlineRoundedIcon,
  PhotoCameraRoundedIcon,
  PlayArrowRoundedIcon,
  QueueMusicRoundedIcon,
  RefreshRoundedIcon,
  SearchRoundedIcon,
  ShieldRoundedIcon,
} from '@/shared/ui/icons';

interface AdminCollectionsPanelProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
}

export function AdminCollectionsPanel({ auth, player }: AdminCollectionsPanelProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [approvedTracks, setApprovedTracks] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<Record<number, Track | null>>({});
  const [trackSearch, setTrackSearch] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const loadApprovedTracks = useCallback(async (searchValue: string) => {
    const trackPage = await api.getTracks({ sort: 'newest', size: 25, search: searchValue.trim() || undefined });
    setApprovedTracks(trackPage.items);
  }, []);

  const loadCollections = useCallback(async () => {
    if (!auth.isStaff) {
      return;
    }

    setLoading(true);
    setPanelError(null);

    try {
      const [collectionPage, trackPage] = await Promise.all([
        api.getAdminCollections({ search: search || undefined, size: 50 }),
        api.getTracks({ sort: 'newest', size: 25 }),
      ]);
      setCollections(collectionPage.items);
      setApprovedTracks(trackPage.items);
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось загрузить подборки'));
    } finally {
      setLoading(false);
    }
  }, [auth.isStaff, search]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (!auth.isStaff) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadApprovedTracks(trackSearch);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [auth.isStaff, loadApprovedTracks, trackSearch]);

  const totalPublic = useMemo(() => collections.filter((collection) => collection.is_public).length, [collections]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const createDraftCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setPanelError('Укажите название подборки');
      return;
    }

    setActionKey('create');
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.createCollection({
        name: trimmedName,
        description: description.trim() || null,
        is_public: false,
      });
      setName('');
      setDescription('');
      setPanelMessage(`Подборка "${trimmedName}" создана.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось создать подборку'));
    } finally {
      setActionKey(null);
    }
  };

  const updateCollection = async (collection: Collection, patch: Partial<Pick<Collection, 'name' | 'description' | 'is_public'>>) => {
    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.updateCollection(collection.id, patch);
      setPanelMessage(`Подборка "${collection.name}" обновлена.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось обновить подборку'));
    } finally {
      setActionKey(null);
    }
  };

  const editCollectionText = async (collection: Collection) => {
    const nextName = window.prompt('Название подборки', collection.name);
    if (nextName === null) {
      return;
    }
    const nextDescription = window.prompt('Описание подборки', collection.description ?? '');
    if (nextDescription === null) {
      return;
    }
    if (!nextName.trim()) {
      setPanelError('Укажите название подборки');
      return;
    }
    await updateCollection(collection, {
      name: nextName.trim(),
      description: nextDescription.trim() || null,
    });
  };

  const deleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Удалить подборку "${collection.name}"?`)) {
      return;
    }

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.deleteCollection(collection.id);
      setPanelMessage(`Подборка "${collection.name}" удалена.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось удалить подборку'));
    } finally {
      setActionKey(null);
    }
  };

  const addTrack = async (collection: Collection) => {
    const selectedTrack = selectedTracks[collection.id];
    if (!selectedTrack) {
      setPanelError('Сначала выберите трек');
      return;
    }

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.addCollectionTrack(collection.id, selectedTrack.id);
      setSelectedTracks((current) => ({ ...current, [collection.id]: null }));
      setPanelMessage(`Трек добавлен в "${collection.name}".`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось добавить трек'));
    } finally {
      setActionKey(null);
    }
  };

  const uploadCover = async (collection: Collection, file: File | undefined) => {
    if (!file) {
      return;
    }

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.uploadCollectionCover(collection.id, file);
      setPanelMessage(`Обложка для "${collection.name}" загружена.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось загрузить обложку'));
    } finally {
      setActionKey(null);
    }
  };

  const removeTrack = async (collection: Collection, track: Track) => {
    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.removeCollectionTrack(collection.id, track.id);
      if (player.activeTrackId === track.id) {
        player.stopAndResetAudio();
      }
      setPanelMessage(`Трек удалён из "${collection.name}".`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось удалить трек из подборки'));
    } finally {
      setActionKey(null);
    }
  };

  const moveTrack = async (collection: Collection, track: Track, direction: -1 | 1) => {
    const currentIndex = collection.tracks.findIndex((item) => item.id === track.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= collection.tracks.length) {
      return;
    }

    const nextTracks = [...collection.tracks];
    [nextTracks[currentIndex], nextTracks[nextIndex]] = [nextTracks[nextIndex], nextTracks[currentIndex]];

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.reorderCollectionTracks(
        collection.id,
        nextTracks.map((item) => item.id)
      );
      setPanelMessage(`Порядок треков в "${collection.name}" обновлён.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось изменить порядок треков'));
    } finally {
      setActionKey(null);
    }
  };

  if (!auth.user || !auth.isStaff) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          Управление подборками доступно только команде проекта.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard tone="orange">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Управление подборками</Typography>
            <Typography color="text.secondary">
              Создание, публикация, обложки и порядок треков внутри подборок.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<QueueMusicRoundedIcon />} label={`${collections.length} подборок`} variant="outlined" />
            <Chip label={`${totalPublic} открыто`} color="success" variant="outlined" />
          </Stack>
        </Stack>

        <Box component="form" onSubmit={createDraftCollection}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField label="Название подборки" value={name} onChange={(event) => setName(event.target.value)} />
            <AppTextField
              fullWidth
              label="Описание"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" disabled={actionKey === 'create'}>
              Создать
            </ActionButton>
          </Stack>
        </Box>

        <Box component="form" onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField
              fullWidth
              label="Поиск подборок"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
              Найти
            </ActionButton>
            <ActionButton variant="outlined" onClick={() => void loadCollections()} startIcon={<RefreshRoundedIcon />}>
              Обновить
            </ActionButton>
          </Stack>
        </Box>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем подборки...</Typography>
          </Stack>
        ) : null}

        {!loading && collections.length === 0 ? <Alert severity="info">Подборок пока нет.</Alert> : null}

        <Stack spacing={1.5}>
          {collections.map((collection) => {
            const busy = actionKey === `collection-${collection.id}`;
            return (
              <Card key={collection.id} variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={collection.is_public ? 'Открыта' : 'Черновик'} color={collection.is_public ? 'success' : 'default'} size="small" />
                          <Chip label={`${collection.track_count} треков`} variant="outlined" size="small" />
                          <Chip label={`#${collection.id}`} variant="outlined" size="small" />
                        </Stack>
                        <Typography variant="h5" sx={{ mt: 1 }}>
                          {collection.name}
                        </Typography>
                        {collection.description ? <Typography color="text.secondary">{collection.description}</Typography> : null}
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <ActionButton variant="outlined" size="small" disabled={busy} onClick={() => void editCollectionText(collection)}>
                          Править
                        </ActionButton>
                        <ActionButton variant="outlined" size="small" component="label" startIcon={<PhotoCameraRoundedIcon />} disabled={busy}>
                          Обложка
                          <input
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => void uploadCover(collection, event.target.files?.[0])}
                          />
                        </ActionButton>
                        <ActionButton
                          color={collection.is_public ? 'warning' : 'success'}
                          variant={collection.is_public ? 'outlined' : 'contained'}
                          size="small"
                          disabled={busy}
                          onClick={() => void updateCollection(collection, { is_public: !collection.is_public })}
                        >
                          {collection.is_public ? 'Скрыть' : 'Опубликовать'}
                        </ActionButton>
                        <ActionButton
                          color="error"
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={busy}
                          onClick={() => void deleteCollection(collection)}
                        >
                          Удалить
                        </ActionButton>
                      </Stack>
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                      <Autocomplete
                        fullWidth
                        options={approvedTracks}
                        value={selectedTracks[collection.id] ?? null}
                        inputValue={trackSearch}
                        onInputChange={(_, value) => setTrackSearch(value)}
                        onChange={(_, value) => setSelectedTracks((current) => ({ ...current, [collection.id]: value }))}
                        getOptionLabel={(track) => `${track.title} — ${track.user?.username ?? `Пользователь ${track.user_id}`} (#${track.id})`}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => <AppTextField {...params} label="Найти трек" />}
                      />
                      <ActionButton variant="contained" disabled={busy || !selectedTracks[collection.id]} onClick={() => void addTrack(collection)}>
                        Добавить
                      </ActionButton>
                    </Stack>

                    <Stack spacing={1}>
                      {collection.tracks.length === 0 ? <Alert severity="info">В подборке пока нет треков.</Alert> : null}
                      {collection.tracks.map((track, index) => (
                        <Stack
                          key={`${collection.id}-${track.id}`}
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1.5}
                          alignItems={{ xs: 'stretch', md: 'center' }}
                        >
                          <TrackArtwork track={track} size={64} radius={14} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" noWrap>
                              {track.title}
                            </Typography>
                            <Typography color="text.secondary" noWrap>
                              {track.user?.username ?? `Пользователь ${track.user_id}`}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <ActionButton
                              variant="outlined"
                              size="small"
                              startIcon={<PlayArrowRoundedIcon />}
                              disabled={busy}
                              onClick={() => void player.playTrack(track)}
                            >
                              Слушать
                            </ActionButton>
                            <ActionButton
                              variant="outlined"
                              size="small"
                              disabled={busy || index === 0}
                              onClick={() => void moveTrack(collection, track, -1)}
                            >
                              Выше
                            </ActionButton>
                            <ActionButton
                              variant="outlined"
                              size="small"
                              disabled={busy || index === collection.tracks.length - 1}
                              onClick={() => void moveTrack(collection, track, 1)}
                            >
                              Ниже
                            </ActionButton>
                            <ActionButton color="error" variant="outlined" size="small" disabled={busy} onClick={() => void removeTrack(collection, track)}>
                              Убрать
                            </ActionButton>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
