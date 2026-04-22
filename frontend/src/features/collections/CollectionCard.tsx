import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { Collection, Track } from '@/shared/api/types';
import { PlayArrowRoundedIcon, QueueMusicRoundedIcon } from '@/shared/ui/icons';

interface CollectionCardProps {
  collection: Collection;
  onPlayTrack: (track: Track) => void;
}

export function CollectionCard({ collection, onPlayTrack }: CollectionCardProps) {
  const firstTrack = collection.tracks[0];

  return (
    <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box
            sx={{
              alignItems: 'center',
              aspectRatio: '16 / 9',
              background: collection.cover_image_url
                ? `url(${collection.cover_image_url}) center / cover`
                : 'linear-gradient(135deg, #0f766e 0%, #f97316 100%)',
              borderRadius: 3,
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
              <Chip label={collection.is_public ? 'Public' : 'Draft'} color={collection.is_public ? 'success' : 'default'} size="small" />
              <Chip label={`${collection.track_count} tracks`} variant="outlined" size="small" />
            </Stack>
            <Typography variant="h5">{collection.name}</Typography>
            {collection.description ? <Typography color="text.secondary">{collection.description}</Typography> : null}
          </Stack>

          {collection.tracks.length > 0 ? (
            <Stack spacing={0.5}>
              {collection.tracks.slice(0, 4).map((track) => (
                <Typography key={track.id} variant="body2" color="text.secondary" noWrap>
                  {track.title} by {track.user?.username ?? 'Unknown artist'}
                </Typography>
              ))}
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button component={RouterLink} to={`/collections/${collection.id}`} variant="outlined" size="small">
              Open
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowRoundedIcon />}
              disabled={!firstTrack}
              onClick={() => firstTrack && onPlayTrack(firstTrack)}
            >
              Play first
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
