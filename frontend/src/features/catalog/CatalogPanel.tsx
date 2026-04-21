import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { CatalogSort, CatalogView } from '@/shared/api/types';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import { FavoriteRoundedIcon, QueueMusicRoundedIcon, RefreshRoundedIcon, SearchRoundedIcon } from '@/shared/ui/icons';

interface CatalogPanelProps {
  auth: UseAuthResult;
  catalog: UseCatalogResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function CatalogPanel({ auth, catalog, player, trackActions }: CatalogPanelProps) {
  return (
    <SectionCard tone="blue" sx={{ flex: 1.2 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Каталог и библиотека</Typography>
            <Typography color="text.secondary">
              Сейчас логика упрощена: после обработки треки публикуются автоматически, поэтому каталог показывает уже живую
              общую витрину.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <AppTextField
              select
              label="Сортировка"
              value={catalog.catalogSort}
              onChange={(event) => catalog.setCatalogSort(event.target.value as CatalogSort)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="newest">Сначала новые</MenuItem>
              <MenuItem value="popular">По популярности</MenuItem>
              <MenuItem value="title">По названию</MenuItem>
            </AppTextField>
            <IconButton color="primary" onClick={() => void catalog.refreshWholeUi()}>
              <RefreshRoundedIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Box component="form" onSubmit={catalog.handleCatalogSearch}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <AppTextField
              fullWidth
              label="Поиск по названию, описанию или жанру"
              value={catalog.catalogSearchInput}
              onChange={(event) => catalog.setCatalogSearchInput(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <ActionButton type="submit" variant="contained">
              Найти
            </ActionButton>
            <ActionButton variant="outlined" onClick={catalog.clearCatalogSearch}>
              Сбросить
            </ActionButton>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="Все" color={catalog.selectedCategory === 'all' ? 'primary' : 'default'} onClick={() => catalog.setSelectedCategory('all')} />
          {catalog.categories.map((category) => (
            <Chip
              key={category.id}
              label={`${category.name} (${category.track_count ?? 0})`}
              color={catalog.selectedCategory === category.slug ? 'primary' : 'default'}
              onClick={() => catalog.setSelectedCategory(category.slug)}
            />
          ))}
        </Stack>

        <Tabs value={catalog.catalogView} onChange={(_, value) => catalog.setCatalogView(value as CatalogView)} sx={{ minHeight: 40 }}>
          <Tab
            value="catalog"
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <QueueMusicRoundedIcon fontSize="small" />
                <span>Все треки</span>
              </Stack>
            }
          />
          <Tab
            value="liked"
            disabled={!auth.user}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <FavoriteRoundedIcon fontSize="small" />
                <span>Лайкнутые</span>
              </Stack>
            }
          />
        </Tabs>

        {catalog.catalogSearch ? <Chip label={`Активный поиск: ${catalog.catalogSearch}`} color="secondary" variant="outlined" /> : null}

        {catalog.catalogBusy ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Обновляем список треков...</Typography>
          </Stack>
        ) : null}

        <Stack spacing={2}>
          {catalog.displayedTracks.length === 0 ? (
            <Alert severity="info">
              {catalog.catalogView === 'liked'
                ? auth.user
                  ? 'У вас пока нет лайкнутых треков. Поставьте первый лайк прямо из каталога.'
                  : 'Лайкнутые треки доступны после входа.'
                : catalog.catalogSearch
                  ? 'По текущему поисковому запросу ничего не найдено. Попробуйте сменить фильтр или сбросить поиск.'
                  : 'Каталог пока пуст. Загрузите и обработайте первый трек.'}
            </Alert>
          ) : null}

          {catalog.displayedTracks.map((track) => (
            <TrackCard
              key={`catalog-${track.id}`}
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
      </Stack>
    </SectionCard>
  );
}
