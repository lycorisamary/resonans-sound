import { FormEvent, useEffect, useState } from 'react';

import { Alert, Chip, CircularProgress, Grid, MenuItem, Stack, Typography } from '@mui/material';

import api from '@/shared/api/client';
import { ArtistDiscoverySort, ArtistProfile } from '@/shared/api/types';
import { SUPPORTED_TRACK_GENRES } from '@/shared/constants/genres';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, PageHeader, SectionCard } from '@/shared/ui';
import { RefreshRoundedIcon, SearchRoundedIcon } from '@/shared/ui/icons';
import { ArtistSpotlightCard } from './ArtistSpotlightCard';

export function ArtistsPanel() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState<ArtistDiscoverySort>('recommended');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sortLabels: Record<ArtistDiscoverySort, string> = {
    recommended: 'рекомендованные',
    popular: 'популярные',
    newest: 'новые',
    name: 'по имени',
  };

  const loadArtists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getArtists({
        search: search || undefined,
        genre: genre || undefined,
        location: location || undefined,
        sort,
        size: 24,
      });
      setArtists(response.items);
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось загрузить витрину артистов.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArtists();
  }, [search, genre, location, sort]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setLocation(locationInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setGenre('');
    setLocationInput('');
    setLocation('');
    setSort('recommended');
  };

  const hasActiveFilters = Boolean(search || genre || location || sort !== 'recommended');

  return (
    <SectionCard tone="green">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Артисты"
          title="Артисты, за которыми стоит следить"
          description="Публичная витрина независимых артистов: здесь проще находить не только отдельные треки, но и авторов с уже сложившимся звучанием."
          actions={
            <ActionButton variant="outlined" onClick={() => void loadArtists()} startIcon={<RefreshRoundedIcon />}>
              Обновить
            </ActionButton>
          }
        />

        <Stack component="form" direction={{ xs: 'column', xl: 'row' }} spacing={1.25} onSubmit={submitSearch}>
          <AppTextField fullWidth label="Поиск артистов" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <AppTextField select label="Жанр" value={genre} onChange={(event) => setGenre(event.target.value)} sx={{ minWidth: 210 }}>
            <MenuItem value="">Все жанры</MenuItem>
            {SUPPORTED_TRACK_GENRES.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </AppTextField>
          <AppTextField label="Город" value={locationInput} onChange={(event) => setLocationInput(event.target.value)} sx={{ minWidth: 180 }} />
          <AppTextField
            select
            label="Сортировка"
            value={sort}
            onChange={(event) => setSort(event.target.value as ArtistDiscoverySort)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="recommended">Рекомендованные</MenuItem>
            <MenuItem value="popular">Популярные</MenuItem>
            <MenuItem value="newest">Новые</MenuItem>
            <MenuItem value="name">По имени</MenuItem>
          </AppTextField>
          <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
            Найти
          </ActionButton>
          <ActionButton variant="outlined" onClick={clearFilters}>
            Сбросить
          </ActionButton>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {search ? <Chip label={`Поиск: ${search}`} color="secondary" variant="outlined" /> : null}
          {genre ? <Chip label={`Жанр: ${genre}`} color="secondary" variant="outlined" /> : null}
          {location ? <Chip label={`Город: ${location}`} color="secondary" variant="outlined" /> : null}
          {sort !== 'recommended' ? <Chip label={`Сортировка: ${sortLabels[sort]}`} color="secondary" variant="outlined" /> : null}
          {hasActiveFilters ? (
            <ActionButton variant="text" color="secondary" onClick={clearFilters} sx={{ px: 0.5 }}>
              Сбросить всё
            </ActionButton>
          ) : null}
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем артистов...</Typography>
          </Stack>
        ) : null}
        {!loading && artists.length === 0 ? (
          <Alert severity="info">
            По текущему сочетанию фильтров артисты не найдены. Попробуйте убрать часть ограничений и вернуться к более широкому поиску.
          </Alert>
        ) : null}

        <Grid container spacing={2}>
          {artists.map((artist) => (
            <Grid item xs={12} md={6} xl={4} key={artist.id}>
              <ArtistSpotlightCard artist={artist} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SectionCard>
  );
}
