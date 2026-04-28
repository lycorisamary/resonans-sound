import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { ArtistProfile } from '@/shared/api/types';
import { ActionButton, SectionCard } from '@/shared/ui';

interface ArtistSpotlightCardProps {
  artist: ArtistProfile;
  compact?: boolean;
}

export function ArtistSpotlightCard({ artist, compact = false }: ArtistSpotlightCardProps) {
  const artistName = artist.display_name || artist.slug;

  return (
    <SectionCard tone="neutral" sx={{ height: '100%', p: compact ? 1.75 : 2.25 }}>
      <Stack spacing={compact ? 1.25 : 1.5}>
        <Box
          component={RouterLink}
          to={`/artists/${artist.slug}`}
          sx={{
            aspectRatio: compact ? '1.1 / 1' : '1.8 / 1',
            backgroundImage: artist.banner_image_url
              ? `linear-gradient(180deg, rgba(11,11,16,0.18), rgba(11,11,16,0.62)), url(${artist.banner_image_url})`
              : 'radial-gradient(circle at 50% 15%, rgba(255,23,23,0.18), transparent 26%), linear-gradient(135deg, #150307 0%, #2b0508 50%, #050506 100%)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            borderRadius: 4,
            display: 'block',
            position: 'relative',
          }}
        />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar src={artist.avatar_url ?? undefined} sx={{ bgcolor: 'primary.main', width: compact ? 48 : 56, height: compact ? 48 : 56 }}>
            {artistName.slice(0, 1).toUpperCase()}
          </Avatar>
          <Box minWidth={0}>
            <Typography component={RouterLink} to={`/artists/${artist.slug}`} variant={compact ? 'h6' : 'h5'} sx={{ color: 'inherit', textDecoration: 'none' }} noWrap>
              {artistName}
            </Typography>
            <Typography color="text.secondary" noWrap>
              {artist.location ? `${artist.location} • ${artist.track_count} релизов` : `${artist.track_count} релизов на витрине`}
            </Typography>
          </Box>
        </Stack>

        <Typography color="text.secondary" sx={{ minHeight: compact ? 64 : 72 }}>
          {artist.bio || 'Публичный профиль артиста с релизами, жанровым контекстом и шансом попасть в ручной отбор.'}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${artist.play_count} прослушиваний`} size="small" variant="outlined" />
          <Chip label={`${artist.like_count} лайков`} size="small" variant="outlined" />
          {artist.profile_genres.slice(0, compact ? 2 : 3).map((item) => (
            <Chip key={item} label={item} size="small" />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <ActionButton component={RouterLink} to={`/artists/${artist.slug}`} variant="outlined" size="small">
            Профиль артиста
          </ActionButton>
          <ActionButton component={RouterLink} to={`/artists/${artist.slug}`} variant="contained" size="small">
            Открыть релизы
          </ActionButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
