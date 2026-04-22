import { useEffect, useState } from 'react';

import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import api from '@/shared/api/client';
import { Collection } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { SectionCard } from '@/shared/ui';

interface CollectionDetailPageProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function CollectionDetailPage({ auth, player, trackActions }: CollectionDetailPageProps) {
  const { id } = useParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const collectionId = Number(id);
    if (!Number.isFinite(collectionId) || collectionId <= 0) {
      setError('Collection not found');
      setLoading(false);
      return;
    }

    const loadCollection = async () => {
      setLoading(true);
      setError(null);

      try {
        setCollection(await api.getCollection(collectionId));
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load collection'));
      } finally {
        setLoading(false);
      }
    };

    void loadCollection();
  }, [id]);

  return (
    <SectionCard tone="orange">
      <Stack spacing={3}>
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading collection...</Typography>
          </Stack>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {collection ? (
          <>
            <Box>
              <Typography variant="h4">{collection.name}</Typography>
              <Typography color="text.secondary">
                {collection.description || 'Curated tracks selected by the Resonance Sound staff.'}
              </Typography>
            </Box>

            {collection.tracks.length === 0 ? <Alert severity="info">This collection has no public tracks.</Alert> : null}

            <Stack spacing={2}>
              {collection.tracks.map((track) => (
                <TrackCard
                  key={`collection-${collection.id}-${track.id}`}
                  track={track}
                  variant="catalog"
                  active={player.activeTrackId === track.id && (player.isPlaying || player.playerLoading)}
                  isPlaying={player.isPlaying}
                  playerLoading={player.playerLoading}
                  liked={trackActions.isTrackLiked(track.id)}
                  likeDisabled={!auth.user}
                  deleteAllowed={trackActions.canDeleteTrack(track)}
                  studioBusy={trackActions.studioBusy}
                  uploadingTrackId={trackActions.uploadingTrackId}
                  uploadingCoverTrackId={trackActions.uploadingCoverTrackId}
                  onPlayTrack={(selectedTrack) => void player.playTrack(selectedTrack)}
                  onToggleLike={(selectedTrack) => void trackActions.toggleLike(selectedTrack)}
                  onEditTrack={trackActions.startEditingTrack}
                  onDeleteTrack={(selectedTrack) => void trackActions.deleteTrack(selectedTrack)}
                  onUploadTrack={(selectedTrack, file) => void trackActions.uploadTrack(selectedTrack, file)}
                  onUploadCover={(selectedTrack, file) => void trackActions.uploadCover(selectedTrack, file)}
                />
              ))}
            </Stack>
          </>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
