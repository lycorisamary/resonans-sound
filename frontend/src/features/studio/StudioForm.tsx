import { FormEvent, useEffect, useState } from 'react';

import { Alert, Box, Chip, FormControlLabel, Grid, MenuItem, Stack, Switch } from '@mui/material';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import api from '@/shared/api/client';
import { SUPPORTED_TRACK_GENRES } from '@/shared/constants/genres';
import { ActionButton, AppTextField, PageHeader, SectionCard } from '@/shared/ui';
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
    <Stack spacing={2.5}>
      <SectionCard tone="green">
        <Stack spacing={3}>
          <PageHeader
            eyebrow="Studio"
            title="Загрузка и управление релизом"
            description="Studio остаётся отдельным модулем production-flow: сначала metadata, затем audio и cover, после processing трек публикуется автоматически."
            actions={trackActions.editingTrackId ? <Chip label={`Редактирование #${trackActions.editingTrackId}`} color="secondary" /> : null}
          />

          {!auth.user ? <Alert severity="warning">Чтобы создавать и загружать треки, сначала откройте сессию.</Alert> : null}
          {auth.user && !hasArtistProfile ? (
            <Alert severity="info">Сначала создайте профиль артиста в `/me`, после этого studio flow станет доступен полностью.</Alert>
          ) : null}

          <Box component="form" onSubmit={(event) => void submitStudioForm(event)}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <AppTextField
                  label="Название трека"
                  value={trackActions.trackForm.title}
                  onChange={(event) => trackActions.updateTrackForm({ title: event.target.value })}
                  disabled={formDisabled}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField
                  label="Теги через запятую"
                  value={trackActions.trackForm.tags}
                  onChange={(event) => trackActions.updateTrackForm({ tags: event.target.value })}
                  disabled={formDisabled}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <AppTextField
                  label="Описание"
                  multiline
                  minRows={4}
                  value={trackActions.trackForm.description}
                  onChange={(event) => trackActions.updateTrackForm({ description: event.target.value })}
                  disabled={formDisabled}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField
                  label="Жанр"
                  select
                  value={trackActions.trackForm.genre}
                  onChange={(event) => trackActions.updateTrackForm({ genre: event.target.value })}
                  disabled={formDisabled}
                  fullWidth
                >
                  <MenuItem value="">Без жанра</MenuItem>
                  {SUPPORTED_TRACK_GENRES.map((genre) => (
                    <MenuItem key={genre} value={genre}>
                      {genre}
                    </MenuItem>
                  ))}
                </AppTextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField
                  select
                  label="Категория"
                  value={trackActions.trackForm.category_id}
                  onChange={(event) => trackActions.updateTrackForm({ category_id: event.target.value })}
                  disabled={formDisabled}
                  fullWidth
                >
                  <MenuItem value="">Без категории</MenuItem>
                  {catalog.categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                </AppTextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField
                  label="Лицензия"
                  value={trackActions.trackForm.license_type}
                  onChange={(event) => trackActions.updateTrackForm({ license_type: event.target.value })}
                  disabled={formDisabled}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    display: 'flex',
                    height: '100%',
                    px: 2,
                  }}
                >
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
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <ActionButton fullWidth variant={audioFile ? 'contained' : 'outlined'} component="label" disabled={formDisabled}>
                  {audioFile ? `Audio: ${audioFile.name}` : 'Выбрать аудиофайл'}
                  <input
                    hidden
                    type="file"
                    accept=".mp3,.wav,.flac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/mp4"
                    onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                  />
                </ActionButton>
              </Grid>
              <Grid item xs={12} md={6}>
                <ActionButton fullWidth variant={coverFile ? 'contained' : 'outlined'} component="label" disabled={formDisabled}>
                  {coverFile ? `Cover: ${coverFile.name}` : 'Выбрать обложку'}
                  <input
                    hidden
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                  />
                </ActionButton>
              </Grid>
            </Grid>

            <Alert severity="info" icon={<AutoAwesomeRoundedIcon fontSize="inherit" />} sx={{ mt: 2 }}>
              Можно сохранить только metadata, а можно сразу приложить audio и cover. После успешного processing публикация произойдёт
              автоматически без премодерации.
            </Alert>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mt: 2.5 }}>
              <ActionButton type="submit" variant="contained" disabled={formDisabled}>
                {!auth.user
                  ? 'Войдите, чтобы создать трек'
                  : !hasArtistProfile
                    ? 'Сначала создайте профиль артиста'
                    : trackActions.studioBusy
                      ? 'Сохраняем...'
                      : trackActions.editingTrackId
                        ? 'Обновить релиз'
                        : audioFile
                          ? 'Создать и отправить в processing'
                          : 'Создать metadata'}
              </ActionButton>
              <ActionButton variant="outlined" disabled={trackActions.studioBusy} onClick={resetForm}>
                Сбросить форму
              </ActionButton>
            </Stack>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard tone="orange">
        <Stack spacing={3}>
          <PageHeader
            eyebrow="Library"
            title="Мои треки"
            description="Owner-flow остаётся прозрачным: видно статус, availability media, actions по cover/audio и всё, что нужно для повторной загрузки или редактирования."
            actions={
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Всего ${catalog.myTracks.length}`} variant="outlined" />
                <Chip label={`Лайкнуто ${catalog.likedTrackIds.length}`} variant="outlined" />
              </Stack>
            }
          />

          {!auth.user ? (
            <Alert severity="info">После логина здесь появятся ваши релизы и действия владельца.</Alert>
          ) : catalog.myTracks.length === 0 ? (
            <Alert severity="info">У вас пока нет треков. Первый можно создать в форме выше.</Alert>
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
