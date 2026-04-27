import { FormEvent, useEffect, useState } from 'react';

import { Alert, Avatar, Box, Chip, CircularProgress, Grid, MenuItem, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import api from '@/shared/api/client';
import { ArtistDiscoverySort, ArtistProfile } from '@/shared/api/types';
import { SUPPORTED_TRACK_GENRES } from '@/shared/constants/genres';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, PageHeader, SectionCard } from '@/shared/ui';
import { RefreshRoundedIcon, SearchRoundedIcon } from '@/shared/ui/icons';

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
      setError(getErrorMessage(err, 'Could not load artists.'));
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

  return (
    <SectionCard tone="green">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Артисты"
          title="Публичные профили артистов"
          description="Ищите новых авторов по имени, жанру и городу. Здесь видны только профили с опубликованной музыкой."
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
          {sort !== 'recommended' ? <Chip label="Сортировка изменена" color="secondary" variant="outlined" /> : null}
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем артистов...</Typography>
          </Stack>
        ) : null}
        {!loading && artists.length === 0 ? <Alert severity="info">Артисты не найдены.</Alert> : null}

        <Grid container spacing={2}>
          {artists.map((artist) => (
            <Grid item xs={12} md={6} xl={4} key={artist.id}>
              <SectionCard tone="neutral" sx={{ height: '100%', p: 2.25 }}>
                <Stack spacing={1.5}>
                  <Box
                    component={RouterLink}
                    to={`/artists/${artist.slug}`}
                    sx={{
                      aspectRatio: '1.8 / 1',
                      backgroundImage: artist.banner_image_url
                        ? `linear-gradient(180deg, rgba(11,11,16,0.18), rgba(11,11,16,0.58)), url(${artist.banner_image_url})`
                        : 'linear-gradient(135deg, #d7f5ef, #fff7ed)',
                      backgroundPosition: 'center',
                      backgroundSize: 'cover',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={artist.avatar_url ?? undefined} sx={{ bgcolor: 'primary.main', width: 52, height: 52 }}>
                      {(artist.display_name || artist.slug).slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography
                        component={RouterLink}
                        to={`/artists/${artist.slug}`}
                        variant="h5"
                        sx={{ color: 'inherit', textDecoration: 'none' }}
                        noWrap
                      >
                        {artist.display_name || artist.slug}
                      </Typography>
                      <Typography color="text.secondary" noWrap>
                        /artists/{artist.slug}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography color="text.secondary" sx={{ minHeight: 72 }}>
                    {artist.bio || 'Публичный профиль артиста с релизами, статистикой и витринным позиционированием.'}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`${artist.track_count} треков`} size="small" />
                    <Chip label={`${artist.play_count} прослушиваний`} size="small" variant="outlined" />
                    <Chip label={`${artist.like_count} лайков`} size="small" variant="outlined" />
                    {artist.location ? <Chip label={artist.location} size="small" variant="outlined" /> : null}
                    {artist.profile_genres.slice(0, 2).map((item) => (
                      <Chip key={item} label={item} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Stack>
              </SectionCard>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SectionCard>
  );
}
