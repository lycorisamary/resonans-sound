import { Alert, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminPanel } from '@/features/admin/AdminPanel';
import { ArtistDetailPage } from '@/features/artists/ArtistDetailPage';
import { ArtistProfileEditor } from '@/features/artists/ArtistProfileEditor';
import { ArtistsPanel } from '@/features/artists/ArtistsPanel';
import { AuthPanel } from '@/features/auth/AuthPanel';
import { CollectionDetailPage } from '@/features/collections/CollectionDetailPage';
import { CollectionsPanel } from '@/features/collections/CollectionsPanel';
import { HomePage } from '@/features/home/HomePage';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { StudioForm } from '@/features/studio/StudioForm';
import { TrackDetailPage } from '@/features/tracks/TrackDetailPage';
import { useAuth } from '@/hooks/useAuth';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useCatalog } from '@/hooks/useCatalog';
import { useTrackActions } from '@/hooks/useTrackActions';
import { useCatalogStore } from '@/shared/store/appStore';
import { AppShell, SectionCard } from '@/shared/ui';

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
  const setCatalogSearchInput = useCatalogStore((state) => state.setCatalogSearchInput);
  const setCatalogSearch = useCatalogStore((state) => state.setCatalogSearch);
  const setCatalogView = useCatalogStore((state) => state.setCatalogView);

  const navItems = [
    { label: 'Главная', to: '/' },
    { label: 'Подборки', to: '/collections' },
    { label: 'Артисты', to: '/artists' },
    { label: 'Studio', to: '/studio' },
    { label: 'Кабинет', to: '/me' },
    { label: 'Вход', to: '/login' },
  ];

  if (auth.isStaff) {
    navItems.push({ label: 'Admin', to: '/admin' });
  }

  const handleShellSearch = (value: string) => {
    setCatalogSearchInput(value);
    setCatalogSearch(value);
    setCatalogView('catalog');
  };

  return (
    <>
      <AppShell
        authLabel={auth.user ? `Session: ${auth.user.username}` : 'Guest mode'}
        healthLabel={catalog.health ? `API ${catalog.health.status}` : null}
        navItems={navItems}
        onSearch={handleShellSearch}
      >
        <Stack spacing={2.5}>
          {catalog.initialLoading ? (
            <SectionCard tone="neutral">
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={22} />
                <Typography>Поднимаем runtime-состояние приложения...</Typography>
              </Stack>
            </SectionCard>
          ) : null}

          {catalog.pageError ? <Alert severity="error">{catalog.pageError}</Alert> : null}
          {catalog.banner ? <Alert severity="success">{catalog.banner}</Alert> : null}

          <Routes>
            <Route path="/" element={<HomePage auth={auth} catalog={catalog} player={player} trackActions={trackActions} />} />
            <Route path="/collections" element={<CollectionsPanel player={player} />} />
            <Route path="/artists" element={<ArtistsPanel />} />
            <Route path="/artists/:username" element={<ArtistDetailPage auth={auth} player={player} trackActions={trackActions} />} />
            <Route
              path="/collections/:id"
              element={<CollectionDetailPage auth={auth} player={player} trackActions={trackActions} />}
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
            <Route path="/studio" element={<StudioForm auth={auth} catalog={catalog} player={player} trackActions={trackActions} />} />
            <Route
              path="/me"
              element={
                <Stack spacing={2.5}>
                  <AuthPanel
                    auth={auth}
                    likedTrackIdsCount={catalog.likedTrackIds.length}
                    myTracksCount={catalog.myTracks.length}
                    publicTracksCount={catalog.publicTracks.length}
                    onLogout={logout}
                  />
                  <ArtistProfileEditor username={auth.user?.username ?? null} />
                  <StudioForm auth={auth} catalog={catalog} player={player} trackActions={trackActions} />
                </Stack>
              }
            />
            <Route path="/tracks/:id" element={<TrackDetailPage auth={auth} player={player} trackActions={trackActions} />} />
            <Route path="/admin" element={<AdminPanel auth={auth} player={player} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Divider />
          <Typography color="text.secondary" sx={{ px: 0.5 }}>
            Frontend редизайн остаётся в пределах текущего runtime-контракта: player глобальный, studio отдельно, discovery строится на
            уже активных сущностях tracks, artists, collections, likes и reports.
          </Typography>
        </Stack>
      </AppShell>

      <PlayerPanel player={player} />
    </>
  );
}
