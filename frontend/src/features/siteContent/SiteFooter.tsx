import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { SiteContent } from '@/shared/api/types';
import { ActionButton } from '@/shared/ui';

interface SiteFooterProps {
  content: SiteContent | null;
  error?: string | null;
}

function externalHref(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('tel:')) {
    return value;
  }
  if (value.startsWith('@')) {
    return `https://t.me/${value.slice(1)}`;
  }
  return value;
}

export function SiteFooter({ content, error }: SiteFooterProps) {
  const visibleFaq = content?.faq_items.filter((item) => item.is_active) ?? [];

  return (
    <Box
      component="footer"
      sx={{
        borderTop: '1px solid rgba(255,35,35,0.16)',
        background:
          'radial-gradient(circle at 70% 0%, rgba(255,23,23,0.12), transparent 26%), linear-gradient(180deg, rgba(5,5,7,0.2), rgba(2,2,3,0.92))',
        px: { xs: 1.75, md: 2.5 },
        py: { xs: 2.5, md: 3.5 },
      }}
    >
      <Stack spacing={2.5}>
        {error ? <Alert severity="warning">{error}</Alert> : null}
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={{ xs: 2.5, lg: 4 }} justifyContent="space-between">
          <Stack spacing={1.5} sx={{ maxWidth: 620, minWidth: 0 }}>
            <Chip label="Resonans Sound" color="secondary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, overflowWrap: 'anywhere' }}>
              {content?.contact_title ?? 'Связаться с Resonans Sound'}
            </Typography>
            <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {content?.footer_note ??
                'Платформа для независимых артистов: быстрая публикация, живой каталог и ручные подборки администрации.'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <ActionButton component={RouterLink} to="/studio" variant="contained" size="small">
                Загрузить трек
              </ActionButton>
              <ActionButton component={RouterLink} to="/collections" variant="outlined" size="small">
                Подборки
              </ActionButton>
              <ActionButton component={RouterLink} to="/artists" variant="outlined" size="small">
                Артисты
              </ActionButton>
            </Stack>
          </Stack>

          <Stack spacing={1.25} sx={{ minWidth: { lg: 280 }, maxWidth: { lg: 420 } }}>
            <Typography variant="overline" color="text.secondary">
              Контакты
            </Typography>
            {content?.contact_email ? (
              <Link href={`mailto:${content.contact_email}`} color="secondary.light" underline="hover" sx={{ overflowWrap: 'anywhere' }}>
                {content.contact_email}
              </Link>
            ) : null}
            {content?.contact_telegram ? (
              <Link href={externalHref(content.contact_telegram)} target="_blank" rel="noreferrer" color="secondary.light" underline="hover" sx={{ overflowWrap: 'anywhere' }}>
                {content.contact_telegram}
              </Link>
            ) : null}
            {content?.contact_phone ? (
              <Link href={`tel:${content.contact_phone}`} color="secondary.light" underline="hover" sx={{ overflowWrap: 'anywhere' }}>
                {content.contact_phone}
              </Link>
            ) : null}
            {content?.contact_website ? (
              <Link href={externalHref(content.contact_website)} target="_blank" rel="noreferrer" color="secondary.light" underline="hover" sx={{ overflowWrap: 'anywhere' }}>
                {content.contact_website}
              </Link>
            ) : null}
          </Stack>
        </Stack>

        {visibleFaq.length > 0 ? (
          <Stack spacing={1.25}>
            <Typography variant="h5">FAQ</Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              {visibleFaq.map((item) => (
                <Accordion
                  key={item.id}
                  disableGutters
                  sx={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,55,55,0.14)',
                    borderRadius: 2,
                    '&::before': { display: 'none' },
                  }}
                >
                  <AccordionSummary>
                    <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{item.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                      {item.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
