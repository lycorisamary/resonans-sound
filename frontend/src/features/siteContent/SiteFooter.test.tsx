import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SiteContent } from '@/shared/api/types';
import { renderWithTheme } from '@/test/render';
import { SiteFooter } from './SiteFooter';

const content: SiteContent = {
  contact_title: 'Связаться с Resonans Sound',
  contact_email: 'hello@resonance-sound.ru',
  contact_telegram: '@resonance_sound',
  contact_phone: '+79990000000',
  contact_website: 'https://resonance-sound.ru',
  footer_note: 'Платформа для независимых артистов.',
  updated_at: '2026-04-28T00:00:00Z',
  faq_items: [
    {
      id: 1,
      question: 'Как попасть в подборку?',
      answer: 'Загрузите трек и оформите профиль артиста.',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 2,
      question: 'Скрытый вопрос',
      answer: 'Не должен быть виден публично.',
      sort_order: 2,
      is_active: false,
    },
  ],
};

describe('SiteFooter', () => {
  it('renders contacts and only active FAQ items', () => {
    const markup = renderWithTheme(
      <MemoryRouter>
        <SiteFooter content={content} />
      </MemoryRouter>
    );

    expect(markup).toContain('Связаться с Resonans Sound');
    expect(markup).toContain('hello@resonance-sound.ru');
    expect(markup).toContain('@resonance_sound');
    expect(markup).toContain('Как попасть в подборку?');
    expect(markup).not.toContain('Скрытый вопрос');
  });
});
