import { useEffect, useState } from 'react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { TrackCard } from '@/entities/track/ui';
import api from '@/shared/api/client';
import { Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { SectionCard } from '@/shared/ui';

interface TrackDetailPageProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function TrackDetailPage({ auth, player, trackActions }: TrackDetailPageProps) {
  const { id } = useParams();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrack = async () => {
      const trackId = Number(id);
      if (!Number.isInteger(trackId) || trackId <= 0) {
        setError('Некорректный идентификатор трека.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setTrack(await api.getTrack(trackId));
      } catch (err) {
        setError(getErrorMessage(err, 'Не удалось загрузить трек'));
      } finally {
        setLoading(false);
      }
    };

    void loadTrack();
  }, [id]);

  return (
    <SectionCard tone="neutral">
      <Stack spacing={3}>
        <Typography variant="h4">Страница трека</Typography>
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем трек...</Typography>
          </Stack>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {track ? (
          <TrackCard
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
            onReportTrack={(selectedTrack) => void trackActions.reportTrack(selectedTrack)}
            onEditTrack={trackActions.startEditingTrack}
            onDeleteTrack={(selectedTrack) => void trackActions.deleteTrack(selectedTrack)}
            onUploadTrack={(selectedTrack, file) => void trackActions.uploadTrack(selectedTrack, file)}
            onUploadCover={(selectedTrack, file) => void trackActions.uploadCover(selectedTrack, file)}
          />
        ) : null}
      </Stack>
    </SectionCard>
  );
}
