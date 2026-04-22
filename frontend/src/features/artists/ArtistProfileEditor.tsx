import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Alert, Avatar, Box, Stack, TextField, Typography } from '@mui/material';

import api from '@/shared/api/client';
import { ArtistProfile } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { ActionButton, SectionCard } from '@/shared/ui';
import { PhotoCameraRoundedIcon } from '@/shared/ui/icons';
import { buildProfilePayload, profileToForm, ArtistProfileFormState } from './profileForm';

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
        const loadedProfile = await api.getArtist(username);
        setProfile(loadedProfile);
        setForm(profileToForm(loadedProfile));
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
      const updatedProfile = await api.updateMyArtistProfile(buildProfilePayload(form));
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
        <Box>
          <Typography variant="h4">Artist profile</Typography>
          <Typography color="text.secondary">This public profile is used by artist pages and track cards.</Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {banner ? <Alert severity="success">{banner}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 88, height: 88, bgcolor: '#0f766e', fontSize: 32 }}>
            {(profile?.display_name ?? username).slice(0, 1).toUpperCase()}
          </Avatar>
          <Box
            sx={{
              minHeight: 112,
              flex: 1,
              borderRadius: 4,
              border: '1px solid rgba(15,23,42,0.1)',
              backgroundImage: profile?.banner_image_url ? `url(${profile.banner_image_url})` : 'linear-gradient(135deg, #d7f5ef, #fff7ed)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
        </Stack>

        <Stack component="form" spacing={2} onSubmit={(event) => void submitProfile(event)}>
          <TextField label="Display name" value={form.displayName} onChange={updateField('displayName')} inputProps={{ maxLength: 120 }} />
          <TextField label="Location" value={form.location} onChange={updateField('location')} inputProps={{ maxLength: 120 }} />
          <TextField label="Genres" value={form.profileGenres} onChange={updateField('profileGenres')} placeholder="Ambient, Hip-hop, Pop" />
          <TextField label="Bio" value={form.bio} onChange={updateField('bio')} multiline minRows={4} inputProps={{ maxLength: 2000 }} />
          <TextField
            label="Social links"
            value={form.socialLinks}
            onChange={updateField('socialLinks')}
            multiline
            minRows={3}
            placeholder="instagram=https://..."
          />
          <TextField
            label="Streaming links"
            value={form.streamingLinks}
            onChange={updateField('streamingLinks')}
            multiline
            minRows={3}
            placeholder="soundcloud=https://..."
          />
          <ActionButton type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving...' : 'Save artist profile'}
          </ActionButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
