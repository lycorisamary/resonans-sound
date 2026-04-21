import api from '@/shared/api/client';
import { useAuthStore, useCatalogStore } from '@/shared/store/appStore';

export async function loadAuthenticatedStateIntoStore(): Promise<void> {
  const [currentUser, myTracksResponse, likedTracksResponse, likedTrackIdsResponse] = await Promise.all([
    api.getCurrentUser(),
    api.getMyTracks({ size: 100 }),
    api.getMyLikedTracks({ size: 100 }),
    api.getMyLikedTrackIds(),
  ]);

  useAuthStore.getState().setUser(currentUser);
  useCatalogStore.getState().setMyTracks(myTracksResponse.items);
  useCatalogStore.getState().setLikedTracks(likedTracksResponse.items);
  useCatalogStore.getState().setLikedTrackIds(likedTrackIdsResponse.track_ids);
}

export function resetAuthenticatedState(): void {
  useAuthStore.getState().setUser(null);
  useCatalogStore.getState().setMyTracks([]);
  useCatalogStore.getState().setLikedTracks([]);
  useCatalogStore.getState().setLikedTrackIds([]);
}
