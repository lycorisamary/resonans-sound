import { Alert, Box, Chip, MenuItem, Paper, Stack, Typography } from '@mui/material';

import { emptyTrack } from '@/entities/track/model/track';
import { TrackArtwork } from '@/entities/track/ui';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { StreamQuality } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/time';
import { AppTextField } from '@/shared/ui';

interface PlayerPanelProps {
  player: UseAudioPlayerResult;
}

export function PlayerPanel({ player }: PlayerPanelProps) {
  const track = player.activeTrack;

  return (
    <Paper
      elevation={8}
      sx={{
        background: 'rgba(5,5,7,0.86)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,35,35,0.18)',
        borderRadius: { xs: 0, md: 5 },
        bottom: { xs: 0, md: 18 },
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 38px rgba(255,23,23,0.08)',
        left: { xs: 0, md: '50%' },
        maxWidth: { xs: '100%', md: 1180 },
        mx: 'auto',
        p: { xs: 1.2, md: 1.5 },
        position: 'fixed',
        right: { xs: 0, md: 'auto' },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        width: { xs: '100%', md: 'calc(100% - 56px)' },
        zIndex: 40,
      }}
    >
      <Stack spacing={1}>
        {player.playerError ? <Alert severity="error">{player.playerError}</Alert> : null}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <TrackArtwork track={track ?? emptyTrack} size={56} radius={14} />

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, maxWidth: { xs: '100%', sm: 360 } }}>
                  {track?.title ?? 'Выберите трек'}
                </Typography>
                <Chip
                  size="small"
                  label={player.playerLoading ? 'Загрузка' : player.isPlaying ? 'Играет' : track ? 'Пауза' : 'Ожидание'}
                  color={player.playerLoading ? 'warning' : player.isPlaying ? 'success' : 'default'}
                  variant={player.isPlaying || player.playerLoading ? 'filled' : 'outlined'}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" noWrap>
                {track
                  ? `${track.artist?.display_name || track.user?.display_name || track.user?.username || 'Неизвестный артист'} • ${formatTime(player.playerCurrentTime)} / ${formatTime(player.playerDuration || (track.duration_seconds ?? 0))}`
                  : 'Плеер готов к прослушиванию.'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <AppTextField
              select
              label="Качество"
              size="small"
              value={player.playerQuality}
              onChange={(event) => player.setPlayerQuality(event.target.value as StreamQuality)}
              sx={{ minWidth: { xs: '100%', sm: 132 } }}
            >
              <MenuItem value="128">128 kbps</MenuItem>
              <MenuItem value="320">320 kbps</MenuItem>
              <MenuItem value="original">Оригинал</MenuItem>
            </AppTextField>

            <Box sx={{ minWidth: { xs: '100%', sm: 340 } }}>
              <audio ref={player.audioRef} controls style={{ width: '100%', height: 42 }} />
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
