import { Box, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { Collection } from '@/shared/api/types';
import { ActionButton, SectionCard } from '@/shared/ui';
import { PlayArrowRoundedIcon, QueueMusicRoundedIcon } from '@/shared/ui/icons';

interface CollectionCardProps {
  collection: Collection;
  onPlayCollection: (collection: Collection) => void;
}

export function CollectionCard({ collection, onPlayCollection }: CollectionCardProps) {
  const firstTrack = collection.tracks[0];
  const artistNames = Array.from(
    new Set(collection.tracks.map((track) => track.artist?.display_name ?? track.user?.display_name ?? track.user?.username).filter(Boolean))
  ).slice(0, 3);

  return (
    <SectionCard tone="neutral" sx={{ height: '100%', p: 2.25 }}>
      <Stack spacing={1.75}>
        <Box
          sx={{
            alignItems: 'center',
            aspectRatio: '1.45 / 1',
            background: collection.cover_image_url
              ? `url(${collection.cover_image_url}) center / cover`
              : 'radial-gradient(circle at 50% 18%, rgba(255,23,23,0.16), transparent 26%), linear-gradient(135deg, #150307 0%, #2b0508 50%, #050506 100%)',
            borderRadius: 4,
            color: 'common.white',
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {!collection.cover_image_url ? <QueueMusicRoundedIcon sx={{ fontSize: 46, opacity: 0.9 }} /> : null}
        </Box>

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={collection.is_public ? 'Открыта' : 'Черновик'} color={collection.is_public ? 'success' : 'default'} size="small" />
            <Chip label={`${collection.track_count} треков`} variant="outlined" size="small" />
            <Chip label="Редакционный отбор" color="secondary" variant="outlined" size="small" />
          </Stack>
          <Typography variant="h5">{collection.name}</Typography>
          <Typography color="text.secondary">
            {collection.description || 'Треки, отобранные редакцией Resonance Sound.'}
          </Typography>
        </Stack>

        {artistNames.length > 0 ? (
          <Typography variant="body2" color="text.secondary">
            Внутри: {artistNames.join(' • ')}
          </Typography>
        ) : null}

        {collection.tracks.length > 0 ? (
          <Stack spacing={0.5}>
            {collection.tracks.slice(0, 4).map((track) => (
              <Typography key={track.id} variant="body2" color="text.secondary" noWrap>
                {track.title} · {track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Неизвестный артист'}
              </Typography>
            ))}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <ActionButton component={RouterLink} to={`/collections/${collection.id}`} variant="outlined" size="small">
            Открыть подборку
          </ActionButton>
          <ActionButton
            variant="contained"
            size="small"
            startIcon={<PlayArrowRoundedIcon />}
            disabled={!firstTrack}
            onClick={() => onPlayCollection(collection)}
          >
            Слушать подборку
          </ActionButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
