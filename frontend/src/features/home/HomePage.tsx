import { Alert, Box, Chip, CircularProgress, Divider, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { ActionButton, MetricTile, PageHeader, SectionCard } from '@/shared/ui';
import { AutoAwesomeRoundedIcon, PlayArrowRoundedIcon, RefreshRoundedIcon } from '@/shared/ui/icons';
import { ArtistSpotlightCard } from '../artists/ArtistSpotlightCard';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { useHomeFeed } from './model/useHomeFeed';

interface HomePageProps {
  auth: UseAuthResult;
  catalog: UseCatalogResult;
  player: UseAudioPlayerResult;
  trackActions: UseTrackActionsResult;
}

export function HomePage({ auth, catalog, player, trackActions }: HomePageProps) {
  const homeFeed = useHomeFeed();
  const featuredCollection = homeFeed.collections[0] ?? null;
  const discoveryPath = [
    {
      eyebrow: 'Шаг 1',
      title: 'Загрузка без ожидания',
      description: 'Артист публикует трек сразу и получает живую страницу релиза без промежуточных ручных ворот.',
    },
    {
      eyebrow: 'Шаг 2',
      title: 'Первые прослушивания',
      description: 'Свежие релизы появляются на витрине и в каталоге, поэтому новый трек не прячется в закрытом кабинете.',
    },
    {
      eyebrow: 'Шаг 3',
      title: 'Шанс попасть в отбор',
      description: 'Сильные треки и артисты поднимаются в spotlight-блоки и подборки без раздувания продукта в соцсеть.',
    },
  ];

  return (
    <Stack spacing={2.5}>
      <SectionCard
        tone="orange"
        sx={{
          overflow: 'hidden',
          p: 0,
        }}
      >
        <Grid container>
          <Grid item xs={12} lg={7}>
            <Box sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Главный отбор" color="secondary" variant="outlined" />
                  <Chip label="Свободная публикация" variant="outlined" />
                  <Chip label="Витрина артистов" variant="outlined" />
                </Stack>

                <Typography variant="h1" sx={{ fontSize: { xs: '3rem', md: '5.8rem' }, lineHeight: 0.9, maxWidth: 760 }}>
                  Get heard.
                  <br />
                  Get selected.
                </Typography>

                <Typography sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.05rem' }, maxWidth: 620 }}>
                  Resonans Sound работает как витрина для независимых артистов: треки публикуются быстро, а лучшие попадают в ручной
                  отбор, подборки и spotlight-блоки.
                </Typography>

                <Grid container spacing={1.25}>
                  {discoveryPath.map((step) => (
                    <Grid item xs={12} md={4} key={step.title}>
                      <Box
                        sx={{
                          height: '100%',
                          p: 1.5,
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <Typography variant="overline" sx={{ color: 'secondary.light' }}>
                          {step.eyebrow}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5, mb: 0.75 }}>
                          {step.title}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {step.description}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <ActionButton component={RouterLink} to="/studio" variant="contained">
                    Загрузить трек
                  </ActionButton>
                  <ActionButton component={RouterLink} to="/collections" variant="outlined">
                    Открыть подборки
                  </ActionButton>
                  <ActionButton component={RouterLink} to="/artists" variant="outlined">
                    Исследовать артистов
                  </ActionButton>
                </Stack>

                <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                  <MetricTile label="Треков" value={catalog.publicTracks.length} />
                  <MetricTile label="Подборок" value={homeFeed.collections.length} />
                  <MetricTile label="Артистов" value={homeFeed.artists.length} />
                </Stack>
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Box
              sx={{
                alignItems: 'center',
                background:
                  featuredCollection?.cover_image_url
                    ? `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.62)), url(${featuredCollection.cover_image_url}) center / cover`
                    : 'radial-gradient(circle at 50% 48%, rgba(255,23,23,0.22), transparent 28%), linear-gradient(135deg, #050506 0%, #180306 72%, #3b0207 100%)',
                display: 'flex',
                height: '100%',
                minHeight: 340,
                justifyContent: 'center',
                p: { xs: 2.5, md: 4 },
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  border: '1px solid rgba(255,35,35,0.2)',
                  borderRadius: 5,
                  boxShadow: '0 0 42px rgba(255,23,23,0.18)',
                  maxWidth: 420,
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <Box
                  sx={{
                    aspectRatio: '1.15 / 1',
                    background:
                      featuredCollection?.cover_image_url
                        ? `url(${featuredCollection.cover_image_url}) center / cover`
                        : 'url(/favicon.png) center / 78% no-repeat, #000',
                  }}
                />
                <Stack spacing={1} sx={{ p: 2.25, background: 'rgba(10,10,14,0.88)' }}>
                  <Typography variant="overline" sx={{ color: 'secondary.light' }}>
                    Отбор недели
                  </Typography>
                  <Typography variant="h4">{featuredCollection?.name ?? 'Weekly spotlight'}</Typography>
                  <Typography color="text.secondary">
                    {featuredCollection?.description ?? 'Ручной отбор администрации для сильных и заметных релизов этой недели.'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <ActionButton component={RouterLink} to={featuredCollection ? `/collections/${featuredCollection.id}` : '/collections'} variant="contained" size="small">
                      Открыть отбор
                    </ActionButton>
                    <ActionButton
                      variant="outlined"
                      size="small"
                      startIcon={<PlayArrowRoundedIcon />}
                      onClick={() => void player.playTrackQueue(featuredCollection?.tracks ?? [])}
                      disabled={!featuredCollection || featuredCollection.tracks.length === 0}
                    >
                      Слушать подборку
                    </ActionButton>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard tone="neutral">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="Треки публикуются без премодерации" color="secondary" variant="outlined" />
            <Chip label="Лучшие работы попадают в ручные подборки" variant="outlined" />
            <Chip label="Мусор и спам быстро убираются модерацией" variant="outlined" />
          </Stack>
          <ActionButton variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void homeFeed.reload()}>
            Обновить витрину
          </ActionButton>
        </Stack>
      </SectionCard>

      {homeFeed.error ? <Alert severity="error">{homeFeed.error}</Alert> : null}
      {homeFeed.loading ? (
        <SectionCard tone="neutral">
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Собираем главную витрину...</Typography>
          </Stack>
        </SectionCard>
      ) : null}

      <SectionCard tone="blue">
        <Stack spacing={2.5}>
          <PageHeader
            eyebrow="Главная страница"
            title="Подборки от администрации"
            description="Главный блок доверия проекта: артист загружает музыку не просто в каталог, а в пространство, где его могут выделить и поднять выше общего шума."
            actions={
              <ActionButton component={RouterLink} to="/collections" variant="outlined">
                Все подборки
              </ActionButton>
            }
          />

          <Grid container spacing={2}>
            {homeFeed.collections.map((collection) => (
              <Grid item xs={12} md={6} xl={3} key={collection.id}>
                <SectionCard tone="neutral" sx={{ height: '100%', p: 2.25 }}>
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        aspectRatio: '1.6 / 1',
                        background:
                          collection.cover_image_url
                            ? `url(${collection.cover_image_url}) center / cover`
                            : 'linear-gradient(135deg, #2d174e, #8f1023, #ff5f7a)',
                        borderRadius: 4,
                      }}
                    />
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={collection.is_public ? 'Открыта' : 'Черновик'} color={collection.is_public ? 'success' : 'default'} size="small" />
                      <Chip label={`${collection.track_count} треков`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="h5">{collection.name}</Typography>
                    <Typography color="text.secondary">
                      {collection.description ?? 'Ручная подборка с уже опубликованными треками.'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <ActionButton component={RouterLink} to={`/collections/${collection.id}`} variant="outlined" size="small">
                        Открыть
                      </ActionButton>
                      <ActionButton
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={() => void player.playTrackQueue(collection.tracks)}
                        disabled={collection.tracks.length === 0}
                      >
                        Слушать
                      </ActionButton>
                    </Stack>
                  </Stack>
                </SectionCard>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </SectionCard>

      <Grid container spacing={2.5}>
        <Grid item xs={12} xl={7}>
          <SectionCard tone="neutral" sx={{ height: '100%' }}>
            <Stack spacing={2.25}>
              <PageHeader
                eyebrow="Свежие релизы"
                title="Недавно добавленные"
                description="Свежие релизы появляются здесь сразу после публикации и дают артисту прямой вход в discovery-поверхность."
              />
              <Stack spacing={1.25}>
                {homeFeed.recentTracks.map((track) => (
                  <Box
                    key={track.id}
                    sx={{
                      alignItems: { xs: 'flex-start', md: 'center' },
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 4,
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: { xs: '1fr', md: '72px minmax(0, 1fr) auto' },
                      p: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: '100%', md: 72 },
                        height: { xs: 140, md: 72 },
                        borderRadius: 3,
                        background:
                          track.cover_image_url
                            ? `url(${track.cover_image_url}) center / cover`
                            : 'linear-gradient(135deg, #7b1631, #cf6e82 45%, #f0c7bc 100%)',
                      }}
                    />
                    <Box minWidth={0}>
                      <Typography component={RouterLink} to={`/tracks/${track.id}`} variant="h6" sx={{ color: 'inherit', textDecoration: 'none' }}>
                        {track.title}
                      </Typography>
                      <Typography color="text.secondary">
                        {track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Неизвестный артист'}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {track.genre ? <Chip label={track.genre} size="small" variant="outlined" /> : null}
                        <Chip label={`${track.play_count} прослушиваний`} size="small" variant="outlined" />
                        <Chip label={`${track.like_count} лайков`} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                    <Stack direction={{ xs: 'row', md: 'column' }} spacing={1}>
                      <ActionButton variant="contained" size="small" onClick={() => void player.playTrack(track)}>
                        Слушать
                      </ActionButton>
                      <ActionButton
                        component={RouterLink}
                        to={track.artist?.slug ? `/artists/${track.artist.slug}` : `/tracks/${track.id}`}
                        variant="outlined"
                        size="small"
                      >
                        {track.artist?.slug ? 'К артисту' : 'К релизу'}
                      </ActionButton>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} xl={5}>
          <SectionCard tone="green" sx={{ height: '100%' }}>
            <Stack spacing={2.25}>
              <PageHeader
                eyebrow="Артисты"
                title="Новые артисты"
                description="Витрина профилей, а не только файлов: здесь пользователь может перейти от одного яркого трека к целому артистическому контексту."
              />
              <Grid container spacing={1.5}>
                {homeFeed.artists.map((artist) => (
                  <Grid item xs={12} sm={6} key={artist.id}>
                    <ArtistSpotlightCard artist={artist} compact />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard tone="orange">
        <Stack spacing={2.25}>
          <PageHeader
            eyebrow="Сейчас слушают"
            title="Популярное сейчас"
            description="Этот блок нужен не как социальная механика, а как честный сигнал, где уже есть прослушивания и отклик."
          />
          <Grid container spacing={2}>
            {homeFeed.popularTracks.map((track) => (
              <Grid item xs={12} md={6} xl={3} key={track.id}>
                <SectionCard tone="neutral" sx={{ height: '100%', p: 2.25 }}>
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        aspectRatio: '1 / 1',
                        background:
                          track.cover_image_url
                            ? `url(${track.cover_image_url}) center / cover`
                            : 'linear-gradient(135deg, #6d1b2f, #d9b5a9)',
                        borderRadius: 4,
                      }}
                    />
                    <Typography component={RouterLink} to={`/tracks/${track.id}`} variant="h5" sx={{ color: 'inherit', textDecoration: 'none' }}>
                      {track.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Неизвестный артист'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`${track.play_count} прослушиваний`} size="small" color="secondary" variant="outlined" />
                      <Chip label={`${track.like_count} лайков`} size="small" variant="outlined" />
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <ActionButton variant="contained" size="small" onClick={() => void player.playTrack(track)}>
                        Слушать
                      </ActionButton>
                      <ActionButton component={RouterLink} to={`/tracks/${track.id}`} variant="outlined" size="small">
                        Открыть релиз
                      </ActionButton>
                    </Stack>
                  </Stack>
                </SectionCard>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </SectionCard>

      <SectionCard tone="neutral">
        <Stack spacing={2.5}>
          <PageHeader
            eyebrow="Идея"
            title="Не просто загрузка, а шанс быть замеченным"
            description="Платформа помогает быстро показать релиз слушателям, попасть в ручной отбор и собрать первые честные реакции."
            actions={
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label={auth.user ? auth.user.username : 'Гость'}
                color={auth.user ? 'success' : 'default'}
                variant="outlined"
              />
            }
          />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap>
            <ActionButton component={RouterLink} to="/studio" variant="contained">
              Начать с загрузки
            </ActionButton>
            <ActionButton component={RouterLink} to="/artists" variant="outlined">
              Смотреть артистов
            </ActionButton>
            <ActionButton component={RouterLink} to="/collections" variant="outlined">
              Перейти к отборам
            </ActionButton>
            <ActionButton component={RouterLink} to="#catalog" variant="text" color="secondary">
              Сразу в каталог
            </ActionButton>
          </Stack>
        </Stack>
      </SectionCard>

      <Box id="catalog">
        <CatalogPanel auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
      </Box>
    </Stack>
  );
}
