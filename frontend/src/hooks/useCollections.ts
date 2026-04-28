import { useCallback, useEffect, useState } from 'react';

import api from '@/shared/api/client';
import { Collection } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getCollections({ size: 20 });
      setCollections(response.items);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось загрузить подборки.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  return {
    collections,
    error,
    loading,
    reload: loadCollections,
  };
}

export type UseCollectionsResult = ReturnType<typeof useCollections>;
