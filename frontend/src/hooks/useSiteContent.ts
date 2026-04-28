import { useCallback, useEffect, useState } from 'react';

import api from '@/shared/api/client';
import { SiteContent } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';

interface SiteContentState {
  content: SiteContent | null;
  error: string | null;
  loading: boolean;
}

export function useSiteContent() {
  const [state, setState] = useState<SiteContentState>({
    content: null,
    error: null,
    loading: true,
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      setState({
        content: await api.getSiteContent(),
        error: null,
        loading: false,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, 'Не удалось загрузить контакты и FAQ.'),
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

export type UseSiteContentResult = ReturnType<typeof useSiteContent>;
