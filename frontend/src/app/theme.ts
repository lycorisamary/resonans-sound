import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff1717',
      light: '#ff6b6b',
      dark: '#8a0009',
    },
    secondary: {
      main: '#ff4b4b',
      light: '#ff9a9a',
      dark: '#9b0009',
    },
    background: {
      default: '#020203',
      paper: '#09090b',
    },
    text: {
      primary: '#fff7f7',
      secondary: '#b9a3a3',
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
      letterSpacing: 0,
    },
    h2: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h3: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h4: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: 0,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minWidth: 320,
          color: '#fff7f7',
          background:
            'radial-gradient(circle at 50% 2%, rgba(255,23,23,0.08), transparent 26%), radial-gradient(circle at 15% 22%, rgba(255,0,0,0.06), transparent 20%), radial-gradient(circle at 85% 24%, rgba(255,0,0,0.06), transparent 20%), linear-gradient(180deg, #010101 0%, #050507 46%, #020203 100%)',
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
          lineHeight: 1.2,
          paddingInline: 18,
          paddingBlock: 10,
          whiteSpace: 'normal',
        },
        contained: {
          background: 'linear-gradient(135deg, #9b0009, #ff1717 58%, #ff5757)',
          boxShadow: '0 0 18px rgba(255,23,23,0.36), 0 14px 34px rgba(120,0,0,0.34)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          maxWidth: '100%',
        },
        label: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          overflowWrap: 'anywhere',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 22,
          borderColor: alpha('#ff2828', 0.16),
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
            background: 'rgba(255,23,23,0.045)',
            borderRadius: 16,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,55,55,0.16)',
          },
          '& .MuiInputLabel-root': {
            color: '#b9a3a3',
          },
        },
      },
    },
  },
});
