import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

import { canUploadTrackMedia, getOwnerTrackState, getTrackStatusColor, getTrackStatusLabel, hasPlayableMedia } from '@/entities/track/model/track';
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
  onReportTrack?: (track: Track) => void;
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
  onReportTrack,
  onUploadTrack,
  onUploadCover,
}: TrackCardProps) {
  const ownerState = getOwnerTrackState(track);
  const playable = hasPlayableMedia(track);
  const artistSlug = track.artist?.slug ?? track.user?.username;
  const artistName = track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Неизвестный артист';

  return (
    <Card
      data-track-card={track.id}
      variant="outlined"
      sx={{
        background: active
          ? 'linear-gradient(180deg, rgba(255,23,23,0.13), rgba(10,10,12,0.96))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
        borderColor: active ? alpha('#ff1717', 0.46) : 'rgba(255,38,38,0.12)',
        borderRadius: 5,
        boxShadow: active ? '0 0 32px rgba(255,23,23,0.16)' : 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.25} alignItems={{ xs: 'stretch', lg: 'center' }}>
            <TrackArtwork track={track} size={variant === 'mine' ? 124 : 104} radius={variant === 'mine' ? 26 : 22} />

            <Stack spacing={1.4} flex={1} minWidth={0}>
              <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" spacing={1.25}>
                <Box minWidth={0}>
                  <Typography
                    component={RouterLink}
                    to={`/tracks/${track.id}`}
                    variant="h5"
                    sx={{ color: 'inherit', textDecoration: 'none', display: 'inline-block' }}
                  >
                    {track.title}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                    {artistSlug ? (
                      <Typography
                        component={RouterLink}
                        to={`/artists/${artistSlug}`}
                        color="text.secondary"
                        sx={{ textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
                      >
                        {artistName}
                      </Typography>
                    ) : (
                      <Typography color="text.secondary">{artistName}</Typography>
                    )}
                    <Typography color="text.secondary">•</Typography>
                    <Typography color="text.secondary">{track.genre || track.category?.name || 'Без жанра'}</Typography>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', xl: 'flex-end' }}>
                  <Chip label={getTrackStatusLabel(track.status)} color={getTrackStatusColor(track.status)} size="small" />
                  <Chip label={`Прослушивания ${track.play_count}`} variant="outlined" size="small" />
                  <Chip label={`Лайки ${track.like_count}`} variant="outlined" size="small" />
                </Stack>
              </Stack>

              {variant === 'mine' ? (
                <Alert severity={ownerState.tone}>
                  <strong>{ownerState.title}</strong> {ownerState.description}
                </Alert>
              ) : null}

              <Typography color="text.secondary">
                {track.description || (track.tags?.length ? `Теги: ${track.tags.join(', ')}` : 'Трек уже доступен в каталоге.')}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={formatTime(track.duration_seconds ?? 0)} size="small" variant="outlined" />
                <Chip label={track.cover_image_url ? 'Обложка есть' : 'Без обложки'} size="small" variant="outlined" />
                {variant === 'mine' ? (
                  <>
                    <Chip label={track.original_url ? 'Аудио загружено' : 'Нет аудио'} size="small" variant="outlined" />
                    <Chip label={track.mp3_320_url ? 'Готов к прослушиванию' : 'Обрабатывается'} size="small" variant="outlined" />
                  </>
                ) : null}
              </Stack>
            </Stack>
          </Stack>

          <WaveformPreview track={track} active={active} />

          {variant === 'mine' && track.rejection_reason ? <Alert severity="error">{track.rejection_reason}</Alert> : null}

          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={1} justifyContent="space-between">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ActionButton
                variant="contained"
                size="small"
                startIcon={active && isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                onClick={() => onPlayTrack(track)}
                disabled={!playable}
              >
                {active && isPlaying ? 'Пауза' : variant === 'mine' ? 'Проверить' : 'Слушать'}
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

              {variant === 'catalog' && onReportTrack ? (
                <ActionButton variant="outlined" color="warning" size="small" onClick={() => onReportTrack(track)}>
                  Пожаловаться
                </ActionButton>
              ) : null}

              {variant === 'mine' ? (
                <>
                  <ActionButton variant="outlined" size="small" onClick={() => onEditTrack(track)}>
                    Редактировать
                  </ActionButton>
                  <ActionButton variant="outlined" size="small" component="label" startIcon={<PhotoCameraRoundedIcon />} disabled={studioBusy}>
                    {uploadingCoverTrackId === track.id ? 'Загружаем обложку...' : track.cover_image_url ? 'Заменить обложку' : 'Загрузить обложку'}
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
                    {uploadingTrackId === track.id ? 'Загружаем аудио...' : track.original_url ? 'Заменить аудио' : 'Загрузить аудио'}
                    <input
                      hidden
                      type="file"
                      accept=".mp3,.wav,.flac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/mp4"
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
              <ActionButton variant="outlined" color="error" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDeleteTrack(track)}>
                Удалить
              </ActionButton>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
