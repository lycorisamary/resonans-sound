import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import {
  canUploadTrackMedia,
  getPlayableQualityCandidates,
  getOwnerTrackState,
  getTrackStatusColor,
  hasPlayableMedia,
} from '@/entities/track/model/track';
import api from '@/shared/api/client';
import { Track } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/time';
import { ActionButton } from '@/shared/ui';
import {
  CloudUploadRoundedIcon,
  DeleteOutlineRoundedIcon,
  FavoriteBorderRoundedIcon,
  FavoriteRoundedIcon,
  PauseRoundedIcon,
  PhotoCameraRoundedIcon,
  PlayArrowRoundedIcon,
} from '@/shared/ui/icons';
import { TrackArtwork } from './TrackArtwork';
import { WaveformPreview } from './WaveformPreview';

export type TrackCardVariant = 'catalog' | 'mine';

interface TrackCardProps {
  track: Track;
  variant: TrackCardVariant;
  active: boolean;
  isPlaying: boolean;
  playerLoading: boolean;
  liked: boolean;
  likeDisabled: boolean;
  deleteAllowed: boolean;
  studioBusy: boolean;
  uploadingTrackId: number | null;
  uploadingCoverTrackId: number | null;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onEditTrack: (track: Track) => void;
  onDeleteTrack: (track: Track) => void;
  onUploadTrack: (track: Track, file: File | null) => void;
  onUploadCover: (track: Track, file: File | null) => void;
}

export function TrackCard({
  track,
  variant,
  active,
  isPlaying,
  liked,
  likeDisabled,
  deleteAllowed,
  studioBusy,
  uploadingTrackId,
  uploadingCoverTrackId,
  onPlayTrack,
  onToggleLike,
  onEditTrack,
  onDeleteTrack,
  onUploadTrack,
  onUploadCover,
}: TrackCardProps) {
  const ownerState = getOwnerTrackState(track);
  const playable = hasPlayableMedia(track);
  const nativePreviewQuality = getPlayableQualityCandidates(track, '320')[0];
  const nativePreviewUrl = playable && track.status === 'approved' && nativePreviewQuality
    ? api.getDirectTrackStreamUrl(track.id, nativePreviewQuality)
    : null;

  return (
    <Card
      data-track-card={track.id}
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
              <ActionButton
                variant="contained"
                size="small"
                startIcon={active && isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                onClick={() => onPlayTrack(track)}
                disabled={!playable}
              >
                {active && isPlaying ? 'Пауза' : variant === 'mine' ? 'Проверить playback' : 'Слушать'}
              </ActionButton>

              {variant === 'catalog' ? (
                <ActionButton
                  variant={liked ? 'contained' : 'outlined'}
                  color="error"
                  size="small"
                  startIcon={liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                  onClick={() => onToggleLike(track)}
                  disabled={likeDisabled}
                >
                  {track.like_count}
                </ActionButton>
              ) : null}

              {variant === 'mine' ? (
                <>
                  <ActionButton variant="outlined" size="small" onClick={() => onEditTrack(track)}>
                    Редактировать
                  </ActionButton>
                  <ActionButton
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
                        onUploadCover(track, event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                  </ActionButton>
                  <ActionButton
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
                        onUploadTrack(track, event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                  </ActionButton>
                </>
              ) : null}
            </Stack>

            {deleteAllowed ? (
              <ActionButton
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineRoundedIcon />}
                onClick={() => onDeleteTrack(track)}
              >
                Удалить
              </ActionButton>
            ) : null}
          </Stack>

          {nativePreviewUrl ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                Быстрое прослушивание через нативный браузерный плеер
              </Typography>
              <audio controls preload="none" src={nativePreviewUrl} style={{ width: '100%' }} />
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
