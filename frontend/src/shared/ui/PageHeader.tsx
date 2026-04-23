import { ReactNode } from 'react';

import { Box, Stack, Typography } from '@mui/material';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'flex-end' }}>
      <Box sx={{ maxWidth: 840 }}>
        {eyebrow ? (
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, mt: eyebrow ? 0.5 : 0 }}>
          {title}
        </Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: 760 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
}
