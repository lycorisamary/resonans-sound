import { FormEvent, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Card, CardActionArea, CardContent, Chip, CircularProgress, Grid, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import api from '@/shared/api/client';
import { ArtistProfile } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, SectionCard } from '@/shared/ui';
import { RefreshRoundedIcon, SearchRoundedIcon } from '@/shared/ui/icons';

export function ArtistsPanel() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArtists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getArtists({ search: search || undefined, size: 24 });
      setArtists(response.items);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load artists.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArtists();
  }, [search]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <SectionCard tone="green">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Artists</Typography>
            <Typography color="text.secondary">Public artist profiles, ordered by approved tracks and real listens.</Typography>
          </Box>
          <ActionButton variant="outlined" onClick={() => void loadArtists()} startIcon={<RefreshRoundedIcon />}>
            Refresh
          </ActionButton>
        </Stack>

        <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={1.5} onSubmit={submitSearch}>
          <TextField
            fullWidth
            label="Search artists"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <ActionButton type="submit" variant="contained" startIcon={<SearchRoundedIcon />}>
            Search
          </ActionButton>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading artists...</Typography>
          </Stack>
        ) : null}
        {!loading && artists.length === 0 ? <Alert severity="info">No public artists found.</Alert> : null}

        <Grid container spacing={2}>
          {artists.map((artist) => (
            <Grid item xs={12} md={6} xl={4} key={artist.id}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 4, overflow: 'hidden' }}>
                <CardActionArea component={RouterLink} to={`/artists/${artist.slug}`} sx={{ height: '100%' }}>
                  <Box
                    sx={{
                      height: 112,
                      backgroundImage: artist.banner_image_url
                        ? `url(${artist.banner_image_url})`
                        : 'linear-gradient(135deg, #d7f5ef, #fff7ed)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={artist.avatar_url ?? undefined} sx={{ bgcolor: '#0f766e' }}>
                          {artist.display_name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box minWidth={0}>
                          <Typography variant="h6" noWrap>
                            {artist.display_name}
                          </Typography>
                          <Typography color="text.secondary" noWrap>
                            /artists/{artist.slug}
                          </Typography>
                        </Box>
                      </Stack>
                      {artist.bio ? (
                        <Typography color="text.secondary" sx={{ minHeight: 48 }}>
                          {artist.bio}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={`Tracks ${artist.track_count}`} size="small" />
                        <Chip label={`Plays ${artist.play_count}`} size="small" variant="outlined" />
                        <Chip label={`Likes ${artist.like_count}`} size="small" variant="outlined" />
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SectionCard>
  );
}
