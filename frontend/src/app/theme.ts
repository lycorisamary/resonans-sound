import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff5f7a',
      light: '#ff8ea1',
      dark: '#c0162f',
    },
    secondary: {
      main: '#d4b38f',
      light: '#f0d8bb',
      dark: '#a98762',
    },
    background: {
      default: '#09090d',
      paper: '#12121a',
    },
    text: {
      primary: '#f5f5f7',
      secondary: '#a1a1ad',
    },
    success: {
      main: '#77d28c',
    },
    warning: {
      main: '#ffcf66',
    },
    error: {
      main: '#ff7a90',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Space Grotesk", "Avenir Next", "Trebuchet MS", sans-serif',
    h1: {
      fontWeight: 900,
      letterSpacing: '-0.05em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.04em',
    },
    h3: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: '-0.01em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minWidth: 360,
          color: '#f5f5f7',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 18px 48px rgba(0, 0, 0, 0.28)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 18,
          paddingBlock: 10,
        },
        contained: {
          background: 'linear-gradient(135deg, #c0162f, #ff5f7a)',
          boxShadow: '0 14px 30px rgba(192,22,47,0.26)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 22,
          borderColor: alpha('#ffffff', 0.08),
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'medium',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.08)',
          },
          '& .MuiInputLabel-root': {
            color: '#a1a1ad',
          },
        },
      },
    },
  },
});
