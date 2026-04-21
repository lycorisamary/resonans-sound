import { Box, Stack } from '@mui/material';

import { Track } from '@/shared/api/types';

interface WaveformPreviewProps {
  track: Track;
  active: boolean;
}

export function WaveformPreview({ track, active }: WaveformPreviewProps) {
  const samples = track.waveform_data_json?.samples ?? [];

  if (samples.length === 0) {
    return (
      <Box
        sx={{
          height: 56,
          borderRadius: 999,
          border: '1px dashed rgba(15,118,110,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: 12,
          bgcolor: 'rgba(255,255,255,0.5)',
        }}
      >
        Waveform появится после media processing.
      </Box>
    );
  }

  const step = Math.max(1, Math.floor(samples.length / 64));
  const downsampled = samples.filter((_, index) => index % step === 0).slice(0, 64);

  return (
    <Stack
      direction="row"
      spacing={0.35}
      alignItems="end"
      sx={{
        height: 56,
        px: 1.25,
        py: 0.75,
        borderRadius: 999,
        bgcolor: active ? 'rgba(15,118,110,0.12)' : 'rgba(15,23,42,0.04)',
        border: '1px solid rgba(15,118,110,0.12)',
      }}
    >
      {downsampled.map((value, index) => (
        <Box
          key={`${track.id}-${index}`}
          sx={{
            width: 4,
            minHeight: 6,
            height: `${Math.max(10, Math.round(Number(value || 0) * 100))}%`,
            borderRadius: 999,
            bgcolor: active ? '#0f766e' : 'rgba(15,118,110,0.38)',
            flexShrink: 0,
          }}
        />
      ))}
    </Stack>
  );
}
