import { FormEvent, useCallback, useEffect, useState } from 'react';

import { Alert, Box, Checkbox, CircularProgress, FormControlLabel, Stack, Typography } from '@mui/material';

import api from '@/shared/api/client';
import { SiteContent, SiteFAQItemPayload } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import { DeleteOutlineRoundedIcon, RefreshRoundedIcon } from '@/shared/ui/icons';

interface SiteContentPanelProps {
  onSaved?: () => void | Promise<void>;
}

const emptyFaqItem = (sortOrder: number): SiteFAQItemPayload => ({
  question: '',
  answer: '',
  sort_order: sortOrder,
  is_active: true,
});

export function SiteContentPanel({ onSaved }: SiteContentPanelProps) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [faqItems, setFaqItems] = useState<SiteFAQItemPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setPanelError(null);
    try {
      const response = await api.getAdminSiteContent();
      setContent(response);
      setFaqItems(response.faq_items.map((item) => ({ ...item })));
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Не удалось загрузить footer и FAQ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const updateContentField = (field: keyof SiteContent, value: string) => {
    setContent((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateFaqItem = (index: number, patch: Partial<SiteFAQItemPayload>) => {
    setFaqItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addFaqItem = () => {
    setFaqItems((current) => [...current, emptyFaqItem(current.length + 1)]);
  };

  const removeFaqItem = (index: number) => {
    setFaqItems((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content) {
      return;
    }

    setSaving(true);
    setPanelError(null);
    setPanelMessage(null);

    try {
      const saved = await api.updateAdminSiteContent({
        contact_title: content.contact_title,
        contact_email: content.contact_email || null,
        contact_telegram: content.contact_telegram || null,
        contact_phone: content.contact_phone || null,
        contact_website: content.contact_website || null,
        footer_note: content.footer_note || null,
        faq_items: faqItems.map((item, index) => ({
          id: item.id ?? null,
          question: item.question,
          answer: item.answer,
          sort_order: index + 1,
          is_active: item.is_active,
        })),
      });
      setContent(saved);
      setFaqItems(saved.faq_items.map((item) => ({ ...item })));
      setPanelMessage('Footer и FAQ обновлены.');
      await onSaved?.();
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Не удалось сохранить footer и FAQ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard tone="green">
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.25}>
          <Box>
            <Typography variant="h4">Footer и FAQ</Typography>
            <Typography color="text.secondary">Контакты и вопросы в нижней части сайта. Изменения сразу видны публично.</Typography>
          </Box>
          <ActionButton variant="outlined" onClick={() => void loadContent()} startIcon={<RefreshRoundedIcon />} disabled={loading || saving}>
            Обновить
          </ActionButton>
        </Stack>

        {panelError ? <Alert severity="error">{panelError}</Alert> : null}
        {panelMessage ? <Alert severity="success">{panelMessage}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем footer...</Typography>
          </Stack>
        ) : null}

        {content ? (
          <Stack component="form" spacing={2} onSubmit={submit}>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
              <AppTextField
                label="Заголовок контактов"
                value={content.contact_title}
                onChange={(event) => updateContentField('contact_title', event.target.value)}
                required
              />
              <AppTextField
                label="Email"
                value={content.contact_email ?? ''}
                onChange={(event) => updateContentField('contact_email', event.target.value)}
              />
              <AppTextField
                label="Telegram"
                value={content.contact_telegram ?? ''}
                onChange={(event) => updateContentField('contact_telegram', event.target.value)}
              />
              <AppTextField
                label="Телефон"
                value={content.contact_phone ?? ''}
                onChange={(event) => updateContentField('contact_phone', event.target.value)}
              />
              <AppTextField
                label="Сайт"
                value={content.contact_website ?? ''}
                onChange={(event) => updateContentField('contact_website', event.target.value)}
              />
              <AppTextField
                label="Описание footer"
                value={content.footer_note ?? ''}
                onChange={(event) => updateContentField('footer_note', event.target.value)}
                multiline
                minRows={3}
              />
            </Box>

            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                <Typography variant="h5">FAQ</Typography>
                <ActionButton type="button" variant="outlined" onClick={addFaqItem} disabled={faqItems.length >= 12}>
                  Добавить вопрос
                </ActionButton>
              </Stack>

              {faqItems.map((item, index) => (
                <Box
                  key={`${item.id ?? 'new'}-${index}`}
                  sx={{
                    border: '1px solid rgba(255,55,55,0.14)',
                    borderRadius: 3,
                    p: 1.5,
                    background: 'rgba(255,255,255,0.025)',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                      <AppTextField
                        label={`Вопрос ${index + 1}`}
                        value={item.question}
                        onChange={(event) => updateFaqItem(index, { question: event.target.value })}
                        required
                        fullWidth
                      />
                      <ActionButton
                        type="button"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() => removeFaqItem(index)}
                        sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
                      >
                        Удалить
                      </ActionButton>
                    </Stack>
                    <AppTextField
                      label="Ответ"
                      value={item.answer}
                      onChange={(event) => updateFaqItem(index, { answer: event.target.value })}
                      required
                      multiline
                      minRows={3}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={item.is_active} onChange={(event) => updateFaqItem(index, { is_active: event.target.checked })} />}
                      label="Показывать на сайте"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ActionButton type="submit" variant="contained" disabled={saving}>
                {saving ? 'Сохраняем...' : 'Сохранить footer и FAQ'}
              </ActionButton>
              <ActionButton type="button" variant="outlined" onClick={() => void loadContent()} disabled={saving}>
                Отменить изменения
              </ActionButton>
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
