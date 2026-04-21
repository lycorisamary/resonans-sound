import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { Track } from '@/shared/api/types';

const artworkColors = ['#0f766e', '#f97316', '#1d4ed8', '#be123c', '#6d28d9'];

interface TrackArtworkProps {
  track: Track;
  size?: number;
  radius?: number;
}

export function TrackArtwork({ track, size = 88, radius = 24 }: TrackArtworkProps) {
  const accent = artworkColors[track.id % artworkColors.length];
  const fallbackLabel = (track.title || 'R').slice(0, 1).toUpperCase();

  if (track.cover_image_url) {
    return (
      <Box
        component="img"
        src={track.cover_image_url}
        alt={`Обложка ${track.title}`}
        sx={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: `${radius}px`,
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 16px 32px rgba(15,23,42,0.12)',
          flexShrink: 0,
          backgroundColor: '#f8fafc',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${radius}px`,
        background: `linear-gradient(135deg, ${alpha(accent, 0.94)} 0%, ${alpha('#111827', 0.88)} 100%)`,
        color: '#fff7ed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(24, Math.round(size * 0.28)),
        fontWeight: 800,
        letterSpacing: '-0.04em',
        boxShadow: '0 16px 32px rgba(15,23,42,0.14)',
        flexShrink: 0,
      }}
    >
      {fallbackLabel}
    </Box>
  );
}
