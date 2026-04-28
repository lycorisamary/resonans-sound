import { Alert, Box, Chip, CircularProgress, Grid, IconButton, InputAdornment, MenuItem, Stack, Tab, Tabs, Typography } from '@mui/material';

import { TrackCard } from '@/entities/track/ui';
import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { CatalogSort, CatalogView } from '@/shared/api/types';
import { SUPPORTED_TRACK_GENRES } from '@/shared/constants/genres';
import { ActionButton, AppTextField, PageHeader, SectionCard } from '@/shared/ui';
import { FavoriteRoundedIcon, QueueMusicRoundedIcon, RefreshRoundedIcon, SearchRoundedIcon } from '@/shared/ui/icons';

interface CatalogPanelProps {
  auth: UseAuthResult;
  catalog: UseCatalogResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

const catalogSortLabels: Record<CatalogSort, string> = {
  newest: 'сначала новые',
  popular: 'по популярности',
  title: 'по названию',
};

export function CatalogPanel({ auth, catalog, player, trackActions }: CatalogPanelProps) {
  const hasActiveFilters = Boolean(
    catalog.catalogSearch || catalog.catalogGenre || catalog.catalogTag || catalog.selectedCategory !== 'all' || catalog.catalogSort !== 'newest'
  );
  const selectedCategoryName =
    catalog.selectedCategory === 'all'
      ? null
      : catalog.categories.find((category) => category.slug === catalog.selectedCategory)?.name ?? 'Выбранная категория';
  const activeFilterCount = [
    catalog.catalogSearch,
    catalog.catalogGenre,
    catalog.catalogTag,
    selectedCategoryName ?? '',
    catalog.catalogSort !== 'newest' ? catalogSortLabels[catalog.catalogSort] : '',
  ].filter(Boolean).length;

  return (
    <SectionCard tone="blue" sx={{ flex: 1.2 }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Каталог"
          title="Общий каталог релизов"
          description="Каталог нужен как рабочая поверхность поиска: быстро перейти от общего обзора к нужному треку, артисту или жанровому срезу."
          actions={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <AppTextField
                select
                label="Сортировка"
                value={catalog.catalogSort}
                onChange={(event) => catalog.setCatalogSort(event.target.value as CatalogSort)}
                sx={{ minWidth: 190 }}
              >
                <MenuItem value="newest">Сначала новые</MenuItem>
                <MenuItem value="popular">По популярности</MenuItem>
                <MenuItem value="title">По названию</MenuItem>
              </AppTextField>
              <IconButton color="primary" onClick={() => void catalog.refreshWholeUi()}>
                <RefreshRoundedIcon />
              </IconButton>
            </Stack>
          }
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${catalog.displayedTracks.length} релизов на экране`} color="secondary" variant="outlined" />
            <Chip label="Открыть, слушать, лайкать и жаловаться можно прямо отсюда" variant="outlined" />
          </Stack>
          {hasActiveFilters ? (
            <ActionButton variant="text" color="secondary" onClick={catalog.clearCatalogSearch} sx={{ alignSelf: { xs: 'flex-start', md: 'auto' }, px: 0.5 }}>
              Сбросить всё ({activeFilterCount})
            </ActionButton>
          ) : null}
        </Stack>

        <Box component="form" onSubmit={catalog.handleCatalogSearch}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} xl={5}>
              <AppTextField
                fullWidth
                label="Поиск по названию, артисту или описанию"
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
            </Grid>
            <Grid item xs={12} md={4} xl={2.5}>
              <AppTextField
                select
                fullWidth
                label="Жанр"
                value={catalog.catalogGenre}
                onChange={(event) => catalog.setCatalogGenre(event.target.value)}
              >
                <MenuItem value="">Все жанры</MenuItem>
                {SUPPORTED_TRACK_GENRES.map((genre) => (
                  <MenuItem key={genre} value={genre}>
                    {genre}
                  </MenuItem>
                ))}
              </AppTextField>
            </Grid>
            <Grid item xs={12} md={4} xl={2.5}>
              <AppTextField
                fullWidth
                label="Тег"
                value={catalog.catalogTagInput}
                onChange={(event) => catalog.setCatalogTagInput(event.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4} xl={2}>
              <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
                <ActionButton type="submit" variant="contained" sx={{ flex: 1 }}>
                  Найти
                </ActionButton>
                <ActionButton variant="outlined" onClick={catalog.clearCatalogSearch} sx={{ flex: 1 }}>
                  Сброс
                </ActionButton>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="Все" color={catalog.selectedCategory === 'all' ? 'secondary' : 'default'} onClick={() => catalog.setSelectedCategory('all')} />
          {catalog.categories.map((category) => (
            <Chip
              key={category.id}
              label={`${category.name} (${category.track_count ?? 0})`}
              color={catalog.selectedCategory === category.slug ? 'secondary' : 'default'}
              onClick={() => catalog.setSelectedCategory(category.slug)}
            />
          ))}
        </Stack>

        <Tabs value={catalog.catalogView} onChange={(_, value) => catalog.setCatalogView(value as CatalogView)}>
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

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {catalog.catalogSearch ? <Chip label={`Поиск: ${catalog.catalogSearch}`} color="secondary" variant="outlined" /> : null}
          {catalog.catalogGenre ? <Chip label={`Жанр: ${catalog.catalogGenre}`} color="secondary" variant="outlined" /> : null}
          {catalog.catalogTag ? <Chip label={`Тег: ${catalog.catalogTag}`} color="secondary" variant="outlined" /> : null}
          {selectedCategoryName ? <Chip label={`Категория: ${selectedCategoryName}`} color="secondary" variant="outlined" /> : null}
          {catalog.catalogSort !== 'newest' ? <Chip label={`Порядок: ${catalogSortLabels[catalog.catalogSort]}`} color="secondary" variant="outlined" /> : null}
        </Stack>

        {catalog.catalogBusy ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Обновляем каталог...</Typography>
          </Stack>
        ) : null}

        {catalog.displayedTracks.length === 0 ? (
          <Alert severity="info">
            {catalog.catalogView === 'liked'
              ? auth.user
                ? 'У вас пока нет лайкнутых треков. Первый сигнал можно поставить прямо из каталога.'
                : 'Лайки доступны после входа.'
              : catalog.catalogSearch
                ? 'По текущему запросу ничего не найдено. Попробуйте изменить формулировку или быстро сбросить текущие фильтры.'
                : 'Каталог пока пуст. После первой успешной публикации треки появятся здесь автоматически.'}
          </Alert>
        ) : null}

        <Stack spacing={2}>
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
              onReportTrack={(selectedTrack) => void trackActions.reportTrack(selectedTrack)}
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
