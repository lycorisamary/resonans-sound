import { Alert, Box, Chip, LinearProgress, MenuItem, Stack, Typography } from '@mui/material';

import { emptyTrack } from '@/entities/track/model/track';
import { TrackArtwork, WaveformPreview } from '@/entities/track/ui';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { StreamQuality } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/time';
import { AppTextField, SectionCard } from '@/shared/ui';

interface PlayerPanelProps {
  player: UseAudioPlayerResult;
}

export function PlayerPanel({ player }: PlayerPanelProps) {
  return (
    <SectionCard tone="blue" sx={{ flex: 1.35 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Единый player flow</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              Плеер работает поверх live API, автоматически берёт доступный stream quality и не требует отдельной ручной
              модерации для публикации.
            </Typography>
          </Box>
          <AppTextField
            select
            label="Качество"
            value={player.playerQuality}
            onChange={(event) => player.setPlayerQuality(event.target.value as StreamQuality)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="128">128 kbps</MenuItem>
            <MenuItem value="320">320 kbps</MenuItem>
            <MenuItem value="original">Original</MenuItem>
          </AppTextField>
        </Stack>

        {player.playerError ? <Alert severity="error">{player.playerError}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <TrackArtwork track={player.activeTrack ?? emptyTrack} size={160} radius={40} />

          <Stack spacing={2} flex={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h5">{player.activeTrack?.title ?? 'Выберите трек из каталога'}</Typography>
                <Typography color="text.secondary">
                  {player.activeTrack
                    ? `${player.activeTrack.user?.username ?? 'Unknown artist'} • ${player.activeTrack.category?.name ?? 'Без категории'}`
                    : 'После выбора трека здесь появятся обложка, прогресс и текущая длительность.'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={
                    player.playerLoading
                      ? 'Подключаем поток'
                      : player.isPlaying
                        ? 'Сейчас играет'
                        : player.activeTrackId
                          ? 'Готов к продолжению'
                          : 'Idle'
                  }
                  color={player.playerLoading ? 'warning' : player.isPlaying ? 'success' : 'default'}
                  variant={player.playerLoading || player.isPlaying ? 'filled' : 'outlined'}
                />
                <Chip label={`Quality ${player.playerQuality}`} variant="outlined" />
              </Stack>
            </Stack>

            <audio ref={player.audioRef} controls style={{ width: '100%' }} />

            <LinearProgress
              variant={player.playerDuration > 0 ? 'determinate' : 'indeterminate'}
              value={player.playerDuration > 0 ? Math.min(100, (player.playerCurrentTime / player.playerDuration) * 100) : 0}
              sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(15,118,110,0.08)' }}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {formatTime(player.playerCurrentTime)} / {formatTime(player.playerDuration || (player.activeTrack?.duration_seconds ?? 0))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {player.activeTrack
                  ? player.activeTrack.status === 'approved'
                    ? 'Опубликованный трек играет напрямую через API stream.'
                    : 'Для этого трека пока доступен только owner preview.'
                  : 'Выберите любой готовый трек ниже, чтобы проверить playback.'}
              </Typography>
            </Stack>

            {player.activeTrack ? <WaveformPreview track={player.activeTrack} active={player.isPlaying || player.playerLoading} /> : null}
          </Stack>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
