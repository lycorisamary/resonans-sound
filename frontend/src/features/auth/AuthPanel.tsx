import { FormEvent, useState } from 'react';
import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';

import { UseAuthResult } from '@/hooks/useAuth';
import { ActionButton, AppTextField, SectionCard } from '@/shared/ui';
import { ShieldRoundedIcon } from '@/shared/ui/icons';

interface AuthPanelProps {
  auth: UseAuthResult;
  likedTrackIdsCount: number;
  myTracksCount: number;
  publicTracksCount: number;
  onLogout: () => void;
}

export function AuthPanel({ auth, likedTrackIdsCount, myTracksCount, publicTracksCount, onLogout }: AuthPanelProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void auth.login({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void auth.register({ email: registerEmail, password: registerPassword, username: registerUsername });
  };

  return (
    <SectionCard tone="orange" sx={{ flex: 0.85 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Сессия и доступ</Typography>
            <Typography color="text.secondary">Авторизация, staff-права и быстрый входной контекст.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip label="JWT auth" color="success" variant="outlined" />
            <Chip label={auth.isStaff ? 'Staff delete enabled' : 'User mode'} variant="outlined" color={auth.isStaff ? 'secondary' : 'default'} />
          </Stack>
        </Stack>

        {!auth.user ? (
          <Stack spacing={2.5}>
            <Alert severity="info">
              <strong>Admin:</strong> `admin@audioplatform.com` / `admin123`.
              <br />
              <strong>Moderator:</strong> создайте обычный аккаунт, затем смените ему роль в БД на `moderator`.
            </Alert>

            <Alert severity="warning">
              Сейчас сервис работает по упрощённому flow: после успешного processing треки публикуются автоматически, а роли
              `admin/moderator` нужны прежде всего для расширенных прав удаления.
            </Alert>

            <Stack direction="row" spacing={1}>
              <ActionButton variant={auth.authMode === 'login' ? 'contained' : 'outlined'} onClick={() => auth.setAuthMode('login')}>
                Вход
              </ActionButton>
              <ActionButton variant={auth.authMode === 'register' ? 'contained' : 'outlined'} onClick={() => auth.setAuthMode('register')}>
                Регистрация
              </ActionButton>
            </Stack>

            {auth.authMode === 'login' ? (
              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2}>
                  <AppTextField label="Email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
                  <AppTextField
                    label="Пароль"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                  <ActionButton type="submit" variant="contained" disabled={auth.authBusy}>
                    {auth.authBusy ? 'Входим...' : 'Открыть сессию'}
                  </ActionButton>
                </Stack>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleRegister}>
                <Stack spacing={2}>
                  <AppTextField label="Username" value={registerUsername} onChange={(event) => setRegisterUsername(event.target.value)} required />
                  <AppTextField
                    label="Email"
                    type="email"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    required
                  />
                  <AppTextField
                    label="Пароль"
                    helperText="Минимум 8 символов, одна заглавная буква и одна цифра."
                    type="password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    required
                  />
                  <ActionButton type="submit" variant="contained" disabled={auth.authBusy}>
                    {auth.authBusy ? 'Создаём...' : 'Создать аккаунт'}
                  </ActionButton>
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 5 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6">{auth.user.username}</Typography>
                    <Typography color="text.secondary">{auth.user.email}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={auth.user.role} color="success" variant="outlined" />
                    <Chip label={auth.user.status} color="success" variant="outlined" />
                  </Stack>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Аккаунт уже связан с live auth API. Можно создавать треки, загружать source/cover, ставить лайки и
                  воспроизводить опубликованные записи.
                </Typography>

                {auth.isStaff ? (
                  <Alert severity="info" icon={<ShieldRoundedIcon fontSize="inherit" />}>
                    У этой роли есть расширенное право удалять любые треки, не только свои.
                  </Alert>
                ) : null}

                <ActionButton variant="outlined" onClick={onLogout} disabled={auth.authBusy}>
                  Выйти
                </ActionButton>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Лайки ${likedTrackIdsCount}`} variant="outlined" />
              <Chip label={`Мои треки ${myTracksCount}`} variant="outlined" />
              <Chip label={`Каталог ${publicTracksCount}`} variant="outlined" />
            </Stack>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
