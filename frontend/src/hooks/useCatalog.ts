import { FormEvent, useEffect } from 'react';

import { loadAuthenticatedStateIntoStore, resetAuthenticatedState } from '@/features/auth/model/authData';
import { loadPublicCatalogIntoStore, refreshWholeUiIntoStore } from '@/features/catalog/model/catalogData';
import api from '@/shared/api/client';
import { CatalogSort, CatalogView } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { clearTokens, hasAccessToken } from '@/shared/lib/tokens';
import { useAppStatusStore, useCatalogStore } from '@/shared/store/appStore';

export function useCatalog() {
  const health = useAppStatusStore((state) => state.health);
  const initialLoading = useAppStatusStore((state) => state.initialLoading);
  const pageError = useAppStatusStore((state) => state.pageError);
  const banner = useAppStatusStore((state) => state.banner);
  const setHealth = useAppStatusStore((state) => state.setHealth);
  const setInitialLoading = useAppStatusStore((state) => state.setInitialLoading);
  const setPageError = useAppStatusStore((state) => state.setPageError);

  const catalogBusy = useCatalogStore((state) => state.catalogBusy);
  const catalogView = useCatalogStore((state) => state.catalogView);
  const categories = useCatalogStore((state) => state.categories);
  const publicTracks = useCatalogStore((state) => state.publicTracks);
  const likedTracks = useCatalogStore((state) => state.likedTracks);
  const myTracks = useCatalogStore((state) => state.myTracks);
  const selectedCategory = useCatalogStore((state) => state.selectedCategory);
  const catalogSearchInput = useCatalogStore((state) => state.catalogSearchInput);
  const catalogSearch = useCatalogStore((state) => state.catalogSearch);
  const catalogGenre = useCatalogStore((state) => state.catalogGenre);
  const catalogTagInput = useCatalogStore((state) => state.catalogTagInput);
  const catalogTag = useCatalogStore((state) => state.catalogTag);
  const catalogSort = useCatalogStore((state) => state.catalogSort);
  const likedTrackIds = useCatalogStore((state) => state.likedTrackIds);
  const setCatalogView = useCatalogStore((state) => state.setCatalogView);
  const setSelectedCategory = useCatalogStore((state) => state.setSelectedCategory);
  const setCatalogSearchInput = useCatalogStore((state) => state.setCatalogSearchInput);
  const setCatalogSearch = useCatalogStore((state) => state.setCatalogSearch);
  const setCatalogGenre = useCatalogStore((state) => state.setCatalogGenre);
  const setCatalogTagInput = useCatalogStore((state) => state.setCatalogTagInput);
  const setCatalogTag = useCatalogStore((state) => state.setCatalogTag);
  const setCatalogSort = useCatalogStore((state) => state.setCatalogSort);

  const displayedTracks = catalogView === 'liked' ? likedTracks : publicTracks;

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setHealth(await api.getHealth());
        await loadPublicCatalogIntoStore({ category: 'all' });

        if (hasAccessToken()) {
          try {
            await loadAuthenticatedStateIntoStore();
          } catch {
            clearTokens();
            resetAuthenticatedState();
          }
        }
      } catch (err) {
        setPageError(getErrorMessage(err, 'Не удалось загрузить приложение'));
      } finally {
        setInitialLoading(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (initialLoading) {
      return;
    }

    void loadPublicCatalogIntoStore();
  }, [selectedCategory, catalogSearch, catalogGenre, catalogTag, catalogSort, initialLoading]);

  const handleCatalogSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCatalogSearch(catalogSearchInput.trim());
    setCatalogTag(catalogTagInput.trim());
  };

  const clearCatalogSearch = () => {
    setCatalogSearchInput('');
    setCatalogSearch('');
    setCatalogTagInput('');
    setCatalogTag('');
    setCatalogGenre('');
  };

  return {
    banner,
    catalogBusy,
    catalogSearch,
    catalogSearchInput,
    catalogGenre,
    catalogTag,
    catalogTagInput,
    catalogSort,
    catalogView,
    categories,
    clearCatalogSearch,
    displayedTracks,
    handleCatalogSearch,
    health,
    initialLoading,
    likedTrackIds,
    likedTracks,
    myTracks,
    pageError,
    publicTracks,
    refreshWholeUi: refreshWholeUiIntoStore,
    selectedCategory,
    setCatalogSearchInput,
    setCatalogGenre,
    setCatalogTagInput,
    setCatalogSort: (sort: CatalogSort) => setCatalogSort(sort),
    setCatalogView: (view: CatalogView) => setCatalogView(view),
    setSelectedCategory,
  };
}

export type UseCatalogResult = ReturnType<typeof useCatalog>;
