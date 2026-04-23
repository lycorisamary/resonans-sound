import { Alert, Avatar, Box, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { UseAuthResult } from '@/hooks/useAuth';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { UseCatalogResult } from '@/hooks/useCatalog';
import { UseTrackActionsResult } from '@/hooks/useTrackActions';
import { ActionButton, MetricTile, PageHeader, SectionCard } from '@/shared/ui';
import { AutoAwesomeRoundedIcon, PlayArrowRoundedIcon, RefreshRoundedIcon } from '@/shared/ui/icons';
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
                  <Chip label="Main selection" color="secondary" variant="outlined" />
                  <Chip label="Open uploads" variant="outlined" />
                  <Chip label="Curated spotlight" variant="outlined" />
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
                  <MetricTile label="Published tracks" value={catalog.publicTracks.length} />
                  <MetricTile label="Curated collections" value={homeFeed.collections.length} />
                  <MetricTile label="New artists" value={homeFeed.artists.length} />
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
                    ? `linear-gradient(180deg, rgba(11,11,16,0.3), rgba(11,11,16,0.55)), url(${featuredCollection.cover_image_url}) center / cover`
                    : 'linear-gradient(135deg, #5110a4 0%, #7a39dd 42%, #8f1023 72%, #c0162f 100%)',
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
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  boxShadow: '16px 16px 0 rgba(0,0,0,0.3)',
                  maxWidth: 380,
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
                        : 'linear-gradient(135deg, #6d1b2f, #a34b61 38%, #d9b5a9 100%)',
                  }}
                />
                <Stack spacing={1} sx={{ p: 2.25, background: 'rgba(10,10,14,0.88)' }}>
                  <Typography variant="overline" sx={{ color: 'secondary.light' }}>
                    Featured selection
                  </Typography>
                  <Typography variant="h4">{featuredCollection?.name ?? 'Weekly spotlight'}</Typography>
                  <Typography color="text.secondary">
                    {featuredCollection?.description ?? 'Ручной отбор администрации для сильных и заметных релизов этой недели.'}
                  </Typography>
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
            <Chip label="Спам и мусор чистятся staff-инструментами" variant="outlined" />
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
                      <Chip label={collection.is_public ? 'Public' : 'Draft'} color={collection.is_public ? 'success' : 'default'} size="small" />
                      <Chip label={`${collection.track_count} tracks`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="h5">{collection.name}</Typography>
                    <Typography color="text.secondary">
                      {collection.description ?? 'Ручная подборка staff-команды с уже опубликованными и approved-треками.'}
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
                        Play
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
                eyebrow="Live feed"
                title="Недавно добавленные"
                description="Свежие релизы появляются здесь сразу после публикации и показывают артисту, что платформа действительно живая."
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
                        {track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Unknown artist'}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {track.genre ? <Chip label={track.genre} size="small" variant="outlined" /> : null}
                        <Chip label={`${track.play_count} plays`} size="small" variant="outlined" />
                        <Chip label={`${track.like_count} likes`} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                    <ActionButton variant="outlined" size="small" onClick={() => void player.playTrack(track)}>
                      Play
                    </ActionButton>
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
                eyebrow="Artist spotlight"
                title="Новые артисты"
                description="Витрина профилей, а не только треков: проект должен подсвечивать людей, а не превращаться в безличную свалку файлов."
              />
              <Grid container spacing={1.5}>
                {homeFeed.artists.map((artist) => (
                  <Grid item xs={12} sm={6} key={artist.id}>
                    <Box
                      component={RouterLink}
                      to={`/artists/${artist.slug}`}
                      sx={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 4,
                        color: 'inherit',
                        display: 'block',
                        p: 1.5,
                        textDecoration: 'none',
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Avatar
                          src={artist.avatar_url ?? undefined}
                          sx={{
                            bgcolor: 'primary.main',
                            width: 56,
                            height: 56,
                          }}
                        >
                          {(artist.display_name || artist.slug).slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{artist.display_name || artist.slug}</Typography>
                          <Typography color="text.secondary" sx={{ minHeight: 44 }}>
                            {artist.bio || 'Публичный профиль артиста с approved-релизами и ручным шансом попасть в spotlight.'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`${artist.track_count} tracks`} size="small" variant="outlined" />
                          {artist.location ? <Chip label={artist.location} size="small" variant="outlined" /> : null}
                        </Stack>
                      </Stack>
                    </Box>
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
            eyebrow="Signal"
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
                      {track.artist?.display_name ?? track.user?.display_name ?? track.user?.username ?? 'Unknown artist'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`${track.play_count} plays`} size="small" color="secondary" variant="outlined" />
                      <Chip label={`${track.like_count} likes`} size="small" variant="outlined" />
                    </Stack>
                    <ActionButton variant="contained" size="small" onClick={() => void player.playTrack(track)}>
                      Play now
                    </ActionButton>
                  </Stack>
                </SectionCard>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </SectionCard>

      <SectionCard tone="neutral">
        <Stack spacing={2}>
          <PageHeader
            eyebrow="Why it matters"
            title="Не просто загрузка, а шанс быть замеченным"
            description="Платформа уже умеет автопубликацию, честный play-count, жалобы, скрытие и ручные подборки. Discovery-слой теперь подчёркивает это визуально и продуктово."
            actions={
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label={auth.user ? `Сессия: ${auth.user.username}` : 'Гостевой режим'}
                color={auth.user ? 'success' : 'default'}
                variant="outlined"
              />
            }
          />
        </Stack>
      </SectionCard>

      <Box id="catalog">
        <CatalogPanel auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
      </Box>
    </Stack>
  );
}
