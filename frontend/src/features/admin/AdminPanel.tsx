import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, Box, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, Typography } from '@mui/material';

import { TrackArtwork } from '@/entities/track/ui';
import { getTrackStatusLabel } from '@/entities/track/model/track';
import { AdminCollectionsPanel } from '@/features/admin/collections/AdminCollectionsPanel';
import { SiteContentPanel } from '@/features/admin/SiteContentPanel';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import api from '@/shared/api/client';
import { AdminSystemStats, Track, TrackReport, TrackStatus } from '@/shared/api/types';
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
  onSiteContentUpdated?: () => void | Promise<void>;
}

type StatusFilter = 'all' | TrackStatus;

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  moderator: 'Модератор',
  user: 'Пользователь',
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все активные' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'processing', label: 'Обработка' },
  { value: 'approved', label: 'Опубликованы' },
  { value: 'rejected', label: 'Отклонены' },
  { value: 'hidden', label: 'Скрыты' },
  { value: 'deleted', label: 'Удалены' },
];

function canPlayInStaffPanel(track: Track): boolean {
  return track.status === 'approved' || Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
}

export function AdminPanel({ auth, player, onSiteContentUpdated }: AdminPanelProps) {
  if (!auth.user) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning">Войдите в аккаунт с правами управления.</Alert>
      </SectionCard>
    );
  }

  if (!auth.isStaff) {
    return (
      <SectionCard tone="orange">
        <Alert severity="warning" icon={<ShieldRoundedIcon fontSize="inherit" />}>
          Этот раздел доступен только команде управления.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <Stack spacing={3}>
      <AdminTrackControl auth={auth} player={player} />
      <AdminReportsPanel player={player} />
      <SiteContentPanel onSaved={onSiteContentUpdated} />
      <AdminCollectionsPanel auth={auth} player={player} />
    </Stack>
  );
}

