import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, Box, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, Typography } from '@mui/material';

import { TrackArtwork } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import api from '@/shared/api/client';
import { Collection, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import {
  DeleteOutlineRoundedIcon,
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
  const [selectedTrackIds, setSelectedTrackIds] = useState<Record<number, string>>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    if (!auth.isStaff) {
      return;
    }

    setLoading(true);
    setPanelError(null);

    try {
      const [collectionPage, trackPage] = await Promise.all([
        api.getAdminCollections({ search: search || undefined, size: 50 }),
        api.getTracks({ sort: 'newest', size: 100 }),
      ]);
      setCollections(collectionPage.items);
      setApprovedTracks(trackPage.items);
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to load staff collections'));
    } finally {
      setLoading(false);
    }
  }, [auth.isStaff, search]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const totalPublic = useMemo(() => collections.filter((collection) => collection.is_public).length, [collections]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const createDraftCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setPanelError('Collection name is required');
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
      setPanelMessage(`Collection "${trimmedName}" created as draft.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to create collection'));
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
      setPanelMessage(`Collection "${collection.name}" updated.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to update collection'));
    } finally {
      setActionKey(null);
    }
  };

  const editCollectionText = async (collection: Collection) => {
    const nextName = window.prompt('Collection name', collection.name);
    if (nextName === null) {
      return;
    }
    const nextDescription = window.prompt('Collection description', collection.description ?? '');
    if (nextDescription === null) {
      return;
    }
    if (!nextName.trim()) {
      setPanelError('Collection name is required');
      return;
    }
    await updateCollection(collection, {
      name: nextName.trim(),
      description: nextDescription.trim() || null,
    });
  };

  const deleteCollection = async (collection: Collection) => {
    if (!window.confirm(`Delete collection "${collection.name}"?`)) {
      return;
    }

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.deleteCollection(collection.id);
      setPanelMessage(`Collection "${collection.name}" deleted.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to delete collection'));
    } finally {
      setActionKey(null);
    }
  };

  const addTrack = async (collection: Collection) => {
    const selectedTrackId = Number(selectedTrackIds[collection.id]);
    if (!Number.isFinite(selectedTrackId) || selectedTrackId <= 0) {
      setPanelError('Select an approved track first');
      return;
    }

    setActionKey(`collection-${collection.id}`);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.addCollectionTrack(collection.id, selectedTrackId);
      setSelectedTrackIds((current) => ({ ...current, [collection.id]: '' }));
      setPanelMessage(`Track added to "${collection.name}".`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to add track'));
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
      setPanelMessage(`Track removed from "${collection.name}".`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to remove track'));
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
      setPanelMessage(`Collection "${collection.name}" reordered.`);
      await loadCollections();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to reorder collection'));
    } finally {
      setActionKey(null);
    }
  };

  if (!auth.user || !auth.isStaff) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          Staff collections are available only to admin and moderator roles.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard tone="orange">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Staff collections</Typography>
            <Typography color="text.secondary">
              Curated public shelves for approved tracks. Draft collections stay hidden until staff publishes them.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<QueueMusicRoundedIcon />} label={`${collections.length} collections`} variant="outlined" />
            <Chip label={`${totalPublic} public`} color="success" variant="outlined" />
          </Stack>
        </Stack>

        <Box component="form" onSubmit={createDraftCollection}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField label="Collection name" value={name} onChange={(event) => setName(event.target.value)} />
            <AppTextField
              fullWidth
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" disabled={actionKey === 'create'}>
              Create draft
            </ActionButton>
          </Stack>
        </Box>

        <Box component="form" onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField
              fullWidth
              label="Search collections"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
              Search
            </ActionButton>
            <ActionButton variant="outlined" onClick={() => void loadCollections()} startIcon={<RefreshRoundedIcon />}>
              Refresh
            </ActionButton>
          </Stack>
        </Box>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading staff collections...</Typography>
          </Stack>
        ) : null}

        {!loading && collections.length === 0 ? <Alert severity="info">No staff collections yet.</Alert> : null}

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
                          <Chip label={collection.is_public ? 'Public' : 'Draft'} color={collection.is_public ? 'success' : 'default'} size="small" />
                          <Chip label={`${collection.track_count} linked`} variant="outlined" size="small" />
                          <Chip label={`#${collection.id}`} variant="outlined" size="small" />
                        </Stack>
                        <Typography variant="h5" sx={{ mt: 1 }}>
                          {collection.name}
                        </Typography>
                        {collection.description ? <Typography color="text.secondary">{collection.description}</Typography> : null}
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                        <ActionButton variant="outlined" size="small" disabled={busy} onClick={() => void editCollectionText(collection)}>
                          Edit
                        </ActionButton>
                        <ActionButton
                          color={collection.is_public ? 'warning' : 'success'}
                          variant={collection.is_public ? 'outlined' : 'contained'}
                          size="small"
                          disabled={busy}
                          onClick={() => void updateCollection(collection, { is_public: !collection.is_public })}
                        >
                          {collection.is_public ? 'Unpublish' : 'Publish'}
                        </ActionButton>
                        <ActionButton
                          color="error"
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={busy}
                          onClick={() => void deleteCollection(collection)}
                        >
                          Delete
                        </ActionButton>
                      </Stack>
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                      <AppTextField
                        select
                        fullWidth
                        label="Approved track"
                        value={selectedTrackIds[collection.id] ?? ''}
                        onChange={(event) =>
                          setSelectedTrackIds((current) => ({ ...current, [collection.id]: event.target.value }))
                        }
                      >
                        {approvedTracks.map((track) => (
                          <MenuItem key={track.id} value={String(track.id)}>
                            {track.title} by {track.user?.username ?? `user ${track.user_id}`}
                          </MenuItem>
                        ))}
                      </AppTextField>
                      <ActionButton variant="contained" disabled={busy || approvedTracks.length === 0} onClick={() => void addTrack(collection)}>
                        Add track
                      </ActionButton>
                    </Stack>

                    <Stack spacing={1}>
                      {collection.tracks.length === 0 ? <Alert severity="info">Draft is empty. Add an approved track before publishing.</Alert> : null}
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
                              {track.user?.username ?? `user ${track.user_id}`} · {track.status}
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
                              Play
                            </ActionButton>
                            <ActionButton
                              variant="outlined"
                              size="small"
                              disabled={busy || index === 0}
                              onClick={() => void moveTrack(collection, track, -1)}
                            >
                              Up
                            </ActionButton>
                            <ActionButton
                              variant="outlined"
                              size="small"
                              disabled={busy || index === collection.tracks.length - 1}
                              onClick={() => void moveTrack(collection, track, 1)}
                            >
                              Down
                            </ActionButton>
                            <ActionButton color="error" variant="outlined" size="small" disabled={busy} onClick={() => void removeTrack(collection, track)}>
                              Remove
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
