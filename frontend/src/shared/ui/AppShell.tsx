import { ChangeEvent, FormEvent, ReactNode, useState } from 'react';

import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { SearchRoundedIcon } from '@/shared/ui/icons';

interface AppShellNavItem {
  label: string;
  to: string;
}

interface AppShellProps {
  authLabel: string;
  healthLabel?: string | null;
  navItems: AppShellNavItem[];
  onSearch: (value: string) => void;
  children: ReactNode;
}

export function AppShell({ authLabel, healthLabel, navItems, onSearch, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchValue.trim());
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top right, rgba(255,95,122,0.12), transparent 22%), radial-gradient(circle at top left, rgba(143,16,35,0.12), transparent 20%), linear-gradient(180deg, #09090d 0%, #0d0d13 100%)',
        color: 'text.primary',
        pb: { xs: 15, md: 18 },
        pt: { xs: 1.5, md: 2.5 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
          maxWidth: 1560,
          mx: 'auto',
          px: { xs: 1.5, md: 2.5 },
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            alignSelf: { xs: 'stretch', lg: 'start' },
            background: 'linear-gradient(180deg, rgba(12,12,18,0.98), rgba(16,16,24,0.96))',
            borderColor: 'rgba(255,255,255,0.06)',
            borderRadius: { xs: 5, lg: 7 },
            height: { xs: 'auto', lg: 'calc(100vh - 40px)' },
            p: 2,
            position: { xs: 'static', lg: 'sticky' },
            top: 20,
          }}
        >
          <Stack spacing={2.25}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                p: 1.5,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c0162f, #ff5f7a)',
                  boxShadow: '0 0 22px rgba(192,22,47,0.36)',
                  flexShrink: 0,
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em' }}>
                resonance
              </Typography>
            </Stack>

            <Stack spacing={0.75}>
              <Typography variant="overline" sx={{ color: 'text.secondary', px: 1.25 }}>
                Navigation
              </Typography>
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    variant={active ? 'contained' : 'text'}
                    sx={{
                      justifyContent: 'flex-start',
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 3.5,
                      color: active ? '#fff' : 'text.secondary',
                      background: active
                        ? 'linear-gradient(135deg, rgba(192,22,47,0.88), rgba(255,95,122,0.74))'
                        : 'transparent',
                      border: active ? '1px solid rgba(255,95,122,0.35)' : '1px solid transparent',
                      '&:hover': {
                        background: active
                          ? 'linear-gradient(135deg, rgba(192,22,47,0.9), rgba(255,95,122,0.76))'
                          : 'rgba(255,255,255,0.04)',
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                        mr: 1.25,
                        opacity: 0.85,
                      }}
                    />
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            <Stack
              spacing={1}
              sx={{
                mt: 'auto',
                p: 1.75,
                borderRadius: 4,
                background: alpha('#ffffff', 0.03),
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Discovery-first runtime
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Главная теперь работает как витрина артистов, подборок и свежих релизов, а studio и account остаются отдельными
                модулями.
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), rgba(11,11,16,0.94)',
            borderColor: 'rgba(255,255,255,0.06)',
            borderRadius: { xs: 5, md: 7 },
            boxShadow: '0 28px 80px rgba(0, 0, 0, 0.34)',
            minHeight: 'calc(100vh - 40px)',
            overflow: 'hidden',
          }}
        >
          <Stack
            component="header"
            direction={{ xs: 'column', xl: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', xl: 'center' }}
            justifyContent="space-between"
            sx={{
              backdropFilter: 'blur(18px)',
              background: 'rgba(11,11,16,0.72)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              p: { xs: 1.75, md: 2.5 },
              position: 'sticky',
              top: 0,
              zIndex: 20,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Resonans Sound
              </Typography>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.2rem', md: '1.6rem' } }}>
                Curated audio discovery
              </Typography>
            </Box>

            <Stack
              component="form"
              onSubmit={submitSearch}
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ width: { xs: '100%', xl: 'auto' }, flex: 1, maxWidth: 720 }}
            >
              <Box
                sx={{
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999,
                  display: 'flex',
                  gap: 1,
                  px: 1.5,
                  py: 0.25,
                  width: '100%',
                }}
              >
                <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Box
                  component="input"
                  value={searchValue}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchValue(event.target.value)}
                  placeholder="Search tracks or artists and jump to the catalog"
                  sx={{
                    background: 'transparent',
                    border: 0,
                    color: 'text.primary',
                    flex: 1,
                    font: 'inherit',
                    minWidth: 0,
                    outline: 'none',
                    py: 1.2,
                  }}
                />
              </Box>
              <Button type="submit" variant="contained">
                Search
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={authLabel} color="secondary" variant="outlined" />
              {healthLabel ? <Chip label={healthLabel} color="success" variant="outlined" /> : null}
            </Stack>
          </Stack>

          <Box sx={{ p: { xs: 1.75, md: 2.5 } }}>{children}</Box>
        </Paper>
      </Box>
    </Box>
  );
}
