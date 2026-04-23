import { useEffect, useState } from 'react';

import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import api from '@/shared/api/client';
import { Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, PageHeader, SectionCard } from '@/shared/ui';

interface TrackDetailPageProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function TrackDetailPage({ auth, player, trackActions }: TrackDetailPageProps) {
  const { id } = useParams();
  const [track, setTrack] = useState<Track | null>(null);
  const [artistTracks, setArtistTracks] = useState<Track[]>([]);
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
        const loadedTrack = await api.getTrack(trackId);
        setTrack(loadedTrack);

        const artistSlug = loadedTrack.artist?.slug ?? loadedTrack.user?.username;
        if (artistSlug) {
          const related = await api.getArtistTracks(artistSlug, { size: 8, sort: 'popular' });
          setArtistTracks(related.items.filter((item) => item.id !== loadedTrack.id));
        } else {
          setArtistTracks([]);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Не удалось загрузить трек'));
      } finally {
        setLoading(false);
      }
    };

    void loadTrack();
  }, [id]);

  return (
    <Stack spacing={2.5}>
      <SectionCard tone="orange" sx={{ overflow: 'hidden', p: 0 }}>
        <Grid container>
          <Grid item xs={12} lg={5}>
            <Box
              sx={{
                aspectRatio: { xs: '1 / 1', lg: '1 / 1.05' },
                background: track?.cover_image_url
                  ? `linear-gradient(180deg, rgba(11,11,16,0.18), rgba(11,11,16,0.5)), url(${track.cover_image_url}) center / cover`
                  : 'linear-gradient(135deg, #7a1631, #cf6e82 48%, #f1c7bc 100%)',
              }}
            />
          </Grid>
          <Grid item xs={12} lg={7}>
            <Stack spacing={2.5} sx={{ p: { xs: 2.5, md: 3.5 } }}>
              {loading ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <CircularProgress size={20} />
                  <Typography>Загружаем трек...</Typography>
                </Stack>
              ) : null}
              {error ? <Alert severity="error">{error}</Alert> : null}
              {track ? (
                <>
                  <PageHeader
                    eyebrow="Track page"
                    title={track.title}
                    description={`${track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Unknown artist'} • ${
                      track.genre ?? 'No genre'
                    } • ${track.play_count} plays • ${track.like_count} likes`}
                  />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {track.tags?.map((tag) => (
                      <Box
                        key={tag}
                        sx={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 999,
                          color: 'text.secondary',
                          px: 1.5,
                          py: 0.75,
                        }}
                      >
                        {tag}
                      </Box>
                    ))}
                  </Stack>
                  <Typography color="text.secondary">
                    {track.description || 'Страница трека остаётся точкой входа в релиз, playback, лайки и post-publication report flow.'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <ActionButton variant="contained" onClick={() => void player.playTrack(track)}>
                      Play
                    </ActionButton>
                    <ActionButton
                      variant={trackActions.isTrackLiked(track.id) ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => void trackActions.toggleLike(track)}
                      disabled={!auth.user}
                    >
                      {trackActions.isTrackLiked(track.id) ? 'Liked' : 'Like'}
                    </ActionButton>
                    <ActionButton variant="outlined" color="warning" onClick={() => void trackActions.reportTrack(track)}>
                      Пожаловаться
                    </ActionButton>
                  </Stack>
                </>
              ) : null}
            </Stack>
          </Grid>
        </Grid>
      </SectionCard>

      {track ? (
        <SectionCard tone="neutral">
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
        </SectionCard>
      ) : null}

      <SectionCard tone="blue">
        <Stack spacing={2.5}>
          <PageHeader
            eyebrow="More"
            title="Другие треки артиста"
            description="Related section не имитирует отсутствующую social-рекомендательную систему: здесь показываются только реальные публичные треки того же артиста."
          />
          {artistTracks.length === 0 ? <Alert severity="info">Других публичных треков этого артиста пока нет.</Alert> : null}
          {artistTracks.map((relatedTrack) => (
            <TrackCard
              key={relatedTrack.id}
              track={relatedTrack}
              variant="catalog"
              active={player.activeTrackId === relatedTrack.id && (player.isPlaying || player.playerLoading)}
              isPlaying={player.isPlaying}
              playerLoading={player.playerLoading}
              liked={trackActions.isTrackLiked(relatedTrack.id)}
              likeDisabled={!auth.user}
              deleteAllowed={trackActions.canDeleteTrack(relatedTrack)}
              studioBusy={trackActions.studioBusy}
              uploadingTrackId={trackActions.uploadingTrackId}
              uploadingCoverTrackId={trackActions.uploadingCoverTrackId}
              onPlayTrack={(selectedTrack) => void player.playTrackQueue([track!, ...artistTracks], [track!, ...artistTracks].findIndex((item) => item.id === selectedTrack.id))}
              onToggleLike={(selectedTrack) => void trackActions.toggleLike(selectedTrack)}
              onReportTrack={(selectedTrack) => void trackActions.reportTrack(selectedTrack)}
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
