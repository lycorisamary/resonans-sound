import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, Box, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, Typography } from '@mui/material';

import { TrackArtwork } from '@/entities/track/ui';
import { AdminCollectionsPanel } from '@/features/admin/collections/AdminCollectionsPanel';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import api from '@/shared/api/client';
import { AdminSystemStats, Track, TrackStatus } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { formatTime } from '@/shared/lib/time';
import { ActionButton, AppTextField, MetricTile, SectionCard } from '@/shared/ui';
import {
  DeleteOutlineRoundedIcon,
  PlayArrowRoundedIcon,
  RefreshRoundedIcon,
  SearchRoundedIcon,
  ShieldRoundedIcon,
} from '@/shared/ui/icons';

interface AdminPanelProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
}

type StatusFilter = 'all' | TrackStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All active' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'deleted', label: 'Deleted' },
];

function canPlayInStaffPanel(track: Track): boolean {
  return track.status === 'approved' || Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
}

export function AdminPanel({ auth, player }: AdminPanelProps) {
  if (!auth.user) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning">Sign in as admin or moderator to open staff controls.</Alert>
      </SectionCard>
    );
  }

  if (!auth.isStaff) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          This section is available only to admin and moderator roles.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <Stack spacing={3}>
      <AdminTrackControl auth={auth} player={player} />
      <AdminCollectionsPanel auth={auth} player={player} />
    </Stack>
  );
}

function AdminTrackControl({ auth, player }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminSystemStats | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionTrackId, setActionTrackId] = useState<number | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!auth.isStaff) {
      return;
    }

    setLoading(true);
    setPanelError(null);

    try {
      const [nextStats, trackPage] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTracks({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search || undefined,
          size: 50,
        }),
      ]);
      setStats(nextStats);
      setTracks(trackPage.items);
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to load staff track controls'));
    } finally {
      setLoading(false);
    }
  }, [auth.isStaff, search, statusFilter]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const totalVisible = useMemo(() => tracks.filter((track) => track.status === 'approved').length, [tracks]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const moderateTrack = async (track: Track, nextStatus: Extract<TrackStatus, 'approved' | 'rejected' | 'hidden'>) => {
    const defaultReason = track.rejection_reason ?? '';
    const reason =
      nextStatus === 'hidden'
        ? window.prompt(`Hide reason for "${track.title}"`, defaultReason)
        : nextStatus === 'rejected'
          ? window.prompt(`Reject reason for "${track.title}"`, defaultReason)
          : null;

    if ((nextStatus === 'hidden' || nextStatus === 'rejected') && reason === null) {
      return;
    }

    setActionTrackId(track.id);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.moderateTrack(track.id, {
        status: nextStatus,
        rejection_reason: reason || null,
      });
      if (nextStatus === 'hidden' && player.activeTrackId === track.id) {
        player.stopAndResetAudio();
      }
      setPanelMessage(`Track "${track.title}" moved to ${nextStatus}.`);
      await loadAdminData();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to change track status'));
    } finally {
      setActionTrackId(null);
    }
  };

  const deleteTrack = async (track: Track) => {
    if (!window.confirm(`Delete track "${track.title}"?`)) {
      return;
    }

    setActionTrackId(track.id);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.deleteTrack(track.id);
      if (player.activeTrackId === track.id) {
        player.stopAndResetAudio();
      }
      setPanelMessage(`Track "${track.title}" deleted.`);
      await loadAdminData();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Failed to delete track'));
    } finally {
      setActionTrackId(null);
    }
  };

  return (
    <SectionCard tone="blue">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Staff track controls</Typography>
            <Typography color="text.secondary">
              Recent uploads without premoderation. Hiding, restoring, rejecting, and deleting stay staff actions with audit logs.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShieldRoundedIcon />} label={auth.user?.role ?? 'staff'} color="secondary" variant="outlined" />
            <Chip label={`Visible in page ${totalVisible}`} variant="outlined" />
          </Stack>
        </Stack>

        {stats ? (
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <MetricTile label="Users" value={stats.total_users} />
            <MetricTile label="Tracks" value={stats.total_tracks} />
            <MetricTile label="Hidden" value={stats.tracks_hidden} />
            <MetricTile label="Likes" value={stats.total_likes} />
          </Stack>
        ) : null}

        <Box component="form" onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              sx={{ minWidth: 190 }}
            >
              {statusFilters.map((filter) => (
                <MenuItem key={filter.value} value={filter.value}>
                  {filter.label}
                </MenuItem>
              ))}
            </AppTextField>
            <AppTextField
              fullWidth
              label="Search by track or artist"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
              Search
            </ActionButton>
            <ActionButton variant="outlined" onClick={() => void loadAdminData()} startIcon={<RefreshRoundedIcon />}>
              Refresh
            </ActionButton>
          </Stack>
        </Box>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading staff track queue...</Typography>
          </Stack>
        ) : null}

        {!loading && tracks.length === 0 ? <Alert severity="info">No tracks for the current filter.</Alert> : null}

        <Stack spacing={1.5}>
          {tracks.map((track) => {
            const busy = actionTrackId === track.id;
            const artworkTrack = track.status === 'hidden' ? { ...track, cover_image_url: null } : track;
            const playable = canPlayInStaffPanel(track);

            return (
              <Card key={track.id} variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                    <TrackArtwork track={artworkTrack} size={84} radius={18} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={track.status} color={track.status === 'approved' ? 'success' : track.status === 'hidden' ? 'error' : 'warning'} size="small" />
                        <Chip label={`#${track.id}`} variant="outlined" size="small" />
                        <Chip label={formatTime(track.duration_seconds ?? 0)} variant="outlined" size="small" />
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {track.title}
                      </Typography>
                      <Typography color="text.secondary">
                        {track.user?.username ?? `user ${track.user_id}`} · {track.category?.name ?? 'Uncategorized'} · Likes {track.like_count} · Plays {track.play_count}
                      </Typography>
                      {track.rejection_reason ? <Typography color="error.main">{track.rejection_reason}</Typography> : null}
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                      <ActionButton
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={() => void player.playTrack(track)}
                        disabled={!playable || busy}
                      >
                        Playback
                      </ActionButton>
                      {track.status !== 'hidden' && track.status !== 'deleted' ? (
                        <ActionButton color="warning" variant="outlined" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'hidden')}>
                          Hide
                        </ActionButton>
                      ) : track.status === 'hidden' ? (
                        <ActionButton color="success" variant="contained" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'approved')}>
                          Restore
                        </ActionButton>
                      ) : null}
                      {track.status !== 'rejected' && track.status !== 'hidden' && track.status !== 'deleted' ? (
                        <ActionButton color="error" variant="outlined" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'rejected')}>
                          Reject
                        </ActionButton>
                      ) : null}
                      {track.status !== 'deleted' ? (
                        <ActionButton
                          color="error"
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          disabled={busy}
                          onClick={() => void deleteTrack(track)}
                        >
                          Delete
                        </ActionButton>
                      ) : null}
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
