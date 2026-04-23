import { useCallback, useEffect, useState } from 'react';

import api from '@/shared/api/client';
import { ArtistProfile, Collection, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';

interface HomeFeedState {
  artists: ArtistProfile[];
  collections: Collection[];
  error: string | null;
  loading: boolean;
  popularTracks: Track[];
  recentTracks: Track[];
}

const initialState: HomeFeedState = {
  artists: [],
  collections: [],
  error: null,
  loading: true,
  popularTracks: [],
  recentTracks: [],
};

export function useHomeFeed() {
  const [state, setState] = useState<HomeFeedState>(initialState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [collections, recentTracks, popularTracks, artists] = await Promise.all([
        api.getCollections({ size: 4 }),
        api.getTracks({ sort: 'newest', size: 4 }),
        api.getTracks({ sort: 'popular', size: 4 }),
        api.getArtists({ sort: 'newest', size: 4 }),
      ]);

      setState({
        artists: artists.items,
        collections: collections.items,
        error: null,
        loading: false,
        popularTracks: popularTracks.items,
        recentTracks: recentTracks.items,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, 'Не удалось загрузить витрину главной страницы.'),
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}

export type UseHomeFeedResult = ReturnType<typeof useHomeFeed>;
