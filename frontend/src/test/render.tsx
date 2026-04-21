import { CssBaseline, ThemeProvider } from '@mui/material';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReactElement } from 'react';

import { theme } from '@/app/theme';

export function renderWithTheme(element: ReactElement): string {
  return renderToStaticMarkup(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {element}
    </ThemeProvider>
  );
}
