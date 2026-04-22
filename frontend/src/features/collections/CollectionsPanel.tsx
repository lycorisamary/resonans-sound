import { Alert, Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';

import { CollectionCard } from '@/features/collections/CollectionCard';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { useCollections } from '@/hooks/useCollections';
import api from '@/shared/api/client';
import { Collection } from '@/shared/api/types';
import { ActionButton, SectionCard } from '@/shared/ui';
import { RefreshRoundedIcon } from '@/shared/ui/icons';

interface CollectionsPanelProps {
  player: UseAudioPlayerResult;
}

export function CollectionsPanel({ player }: CollectionsPanelProps) {
  const collections = useCollections();

  const playCollection = async (collection: Collection) => {
    const fullCollection = await api.getCollection(collection.id);
    await player.playTrackQueue(fullCollection.tracks);
  };

  return (
    <SectionCard tone="orange">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4">Staff picks</Typography>
            <Typography color="text.secondary">
              Public collections are curated by staff after tracks are published. Hidden or deleted tracks are filtered out.
            </Typography>
          </Box>
          <ActionButton variant="outlined" onClick={() => void collections.reload()} startIcon={<RefreshRoundedIcon />}>
            Refresh
          </ActionButton>
        </Stack>

        {collections.error ? <Alert severity="error">{collections.error}</Alert> : null}
        {collections.loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Loading collections...</Typography>
          </Stack>
        ) : null}
        {!collections.loading && collections.collections.length === 0 ? (
          <Alert severity="info">No public collections yet.</Alert>
        ) : null}

        <Grid container spacing={2}>
          {collections.collections.map((collection) => (
            <Grid item xs={12} md={6} xl={4} key={collection.id}>
              <CollectionCard collection={collection} onPlayCollection={(collectionItem) => void playCollection(collectionItem)} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SectionCard>
  );
}
