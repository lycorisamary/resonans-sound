import { Alert, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';

import { CollectionCard } from '@/features/collections/CollectionCard';
import { UseAudioPlayerResult } from '@/hooks/useAudioPlayer';
import { useCollections } from '@/hooks/useCollections';
import api from '@/shared/api/client';
import { Collection } from '@/shared/api/types';
import { ActionButton, PageHeader, SectionCard } from '@/shared/ui';
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
        <PageHeader
          eyebrow="Подборки"
          title="Подборки и ручной отбор"
          description="Редакционные подборки помогают сильным трекам не потеряться в общем каталоге и задают более осмысленный путь входа в discovery."
          actions={
            <ActionButton variant="outlined" onClick={() => void collections.reload()} startIcon={<RefreshRoundedIcon />}>
              Обновить
            </ActionButton>
          }
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${collections.collections.length} публичных подборок`} color="secondary" variant="outlined" />
          <Chip label="Можно открыть подборку или сразу запустить очередь" variant="outlined" />
        </Stack>

        {collections.error ? <Alert severity="error">{collections.error}</Alert> : null}
        {collections.loading ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Загружаем подборки...</Typography>
          </Stack>
        ) : null}
        {!collections.loading && collections.collections.length === 0 ? <Alert severity="info">Публичных подборок пока нет.</Alert> : null}

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
