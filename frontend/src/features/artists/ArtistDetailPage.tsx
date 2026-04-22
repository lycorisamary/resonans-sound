import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Chip, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { TrackCard } from '@/entities/track/ui';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import api from '@/shared/api/client';
import { ArtistProfile, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { SectionCard } from '@/shared/ui';

interface ArtistDetailPageProps {
  auth: UseAuthResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function ArtistDetailPage({ auth, player, trackActions }: ArtistDetailPageProps) {
  const { username } = useParams();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setError('Artist username is missing.');
      setLoading(false);
      return;
    }

    const loadArtist = async () => {
      try {
        setLoading(true);
        setError(null);
        const [loadedArtist, loadedTracks] = await Promise.all([
          api.getArtist(username),
          api.getArtistTracks(username, { size: 50, sort: 'newest' }),
        ]);
        setArtist(loadedArtist);
        setTracks(loadedTracks.items);
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load artist.'));
      } finally {
        setLoading(false);
      }
    };

    void loadArtist();
  }, [username]);

  return (
    <Stack spacing={3}>
      <SectionCard tone="green" sx={{ overflow: 'hidden', p: 0 }}>
        {artist?.banner_image_url ? (
          <Box
            sx={{
              minHeight: { xs: 150, md: 220 },
              backgroundImage: `url(${artist.banner_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <Box sx={{ minHeight: { xs: 150, md: 220 }, background: 'linear-gradient(135deg, #d7f5ef, #fff7ed)' }} />
        )}
        <Stack spacing={2.5} sx={{ p: { xs: 2.5, md: 3.5 } }}>
          {loading ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={20} />
              <Typography>Loading artist...</Typography>
            </Stack>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {artist ? (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Avatar src={artist.avatar_url ?? undefined} sx={{ width: 96, height: 96, bgcolor: '#0f766e', fontSize: 36 }}>
                  {(artist.display_name || artist.slug).slice(0, 1).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h3">{artist.display_name || artist.slug}</Typography>
                  <Typography color="text.secondary">/artists/{artist.slug}</Typography>
                  {artist.location ? <Typography color="text.secondary">{artist.location}</Typography> : null}
                </Box>
              </Stack>

              {artist.bio ? <Typography sx={{ maxWidth: 880 }}>{artist.bio}</Typography> : null}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Tracks ${artist.track_count}`} />
                <Chip label={`Plays ${artist.play_count}`} variant="outlined" />
                <Chip label={`Likes ${artist.like_count}`} variant="outlined" />
                {artist.profile_genres.map((genre) => (
                  <Chip key={genre} label={genre} variant="outlined" />
                ))}
              </Stack>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {Object.entries({ ...artist.social_links, ...artist.streaming_links }).map(([key, url]) => (
                  <Link key={`${key}-${url}`} href={url} target="_blank" rel="noreferrer" underline="hover">
                    {key}
                  </Link>
                ))}
              </Stack>
            </>
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard tone="neutral">
        <Stack spacing={2.5}>
          <Typography variant="h4">Tracks</Typography>
          {!loading && tracks.length === 0 ? <Alert severity="info">This artist has no public approved tracks yet.</Alert> : null}
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
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
              onPlayTrack={(selectedTrack) => void player.playTrackQueue(tracks, tracks.findIndex((item) => item.id === selectedTrack.id))}
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
