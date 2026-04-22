import api from '@/shared/api/client';
import { TrackListParams } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { hasAccessToken } from '@/shared/lib/tokens';
import { useAppStatusStore, useCatalogStore } from '@/shared/store/appStore';
import { loadAuthenticatedStateIntoStore } from '@/features/auth/model/authData';

interface CatalogLoadOverrides {
  category?: string;
  search?: string;
  genre?: string;
  tag?: string;
  sort?: TrackListParams['sort'];
}

export async function loadPublicCatalogIntoStore(overrides: CatalogLoadOverrides = {}): Promise<void> {
  const catalogState = useCatalogStore.getState();
  catalogState.setCatalogBusy(true);

  try {
    const category = overrides.category ?? catalogState.selectedCategory;
    const search = overrides.search ?? catalogState.catalogSearch;
    const genre = overrides.genre ?? catalogState.catalogGenre;
    const tag = overrides.tag ?? catalogState.catalogTag;
    const sort = overrides.sort ?? catalogState.catalogSort;
    const params: TrackListParams = {
      ...(category === 'all' ? {} : { category }),
      ...(search ? { search } : {}),
      ...(genre ? { genre } : {}),
      ...(tag ? { tag } : {}),
      sort,
    };

    const [categoriesResponse, tracksResponse] = await Promise.all([api.getCategories(), api.getTracks(params)]);

    useCatalogStore.getState().setCategories(categoriesResponse);
    useCatalogStore.getState().setPublicTracks(tracksResponse.items);
  } catch (err) {
    useAppStatusStore.getState().setPageError(getErrorMessage(err, 'Не удалось загрузить каталог'));
  } finally {
    useCatalogStore.getState().setCatalogBusy(false);
  }
}

export async function refreshWholeUiIntoStore(): Promise<void> {
  await loadPublicCatalogIntoStore();

  if (hasAccessToken()) {
    await loadAuthenticatedStateIntoStore();
  }
}
