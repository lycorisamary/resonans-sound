import { ChangeEvent, FormEvent, ReactNode, useState } from 'react';

import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { SearchRoundedIcon } from '@/shared/ui/icons';

interface AppShellNavItem {
  label: string;
  to: string;
}

interface AppShellProps {
  navItems: AppShellNavItem[];
  onSearch: (value: string) => void;
  children: ReactNode;
}

export function AppShell({ navItems, onSearch, children }: AppShellProps) {
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
          'radial-gradient(circle at 50% 2%, rgba(255,23,23,0.08), transparent 26%), radial-gradient(circle at 15% 22%, rgba(255,0,0,0.06), transparent 20%), radial-gradient(circle at 85% 24%, rgba(255,0,0,0.06), transparent 20%), linear-gradient(180deg, #010101 0%, #050507 46%, #020203 100%)',
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
            background:
              'radial-gradient(circle at 50% 0%, rgba(255,23,23,0.1), transparent 28%), linear-gradient(180deg, rgba(8,8,9,0.98), rgba(2,2,3,0.98))',
            borderColor: 'rgba(255,35,35,0.12)',
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
                background: 'rgba(255,23,23,0.045)',
                border: '1px solid rgba(255,55,55,0.18)',
                boxShadow: '0 0 26px rgba(255,23,23,0.08)',
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 18,
                  flexShrink: 0,
                  position: 'relative',
                  '&::before, &::after': {
                    border: '1.6px solid #ff1717',
                    boxShadow: '0 0 10px rgba(255,23,23,0.75)',
                    content: '""',
                    height: 13,
                    position: 'absolute',
                    top: 3,
                    width: 13,
                  },
                  '&::before': {
                    borderRadius: '100% 0 100% 20%',
                    left: 0,
                    transform: 'rotate(-34deg) skewY(-8deg)',
                  },
                  '&::after': {
                    borderRadius: '0 100% 20% 100%',
                    right: 0,
                    transform: 'rotate(34deg) skewY(8deg)',
                  },
                }}
              />
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0, textShadow: '0 0 18px rgba(255,23,23,0.16)' }}>
                resonance
              </Typography>
            </Stack>

            <Stack spacing={0.75}>
              <Typography variant="overline" sx={{ color: 'text.secondary', px: 1.25 }}>
                Навигация
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
                        ? 'linear-gradient(135deg, rgba(155,0,9,0.88), rgba(255,23,23,0.74))'
                        : 'transparent',
                      border: active ? '1px solid rgba(255,55,55,0.35)' : '1px solid transparent',
                      '&:hover': {
                        background: active
                          ? 'linear-gradient(135deg, rgba(155,0,9,0.9), rgba(255,23,23,0.76))'
                          : 'rgba(255,23,23,0.07)',
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
                background: alpha('#ff1717', 0.045),
                border: '1px solid rgba(255,55,55,0.14)',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Треки, подборки, артисты
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Главная ведёт к музыке, ручному отбору и профилям артистов без лишнего шума.
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(255,23,23,0.08), transparent 26%), linear-gradient(180deg, rgba(10,10,12,0.92), rgba(3,3,4,0.96))',
            borderColor: 'rgba(255,35,35,0.14)',
            borderRadius: { xs: 5, md: 7 },
            boxShadow: '0 28px 80px rgba(0,0,0,0.72), inset 0 0 0 1px rgba(255,255,255,0.025)',
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
              background: 'rgba(5,5,7,0.78)',
              borderBottom: '1px solid rgba(255,35,35,0.14)',
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
                Музыка, которую можно заметить
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
                  background: 'rgba(255,23,23,0.045)',
                  border: '1px solid rgba(255,55,55,0.16)',
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
                  placeholder="Искать треки, артистов и подборки"
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
                Найти
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ p: { xs: 1.75, md: 2.5 } }}>{children}</Box>
        </Paper>
      </Box>
    </Box>
  );
}
