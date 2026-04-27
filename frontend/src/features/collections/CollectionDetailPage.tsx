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
import { ActionButton, PageHeader, SectionCard } from '@/shared/ui';
import { PlayArrowRoundedIcon } from '@/shared/ui/icons';

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
      setError('Подборка не найдена');
      setLoading(false);
      return;
    }

    const loadCollection = async () => {
      setLoading(true);
      setError(null);

      try {
        setCollection(await api.getCollection(collectionId));
      } catch (err) {
        setError(getErrorMessage(err, 'Не удалось загрузить подборку'));
      } finally {
        setLoading(false);
      }
    };

    void loadCollection();
  }, [id]);

  return (
    <Stack spacing={2.5}>
      <SectionCard tone="orange" sx={{ overflow: 'hidden', p: 0 }}>
        <Box
          sx={{
            aspectRatio: { xs: '1.8 / 1', md: '3.2 / 1' },
            background: collection?.cover_image_url
              ? `linear-gradient(180deg, rgba(11,11,16,0.2), rgba(11,11,16,0.72)), url(${collection.cover_image_url}) center / cover`
              : 'linear-gradient(135deg, #2d174e, #8f1023, #ff5f7a)',
          }}
        />
        <Stack spacing={2.5} sx={{ p: { xs: 2.5, md: 3.5 } }}>
          {loading ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Загружаем подборку...</Typography>
            </Stack>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {collection ? (
            <PageHeader
              eyebrow="Подборка"
              title={collection.name}
              description={collection.description || 'Треки, отобранные редакцией Resonance Sound.'}
              actions={
                <ActionButton
                  variant="contained"
                  startIcon={<PlayArrowRoundedIcon />}
                  disabled={collection.tracks.length === 0}
                  onClick={() => void player.playTrackQueue(collection.tracks)}
                >
                  Слушать подборку
                </ActionButton>
              }
            />
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard tone="neutral">
        <Stack spacing={2.5}>
          <PageHeader
            eyebrow="Треки"
            title="Треки подборки"
            description="Подборка воспроизводится очередью в заданном порядке."
          />
          {collection && collection.tracks.length === 0 ? <Alert severity="info">В подборке пока нет публичных треков.</Alert> : null}

          {collection?.tracks.map((track) => (
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
              onPlayTrack={(selectedTrack) => void player.playTrackQueue(collection.tracks, collection.tracks.findIndex((item) => item.id === selectedTrack.id))}
              onToggleLike={(selectedTrack) => void trackActions.toggleLike(selectedTrack)}
              onEditTrack={trackActions.startEditingTrack}
              onDeleteTrack={(selectedTrack) => void trackActions.deleteTrack(selectedTrack)}
              onUploadTrack={(selectedTrack, file) => void trackActions.uploadTrack(selectedTrack, file)}
              onUploadCover={(selectedTrack, file) => void trackActions.uploadCover(selectedTrack, file)}
            />
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
