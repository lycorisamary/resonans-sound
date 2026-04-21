import { Alert, Box, Button, Chip, CircularProgress, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom';

import { AuthPanel } from '@/features/auth/AuthPanel';
import { CatalogPanel } from '@/features/catalog/CatalogPanel';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { StudioForm } from '@/features/studio/StudioForm';
import { TrackDetailPage } from '@/features/tracks/TrackDetailPage';
import { useAuth } from '@/hooks/useAuth';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useCatalog } from '@/hooks/useCatalog';
import { useTrackActions } from '@/hooks/useTrackActions';
import { MetricTile } from '@/shared/ui';
import { FavoriteRoundedIcon, LibraryMusicRoundedIcon, PhotoCameraRoundedIcon } from '@/shared/ui/icons';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const catalog = useCatalog();
  const player = useAudioPlayer();
  const auth = useAuth();
  const trackActions = useTrackActions({ stopAndResetAudio: player.stopAndResetAudio });
  const logout = () => void auth.logout(player.stopAndResetAudio);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(15,118,110,0.18), transparent 28%), radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 30%), linear-gradient(180deg, #f8f2e8 0%, #f5ede0 40%, #f3f4f6 100%)',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3.5}>
          <Hero catalog={catalog} auth={auth} />

          {catalog.initialLoading ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={22} />
              <Typography>Поднимаем live-контекст приложения...</Typography>
            </Stack>
          ) : null}

          {catalog.pageError ? <Alert severity="error">{catalog.pageError}</Alert> : null}
          {catalog.banner ? <Alert severity="success">{catalog.banner}</Alert> : null}

          <Routes>
            <Route
              path="/"
              element={
                <Stack spacing={3}>
                  <PlayerPanel player={player} />
                  <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
                    <CatalogPanel auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
                    <StudioForm auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
                  </Stack>
                </Stack>
              }
            />
            <Route
              path="/login"
              element={
                <AuthPanel
                  auth={auth}
                  likedTrackIdsCount={catalog.likedTrackIds.length}
                  myTracksCount={catalog.myTracks.length}
                  publicTracksCount={catalog.publicTracks.length}
                  onLogout={logout}
                />
              }
            />
            <Route
              path="/studio"
              element={<StudioForm auth={auth} catalog={catalog} player={player} trackActions={trackActions} />}
            />
            <Route
              path="/me"
              element={
                <Stack spacing={3}>
                  <AuthPanel
                    auth={auth}
                    likedTrackIdsCount={catalog.likedTrackIds.length}
                    myTracksCount={catalog.myTracks.length}
                    publicTracksCount={catalog.publicTracks.length}
                    onLogout={logout}
                  />
                  <CatalogPanel auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
                </Stack>
              }
            />
            <Route path="/tracks/:id" element={<TrackDetailPage auth={auth} player={player} trackActions={trackActions} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <FooterStatus />
        </Stack>
      </Container>
    </Box>
  );
}

interface HeroProps {
  auth: ReturnType<typeof useAuth>;
  catalog: ReturnType<typeof useCatalog>;
}

function Hero({ auth, catalog }: HeroProps) {
  const navItems = [
    { label: 'Каталог', to: '/' },
    { label: 'Вход', to: '/login' },
    { label: 'Studio', to: '/studio' },
    { label: 'Профиль', to: '/me' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 5 },
        borderRadius: 8,
        border: '1px solid rgba(15,118,110,0.12)',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(255,249,240,0.96) 0%, rgba(255,255,255,0.92) 46%, rgba(236,253,245,0.94) 100%)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          right: -80,
          top: -80,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,118,110,0.18) 0%, rgba(15,118,110,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <Stack spacing={3.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <Chip label="Resonance Sound" sx={{ fontWeight: 800, bgcolor: '#d7f5ef', color: '#115e59' }} />
            <Chip label="Live production" variant="outlined" color="success" />
            <Chip label="Auto-publish enabled" variant="outlined" color="primary" />
            <Chip label="Cover uploads enabled" variant="outlined" color="secondary" />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
            <Chip label={auth.user ? `Сессия: ${auth.user.username}` : 'Гость'} color={auth.user ? 'success' : 'default'} />
            {catalog.health ? <Chip label={`API ${catalog.health.status}`} color="success" variant="outlined" /> : null}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {navItems.map((item) => (
            <Button key={item.to} component={RouterLink} to={item.to} variant="outlined" size="small">
              {item.label}
            </Button>
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} justifyContent="space-between">
          <Box sx={{ maxWidth: 860 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.7rem', md: '4.8rem' }, lineHeight: 0.92 }}>
              Рабочая сцена
              <br />
              аудио MVP
            </Typography>
            <Typography variant="h5" sx={{ mt: 2, maxWidth: 760, color: 'text.secondary', lineHeight: 1.45 }}>
              Платформа уже умеет создавать треки, загружать source, автоматически публиковать их после обработки,
              воспроизводить в общем плеере, хранить обложки и собирать первые сигналы через лайки.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignSelf="flex-start">
            <MetricTile label="Каталог" value={catalog.publicTracks.length} />
            <MetricTile label="Лайкнуто" value={catalog.likedTrackIds.length} />
            <MetricTile label="Мои треки" value={catalog.myTracks.length} />
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function FooterStatus() {
  return (
    <>
      <Divider />
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 7,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.94) 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant="h5">Что важно сейчас</Typography>
            <Typography color="text.secondary">
              Все пользователи видят опубликованные треки, owner удаляет свои, staff может удалять любые, а вкладка лайков
              уже даёт первый персональный loop поверх общего каталога.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip icon={<LibraryMusicRoundedIcon />} label="Плеер живой" color="success" variant="outlined" />
            <Chip icon={<FavoriteRoundedIcon />} label="Лайки отдельной вкладкой" color="secondary" variant="outlined" />
            <Chip icon={<PhotoCameraRoundedIcon />} label="Cover uploads" color="primary" variant="outlined" />
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
