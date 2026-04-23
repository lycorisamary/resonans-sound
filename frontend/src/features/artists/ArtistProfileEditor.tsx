import { ChangeEvent, FormEvent, useEffect, useState } from 'react';

import { Alert, Avatar, Box, Grid, Stack, Typography } from '@mui/material';

import api from '@/shared/api/client';
import { ArtistProfile } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, AppTextField, PageHeader, SectionCard } from '@/shared/ui';
import { PhotoCameraRoundedIcon } from '@/shared/ui/icons';
import { ArtistProfileFormState, buildCreateProfilePayload, buildProfilePayload, profileToForm } from './profileForm';

interface ArtistProfileEditorProps {
  username: string | null;
}

export function ArtistProfileEditor({ username }: ArtistProfileEditorProps) {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [form, setForm] = useState<ArtistProfileFormState>(() => profileToForm(null));
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<'avatar' | 'banner' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      return;
    }

    const loadProfile = async () => {
      try {
        setError(null);
        const loadedProfile = await api.getMyArtistProfile();
        setProfile(loadedProfile);
        setForm(loadedProfile ? profileToForm(loadedProfile) : { ...profileToForm(null), slug: username });
      } catch (err) {
        setError(getErrorMessage(err, 'Could not load artist profile.'));
      }
    };

    void loadProfile();
  }, [username]);

  const updateField = (field: keyof ArtistProfileFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setBusy(true);
      setError(null);
      setBanner(null);
      const updatedProfile = profile
        ? await api.updateMyArtistProfile(buildProfilePayload(form))
        : await api.createMyArtistProfile(buildCreateProfilePayload(form));
      setProfile(updatedProfile);
      setForm(profileToForm(updatedProfile));
      setBanner('Artist profile updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update artist profile.'));
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (kind: 'avatar' | 'banner', file: File | null) => {
    if (!file) {
      return;
    }
    try {
      setUploadBusy(kind);
      setError(null);
      setBanner(null);
      const updatedProfile = kind === 'avatar' ? await api.uploadMyArtistAvatar(file) : await api.uploadMyArtistBanner(file);
      setProfile(updatedProfile);
      setForm(profileToForm(updatedProfile));
      setBanner(`${kind === 'avatar' ? 'Avatar' : 'Banner'} uploaded.`);
    } catch (err) {
      setError(getErrorMessage(err, `Could not upload ${kind}.`));
    } finally {
      setUploadBusy(null);
    }
  };

  if (!username) {
    return null;
  }

  return (
    <SectionCard tone="neutral">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Artist profile"
          title={profile ? 'Управление публичным профилем артиста' : 'Стать артистом'}
          description="User-account и artist-profile разделены. Только после создания профиля пользователь получает публичную страницу артиста и может загружать музыку."
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {banner ? <Alert severity="success">{banner}</Alert> : null}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} lg={3}>
            <Stack spacing={1.5} alignItems={{ xs: 'flex-start', lg: 'center' }}>
              <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 108, height: 108, bgcolor: 'primary.main', fontSize: 34 }}>
                {(profile?.display_name ?? username).slice(0, 1).toUpperCase()}
              </Avatar>
              {profile ? (
                <ActionButton component="label" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={uploadBusy !== null}>
                  {uploadBusy === 'avatar' ? 'Uploading avatar...' : 'Upload avatar'}
                  <input
                    hidden
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      void uploadImage('avatar', event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                </ActionButton>
              ) : null}
            </Stack>
          </Grid>
          <Grid item xs={12} lg={9}>
            <Box
              sx={{
                backgroundImage: profile?.banner_image_url
                  ? `linear-gradient(180deg, rgba(11,11,16,0.18), rgba(11,11,16,0.62)), url(${profile.banner_image_url})`
                  : 'linear-gradient(135deg, rgba(255,95,122,0.18), rgba(255,255,255,0.03))',
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5,
                minHeight: 148,
                p: 2,
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h5">{profile?.display_name ?? username}</Typography>
                  <Typography color="text.secondary">{profile ? `/artists/${profile.slug}` : 'Slug will become the public artist URL.'}</Typography>
                </Box>
                {profile ? (
                  <ActionButton component="label" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={uploadBusy !== null}>
                    {uploadBusy === 'banner' ? 'Uploading banner...' : 'Upload banner'}
                    <input
                      hidden
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        void uploadImage('banner', event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                  </ActionButton>
                ) : null}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Stack component="form" spacing={2} onSubmit={(event) => void submitProfile(event)}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <AppTextField
                label="Artist URL slug"
                value={form.slug}
                onChange={updateField('slug')}
                disabled={Boolean(profile)}
                inputProps={{ maxLength: 50 }}
                helperText={profile ? `/artists/${profile.slug}` : 'Lowercase letters, numbers, underscores, or hyphens.'}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextField
                label="Display name"
                value={form.displayName}
                onChange={updateField('displayName')}
                inputProps={{ maxLength: 120 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextField label="Location" value={form.location} onChange={updateField('location')} inputProps={{ maxLength: 120 }} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextField label="Genres" value={form.profileGenres} onChange={updateField('profileGenres')} placeholder="Ambient, Hip-hop, Pop" fullWidth />
            </Grid>
            <Grid item xs={12}>
              <AppTextField
                label="Bio"
                value={form.bio}
                onChange={updateField('bio')}
                multiline
                minRows={4}
                inputProps={{ maxLength: 2000 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextField
                label="Social links"
                value={form.socialLinks}
                onChange={updateField('socialLinks')}
                multiline
                minRows={4}
                placeholder="instagram=https://..."
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <AppTextField
                label="Streaming links"
                value={form.streamingLinks}
                onChange={updateField('streamingLinks')}
                multiline
                minRows={4}
                placeholder="soundcloud=https://..."
                fullWidth
              />
            </Grid>
          </Grid>

          <ActionButton type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving...' : profile ? 'Save artist profile' : 'Create artist profile'}
          </ActionButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
