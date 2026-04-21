import { Alert, Box, Chip, FormControlLabel, MenuItem, Stack, Switch, Typography } from '@mui/material';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import { AutoAwesomeRoundedIcon } from '@/shared/ui/icons';

interface StudioFormProps {
  auth: UseAuthResult;
  catalog: UseCatalogResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function StudioForm({ auth, catalog, player, trackActions }: StudioFormProps) {
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

          {!auth.user ? (
            <Alert severity="warning">Для создания и редактирования треков сначала откройте сессию.</Alert>
          ) : (
            <Box component="form" onSubmit={trackActions.submitTrack}>
              <Stack spacing={2}>
                <AppTextField
                  label="Название"
                  value={trackActions.trackForm.title}
                  onChange={(event) => trackActions.updateTrackForm({ title: event.target.value })}
                  required
                />
                <AppTextField
                  label="Описание"
                  multiline
                  minRows={3}
                  value={trackActions.trackForm.description}
                  onChange={(event) => trackActions.updateTrackForm({ description: event.target.value })}
                />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <AppTextField
                    label="Жанр"
                    value={trackActions.trackForm.genre}
                    onChange={(event) => trackActions.updateTrackForm({ genre: event.target.value })}
                    fullWidth
                  />
                  <AppTextField
                    select
                    label="Категория"
                    value={trackActions.trackForm.category_id}
                    onChange={(event) => trackActions.updateTrackForm({ category_id: event.target.value })}
                    fullWidth
                  >
                    <MenuItem value="">Без категории</MenuItem>
                    {catalog.categories.map((category) => (
                      <MenuItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </AppTextField>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <AppTextField
                    label="BPM"
                    type="number"
                    value={trackActions.trackForm.bpm}
                    onChange={(event) => trackActions.updateTrackForm({ bpm: event.target.value })}
                    fullWidth
                  />
                  <AppTextField
                    label="Тональность"
                    value={trackActions.trackForm.key_signature}
                    onChange={(event) => trackActions.updateTrackForm({ key_signature: event.target.value })}
                    fullWidth
                  />
                </Stack>
                <AppTextField
                  label="Теги через запятую"
                  value={trackActions.trackForm.tags}
                  onChange={(event) => trackActions.updateTrackForm({ tags: event.target.value })}
                />
                <AppTextField
                  label="Лицензия"
                  value={trackActions.trackForm.license_type}
                  onChange={(event) => trackActions.updateTrackForm({ license_type: event.target.value })}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={trackActions.trackForm.is_downloadable}
                      onChange={(event) => trackActions.updateTrackForm({ is_downloadable: event.target.checked })}
                    />
                  }
                  label="Разрешить скачивание"
                />
                <Alert severity="info" icon={<AutoAwesomeRoundedIcon fontSize="inherit" />}>
                  Ручная moderation сейчас отключена: после успешного processing трек публикуется автоматически.
                </Alert>
                <Stack direction="row" spacing={2}>
                  <ActionButton type="submit" variant="contained" disabled={trackActions.studioBusy}>
                    {trackActions.studioBusy ? 'Сохраняем...' : trackActions.editingTrackId ? 'Обновить metadata' : 'Создать metadata'}
                  </ActionButton>
                  <ActionButton variant="outlined" disabled={trackActions.studioBusy} onClick={trackActions.resetTrackForm}>
                    Сбросить форму
                  </ActionButton>
                </Stack>
              </Stack>
            </Box>
          )}
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
