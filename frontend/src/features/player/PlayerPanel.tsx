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
        border: '1px solid rgba(15,118,110,0.16)',
        borderRadius: { xs: 0, md: 4 },
        bottom: { xs: 0, md: 16 },
        boxShadow: '0 18px 48px rgba(15,23,42,0.18)',
        left: { xs: 0, md: '50%' },
        maxWidth: { xs: '100%', md: 980 },
        mx: 'auto',
        p: { xs: 1.25, md: 1.5 },
        position: 'fixed',
        right: { xs: 0, md: 'auto' },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        width: { xs: '100%', md: 'calc(100% - 48px)' },
        zIndex: 40,
      }}
    >
      <Stack spacing={1}>
        {player.playerError ? <Alert severity="error">{player.playerError}</Alert> : null}

        <Stack direction="row" spacing={1.25} alignItems="center">
          <TrackArtwork track={track ?? emptyTrack} size={56} radius={12} />

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, maxWidth: { xs: '100%', sm: 340 } }}>
                {track?.title ?? 'Choose a track'}
              </Typography>
              <Chip
                size="small"
                label={player.playerLoading ? 'Loading' : player.isPlaying ? 'Playing' : track ? 'Paused' : 'Idle'}
                color={player.playerLoading ? 'warning' : player.isPlaying ? 'success' : 'default'}
                variant={player.isPlaying || player.playerLoading ? 'filled' : 'outlined'}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {track ? `${track.user?.display_name || track.user?.username || 'Unknown artist'} · ${formatTime(player.playerCurrentTime)} / ${formatTime(player.playerDuration || (track.duration_seconds ?? 0))}` : 'Playback stays active across pages.'}
            </Typography>
          </Box>

          <AppTextField
            select
            label="Quality"
            size="small"
            value={player.playerQuality}
            onChange={(event) => player.setPlayerQuality(event.target.value as StreamQuality)}
            sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 132 }}
          >
            <MenuItem value="128">128 kbps</MenuItem>
            <MenuItem value="320">320 kbps</MenuItem>
            <MenuItem value="original">Original</MenuItem>
          </AppTextField>

          <Box sx={{ flex: { xs: '0 0 44%', md: '0 0 360px' }, minWidth: 160 }}>
            <audio ref={player.audioRef} controls style={{ width: '100%', height: 40 }} />
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}