function AdminReportsPanel({ player }: { player: UseAudioPlayerResult }) {
  const [reports, setReports] = useState<TrackReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionReportId, setActionReportId] = useState<number | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setPanelError(null);
    try {
      const response = await api.getAdminReports({ status: 'open', size: 25 });
      setReports(response.items);
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось загрузить жалобы'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const resolveReport = async (report: TrackReport, hideTrack: boolean) => {
    const notes = window.prompt(hideTrack ? 'Причина скрытия' : 'Комментарий', report.description ?? '');
    if (notes === null) {
      return;
    }

    setActionReportId(report.id);
    setPanelError(null);
    setPanelMessage(null);

    try {
      await api.resolveAdminReport(report.id, {
        status: hideTrack ? 'resolved' : 'dismissed',
        resolution_notes: notes || null,
        hide_track: hideTrack,
      });
      if (hideTrack && report.track_id && player.activeTrackId === report.track_id) {
        player.stopAndResetAudio();
      }
      setPanelMessage(hideTrack ? 'Жалоба обработана, трек скрыт.' : 'Жалоба отклонена.');
      await loadReports();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось обработать жалобу'));
    } finally {
      setActionReportId(null);
    }
  };

  return (
    <SectionCard tone="orange">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h4">Жалобы на треки</Typography>
            <Typography color="text.secondary">Новые обращения слушателей по уже опубликованным релизам.</Typography>
          </Box>
          <ActionButton variant="outlined" onClick={() => void loadReports()} startIcon={<RefreshRoundedIcon />}>
            Обновить
          </ActionButton>
        </Stack>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем жалобы...</Typography>
          </Stack>
        ) : null}
        {!loading && reports.length === 0 ? <Alert severity="info">Открытых жалоб нет.</Alert> : null}

        <Stack spacing={1.5}>
          {reports.map((report) => {
            const track = report.track;
            const busy = actionReportId === report.id;

            return (
              <Card key={report.id} variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                    {track ? <TrackArtwork track={track} size={76} radius={16} /> : null}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={report.reason} color="warning" size="small" />
                        <Chip label={`жалоба #${report.id}`} variant="outlined" size="small" />
                        {track ? <Chip label={getTrackStatusLabel(track.status)} variant="outlined" size="small" /> : null}
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {track?.title ?? `Трек ${report.track_id ?? 'удалён'}`}
                      </Typography>
                      {report.description ? <Typography color="text.secondary">{report.description}</Typography> : null}
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {track ? (
                        <ActionButton
                          variant="contained"
                          size="small"
                          startIcon={<PlayArrowRoundedIcon />}
                          onClick={() => void player.playTrack(track)}
                          disabled={!canPlayInStaffPanel(track) || busy}
                        >
                          Слушать
                        </ActionButton>
                      ) : null}
                      <ActionButton color="warning" variant="contained" size="small" disabled={busy || !track} onClick={() => void resolveReport(report, true)}>
                        Скрыть трек
                      </ActionButton>
                      <ActionButton variant="outlined" size="small" disabled={busy} onClick={() => void resolveReport(report, false)}>
                        Отклонить
                      </ActionButton>
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
      setPanelError(getErrorMessage(err, 'Не удалось загрузить список треков'));
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
        ? window.prompt(`Причина скрытия "${track.title}"`, defaultReason)
        : nextStatus === 'rejected'
          ? window.prompt(`Причина отклонения "${track.title}"`, defaultReason)
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
      setPanelMessage(`Статус трека "${track.title}" обновлён.`);
      await loadAdminData();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось изменить статус трека'));
    } finally {
      setActionTrackId(null);
    }
  };

  const deleteTrack = async (track: Track) => {
    if (!window.confirm(`Удалить трек "${track.title}"?`)) {
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
      setPanelMessage(`Трек "${track.title}" удалён.`);
      await loadAdminData();
    } catch (err) {
      setPanelError(getErrorMessage(err, 'Не удалось удалить трек'));
    } finally {
      setActionTrackId(null);
    }
  };

  return (
    <SectionCard tone="blue">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Управление треками</Typography>
            <Typography color="text.secondary">
              Последние загрузки, скрытие, восстановление, отклонение и удаление треков.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShieldRoundedIcon />} label={roleLabels[auth.user?.role ?? ''] ?? 'Команда проекта'} color="secondary" variant="outlined" />
            <Chip label={`Видимых ${totalVisible}`} variant="outlined" />
          </Stack>
        </Stack>

        {stats ? (
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <MetricTile label="Пользователей" value={stats.total_users} />
            <MetricTile label="Треков" value={stats.total_tracks} />
            <MetricTile label="Скрыто" value={stats.tracks_hidden} />
            <MetricTile label="Лайков" value={stats.total_likes} />
          </Stack>
        ) : null}

        <Box component="form" onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField
              select
              label="Статус"
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
              label="Поиск по треку или артисту"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
              Найти
            </ActionButton>
            <ActionButton variant="outlined" onClick={() => void loadAdminData()} startIcon={<RefreshRoundedIcon />}>
              Обновить
            </ActionButton>
          </Stack>
        </Box>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}

        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем треки...</Typography>
          </Stack>
        ) : null}

        {!loading && tracks.length === 0 ? <Alert severity="info">По текущему фильтру треков нет.</Alert> : null}

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
                        <Chip label={getTrackStatusLabel(track.status)} color={track.status === 'approved' ? 'success' : track.status === 'hidden' ? 'error' : 'warning'} size="small" />
                        <Chip label={`#${track.id}`} variant="outlined" size="small" />
                        <Chip label={formatTime(track.duration_seconds ?? 0)} variant="outlined" size="small" />
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {track.title}
                      </Typography>
                      <Typography color="text.secondary">
                        {track.user?.username ?? `Пользователь ${track.user_id}`} · {track.category?.name ?? 'Без категории'} · Лайки {track.like_count} · Прослушивания {track.play_count}
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
                        Слушать
                      </ActionButton>
                      {track.status !== 'hidden' && track.status !== 'deleted' ? (
                        <ActionButton color="warning" variant="outlined" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'hidden')}>
                          Скрыть
                        </ActionButton>
                      ) : track.status === 'hidden' ? (
                        <ActionButton color="success" variant="contained" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'approved')}>
                          Восстановить
                        </ActionButton>
                      ) : null}
                      {track.status !== 'rejected' && track.status !== 'hidden' && track.status !== 'deleted' ? (
                        <ActionButton color="error" variant="outlined" size="small" disabled={busy} onClick={() => void moderateTrack(track, 'rejected')}>
                          Отклонить
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
                          Удалить
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
