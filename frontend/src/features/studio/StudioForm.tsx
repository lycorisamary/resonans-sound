import { FormEvent, useEffect, useState } from 'react';

import { Alert, Box, Chip, FormControlLabel, MenuItem, Stack, Switch, Typography } from '@mui/material';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import api from '@/shared/api/client';
import { SUPPORTED_TRACK_GENRES } from '@/shared/constants/genres';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import { AutoAwesomeRoundedIcon } from '@/shared/ui/icons';

interface StudioFormProps {
  auth: UseAuthResult;
  catalog: UseCatalogResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function StudioForm({ auth, catalog, player, trackActions }: StudioFormProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [hasArtistProfile, setHasArtistProfile] = useState(false);
  const formDisabled = !auth.user || !hasArtistProfile || trackActions.studioBusy;
  useEffect(() => {
    if (!auth.user) {
      setHasArtistProfile(false);
      return;
    }

    const loadArtistProfile = async () => {
      try {
        setHasArtistProfile(Boolean(await api.getMyArtistProfile()));
      } catch {
        setHasArtistProfile(false);
      }
    };

    void loadArtistProfile();
  }, [auth.user?.id]);
  const clearSelectedFiles = () => {
    setAudioFile(null);
    setCoverFile(null);
  };
  const resetForm = () => {
    trackActions.resetTrackForm();
    clearSelectedFiles();
  };
  const submitStudioForm = async (event: FormEvent<HTMLFormElement>) => {
    const success = await trackActions.submitTrackWithUploads(event, { audioFile, coverFile });
    if (success) {
      clearSelectedFiles();
    }
  };

  return (
    <Stack spacing={3} sx={{ flex: 1 }}>
      <SectionCard tone="green">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4">Studio</Typography>
              <Typography color="text.secondary">
                Здесь создаётся metadata, подключаются source и cover, а публикация происходит автоматически после успешного
                processing.
              </Typography>
            </Box>
            {trackActions.editingTrackId ? <Chip label={`Редактирование #${trackActions.editingTrackId}`} color="secondary" /> : null}
          </Stack>

          {!auth.user ? <Alert severity="warning">Форма видна, но для создания и загрузки треков сначала откройте сессию.</Alert> : null}
          {auth.user && !hasArtistProfile ? <Alert severity="info">Сначала создайте профиль артиста в `/me`, после этого загрузка треков станет доступна.</Alert> : null}

          <Box component="form" onSubmit={(event) => void submitStudioForm(event)}>
            <Stack spacing={2}>
                <AppTextField
                  label="Название"
                  value={trackActions.trackForm.title}
                  onChange={(event) => trackActions.updateTrackForm({ title: event.target.value })}
                  disabled={formDisabled}
                  required
                />
                <AppTextField
                  label="Описание"
                  multiline
                  minRows={3}
                  value={trackActions.trackForm.description}
                  onChange={(event) => trackActions.updateTrackForm({ description: event.target.value })}
                  disabled={formDisabled}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <AppTextField
                    label="Жанр"
                    select
                    value={trackActions.trackForm.genre}
                    onChange={(event) => trackActions.updateTrackForm({ genre: event.target.value })}
                    disabled={formDisabled}
                    fullWidth
                  >
                    <MenuItem value="">No genre</MenuItem>
                    {SUPPORTED_TRACK_GENRES.map((genre) => (
                      <MenuItem key={genre} value={genre}>
                        {genre}
                      </MenuItem>
                    ))}
                  </AppTextField>
                  <AppTextField
                    select
                    label="Категория"
                    value={trackActions.trackForm.category_id}
                    onChange={(event) => trackActions.updateTrackForm({ category_id: event.target.value })}
                    disabled={formDisabled}
                    fullWidth
                  >
                    <MenuItem value="">No category</MenuItem>
                    {catalog.categories.map((category) => (
                      <MenuItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </AppTextField>
                </Stack>
                <AppTextField
                  label="Теги через запятую"
                  value={trackActions.trackForm.tags}
                  onChange={(event) => trackActions.updateTrackForm({ tags: event.target.value })}
                  disabled={formDisabled}
                />
                <AppTextField
                  label="Лицензия"
                  value={trackActions.trackForm.license_type}
                  onChange={(event) => trackActions.updateTrackForm({ license_type: event.target.value })}
                  disabled={formDisabled}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={trackActions.trackForm.is_downloadable}
                      onChange={(event) => trackActions.updateTrackForm({ is_downloadable: event.target.checked })}
                      disabled={formDisabled}
                    />
                  }
                  label="Разрешить скачивание"
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <ActionButton variant={audioFile ? 'contained' : 'outlined'} component="label" disabled={formDisabled}>
                    {audioFile ? `Audio: ${audioFile.name}` : 'Выбрать audio MP3/WAV'}
                    <input
                      hidden
                      type="file"
                      accept=".mp3,.wav,audio/mpeg,audio/wav"
                      onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                    />
                  </ActionButton>
                  <ActionButton variant={coverFile ? 'contained' : 'outlined'} component="label" disabled={formDisabled}>
                    {coverFile ? `Cover: ${coverFile.name}` : 'Выбрать cover'}
                    <input
                      hidden
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                    />
                  </ActionButton>
                </Stack>
                <Alert severity="info" icon={<AutoAwesomeRoundedIcon fontSize="inherit" />}>
                  Можно сохранить только metadata, а можно сразу выбрать audio и cover. После успешного audio processing трек
                  публикуется автоматически.
                </Alert>
                <Stack direction="row" spacing={2}>
                  <ActionButton type="submit" variant="contained" disabled={formDisabled}>
                    {!auth.user
                      ? 'Войдите, чтобы создать трек'
                      : !hasArtistProfile
                        ? 'Сначала создайте профиль артиста'
                      : trackActions.studioBusy
                        ? 'Сохраняем...'
                        : trackActions.editingTrackId
                          ? 'Обновить и загрузить'
                          : audioFile
                            ? 'Создать и загрузить трек'
                            : 'Создать metadata'}
                  </ActionButton>
                  <ActionButton variant="outlined" disabled={trackActions.studioBusy} onClick={resetForm}>
                    Сбросить форму
                  </ActionButton>
                </Stack>
            </Stack>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard tone="orange">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4">Мои треки</Typography>
              <Typography color="text.secondary">
                Здесь видно весь owner flow: metadata, cover, source, processing и уже опубликованный результат.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Всего ${catalog.myTracks.length}`} variant="outlined" />
              <Chip label={`Лайкнуто ${catalog.likedTrackIds.length}`} variant="outlined" />
            </Stack>
          </Stack>

          {!auth.user ? (
            <Alert severity="info">После логина здесь появятся ваши треки и управляющие действия.</Alert>
          ) : catalog.myTracks.length === 0 ? (
            <Alert severity="info">У вас пока нет треков. Создайте первый в форме выше.</Alert>
          ) : (
            <Stack spacing={2}>
              {catalog.myTracks.map((track) => (
                <TrackCard
                  key={`mine-${track.id}`}
                  track={track}
                  variant="mine"
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
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
