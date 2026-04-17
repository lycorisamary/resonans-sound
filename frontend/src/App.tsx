import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type HealthResponse = {
  status: string;
  version: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const response = await fetch('/api/v1/health');
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    void loadHealth();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(15,118,110,0.16), transparent 35%), linear-gradient(160deg, #f6f1e7 0%, #efe6d6 100%)',
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 6 },
            borderRadius: 8,
            border: '1px solid rgba(15,118,110,0.14)',
            background: 'rgba(255,250,242,0.92)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Chip
                label="Resonance Sound"
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 700,
                  bgcolor: '#d7f5ef',
                  color: '#115e59',
                }}
              />
              <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4.4rem' }, lineHeight: 0.95 }}>
                Аудиоплатформа
                <br />
                в активной сборке
              </Typography>
              <Typography variant="h5" sx={{ maxWidth: 720, color: 'text.secondary', lineHeight: 1.45 }}>
                Сейчас на сервере поднят backend, защищён HTTPS, закрыты внутренние сервисные порты и
                запущен минимальный frontend-экран для дальнейшего развития продукта.
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 3,
                  borderRadius: 6,
                  backgroundColor: '#fff',
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h5">Состояние API</Typography>
                  {loading ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <CircularProgress size={24} />
                      <Typography>Проверяем backend…</Typography>
                    </Stack>
                  ) : null}
                  {health ? (
                    <Alert severity="success">
                      Backend доступен: <strong>{health.status}</strong>, версия <strong>{health.version}</strong>
                    </Alert>
                  ) : null}
                  {error ? <Alert severity="error">{error}</Alert> : null}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label="HTTPS включён" color="success" variant="outlined" />
                    <Chip label="Nginx настроен" color="success" variant="outlined" />
                    <Chip label="Docker-стек сокращён" color="warning" variant="outlined" />
                  </Stack>
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 3,
                  borderRadius: 6,
                  backgroundColor: '#fff',
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h5">Быстрые ссылки</Typography>
                  <Button component={Link} href="/api/docs" target="_blank" rel="noreferrer" variant="contained">
                    Открыть Swagger
                  </Button>
                  <Button component={Link} href="/api/v1/health" target="_blank" rel="noreferrer" variant="outlined">
                    Открыть Healthcheck
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Следующий шаг: нарастить рабочий frontend и включать дополнительные сервисы только по мере
                    необходимости.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
