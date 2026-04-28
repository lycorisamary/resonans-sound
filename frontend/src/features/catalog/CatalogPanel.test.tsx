import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '@/test/render';
import { CatalogPanel } from './CatalogPanel';

describe('CatalogPanel', () => {
  it('renders active discovery filters and empty-state reset affordance', () => {
    const markup = renderWithTheme(
      <MemoryRouter>
        <CatalogPanel
          auth={{ user: { id: 1 } } as never}
          catalog={
            {
              catalogBusy: false,
              catalogSearch: 'lycoris',
              catalogSearchInput: 'lycoris',
              catalogGenre: 'darkwave',
              catalogTag: 'night',
              catalogTagInput: 'night',
              catalogSort: 'popular',
              catalogView: 'catalog',
              categories: [{ id: 1, name: 'Featured', slug: 'featured', description: null, sort_order: 1, is_active: true, created_at: '2026-04-28T00:00:00Z' }],
              displayedTracks: [],
              selectedCategory: 'featured',
              publicTracks: [],
              likedTracks: [],
              myTracks: [],
              likedTrackIds: [],
              health: null,
              initialLoading: false,
              pageError: null,
              banner: null,
              clearCatalogSearch: vi.fn(),
              handleCatalogSearch: vi.fn(),
              refreshWholeUi: vi.fn(),
              setCatalogSearchInput: vi.fn(),
              setCatalogGenre: vi.fn(),
              setCatalogTagInput: vi.fn(),
              setCatalogSort: vi.fn(),
              setCatalogView: vi.fn(),
              setSelectedCategory: vi.fn(),
            } as never
          }
          player={{ activeTrackId: null, isPlaying: false, playerLoading: false } as never}
          trackActions={{} as never}
        />
      </MemoryRouter>
    );

    expect(markup).toContain('Сбросить всё (5)');
    expect(markup).toContain('Категория: Featured');
    expect(markup).toContain('Порядок: по популярности');
    expect(markup).toContain('По текущему запросу ничего не найдено.');
  });
});
