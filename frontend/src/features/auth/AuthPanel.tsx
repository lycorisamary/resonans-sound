import { FormEvent, useState } from 'react';

import { Alert, Box, Chip, Grid, Stack, Typography } from '@mui/material';

import { UseAuthResult } from '@/hooks/useAuth';
import { ActionButton, AppTextField, MetricTile, PageHeader, SectionCard } from '@/shared/ui';
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
    <SectionCard tone="orange">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Access"
          title="Сессия и доступ"
          description="JWT auth уже является рабочим production-flow. Здесь пользователь входит, создаёт аккаунт и попадает в studio или кабинет без отдельного временного слоя."
          actions={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="JWT auth" color="success" variant="outlined" />
              <Chip label={auth.isStaff ? 'Staff mode' : 'User mode'} variant="outlined" color={auth.isStaff ? 'secondary' : 'default'} />
            </Stack>
          }
        />

        {!auth.user ? (
          <Grid container spacing={2}>
            <Grid item xs={12} xl={4}>
              <Stack spacing={1.5}>
                <Alert severity="warning">
                  После processing треки публикуются автоматически, а `admin` и `moderator` нужны для скрытия, восстановления и удаления
                  уже опубликованного мусора.
                </Alert>
                <Alert severity="info">
                  <strong>Admin:</strong> `admin@audioplatform.com` / `admin123`
                </Alert>
                <Stack direction="row" spacing={1}>
                  <ActionButton variant={auth.authMode === 'login' ? 'contained' : 'outlined'} onClick={() => auth.setAuthMode('login')}>
                    Вход
                  </ActionButton>
                  <ActionButton variant={auth.authMode === 'register' ? 'contained' : 'outlined'} onClick={() => auth.setAuthMode('register')}>
                    Регистрация
                  </ActionButton>
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} xl={8}>
              <SectionCard tone="neutral" sx={{ p: 2.5 }}>
                {auth.authMode === 'login' ? (
                  <Stack component="form" spacing={2} onSubmit={handleLogin}>
                    <Typography variant="h5">Открыть сессию</Typography>
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
                ) : (
                  <Stack component="form" spacing={2} onSubmit={handleRegister}>
                    <Typography variant="h5">Создать аккаунт</Typography>
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
                )}
              </SectionCard>
            </Grid>
          </Grid>
        ) : (
          <Stack spacing={2.5}>
            <SectionCard tone="neutral" sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h4">{auth.user.username}</Typography>
                    <Typography color="text.secondary">{auth.user.email}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={auth.user.role} color="success" variant="outlined" />
                    <Chip label={auth.user.status} color="secondary" variant="outlined" />
                  </Stack>
                </Stack>

                <Typography color="text.secondary">
                  Аккаунт уже связан с live auth API: можно создавать и редактировать треки, ставить лайки, работать с artist profile и
                  пользоваться staff-панелью при наличии роли.
                </Typography>

                {auth.isStaff ? (
                  <Alert severity="info" icon={<ShieldRoundedIcon fontSize="inherit" />}>
                    У этой роли есть доступ к post-publication moderation, reports и управлению подборками.
                  </Alert>
                ) : null}

                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <MetricTile label="Лайки" value={likedTrackIdsCount} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <MetricTile label="Мои треки" value={myTracksCount} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <MetricTile label="Каталог" value={publicTracksCount} />
                  </Grid>
                </Grid>

                <ActionButton variant="outlined" onClick={onLogout} disabled={auth.authBusy}>
                  Выйти
                </ActionButton>
              </Stack>
            </SectionCard>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
