import { useNavigate } from 'react-router-dom';

import { loadAuthenticatedStateIntoStore, resetAuthenticatedState } from '@/features/auth/model/authData';
import api from '@/shared/api/client';
import { AuthMode, LoginCredentials, RegisterCredentials } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { clearTokens, saveTokens } from '@/shared/lib/tokens';
import {
  initialTrackForm,
  useAppStatusStore,
  useAuthStore,
  useCatalogStore,
  usePlayerStore,
  useStudioStore,
} from '@/shared/store/appStore';

export function useAuth() {
  const navigate = useNavigate();
  const authMode = useAuthStore((state) => state.authMode);
  const authBusy = useAuthStore((state) => state.authBusy);
  const user = useAuthStore((state) => state.user);
  const setAuthMode = useAuthStore((state) => state.setAuthMode);
  const setAuthBusy = useAuthStore((state) => state.setAuthBusy);
  const setPageError = useAppStatusStore((state) => state.setPageError);
  const setBanner = useAppStatusStore((state) => state.setBanner);
  const setCatalogView = useCatalogStore((state) => state.setCatalogView);

  const isStaff = user?.role === 'moderator' || user?.role === 'admin';

  const login = async ({ email, password }: LoginCredentials) => {
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const tokens = await api.login(email, password);
      saveTokens(tokens);
      await loadAuthenticatedStateIntoStore();
      setBanner('Вход выполнен. Теперь можно создавать треки, загружать аудио и работать с лайками.');
      setCatalogView('catalog');
      navigate('/me');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось выполнить вход'));
    } finally {
      setAuthBusy(false);
    }
  };

  const register = async ({ email, password, username }: RegisterCredentials) => {
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const tokens = await api.register(email, password, username);
      saveTokens(tokens);
      await loadAuthenticatedStateIntoStore();
      setBanner('Аккаунт создан, сессия уже открыта.');
      setCatalogView('catalog');
      navigate('/studio');
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось создать аккаунт'));
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = async (stopAndResetAudio?: () => void) => {
    setAuthBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.logout();
    } finally {
      stopAndResetAudio?.();
      clearTokens();
      resetAuthenticatedState();
      useStudioStore.setState({
        studioBusy: false,
        editingTrackId: null,
        uploadingCoverTrackId: null,
        uploadingTrackId: null,
        trackForm: initialTrackForm,
      });
      usePlayerStore.getState().resetPlayer();
      setCatalogView('catalog');
      setAuthBusy(false);
      navigate('/login');
    }
  };

  return {
    authBusy,
    authMode,
    isStaff,
    login,
    logout,
    register,
    setAuthMode: (mode: AuthMode) => setAuthMode(mode),
    user,
  };
}

export type UseAuthResult = ReturnType<typeof useAuth>;
