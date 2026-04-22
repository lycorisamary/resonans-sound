import { FormEvent } from 'react';

import { canUploadTrackMedia, hasPlayableMedia } from '@/entities/track/model/track';
import { refreshWholeUiIntoStore } from '@/features/catalog/model/catalogData';
import api from '@/shared/api/client';
import { Track, TrackMetadataPayload, TrackReportReason } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import {
  initialTrackForm,
  useAppStatusStore,
  useAuthStore,
  useCatalogStore,
  usePlayerStore,
  useStudioStore,
} from '@/shared/store/appStore';

interface UseTrackActionsOptions {
  stopAndResetAudio: () => void;
}

interface StudioUploadSelection {
  audioFile?: File | null;
  coverFile?: File | null;
}

const reportReasons: { value: TrackReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'not_music', label: 'Not music' },
  { value: 'other', label: 'Other' },
];

function buildTrackPayload(trackForm: typeof initialTrackForm): TrackMetadataPayload {
  return {
    title: trackForm.title,
    description: trackForm.description || null,
    genre: trackForm.genre || null,
    category_id: trackForm.category_id ? Number(trackForm.category_id) : null,
    is_downloadable: trackForm.is_downloadable,
    license_type: trackForm.license_type,
    tags: trackForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export function useTrackActions({ stopAndResetAudio }: UseTrackActionsOptions) {
  const user = useAuthStore((state) => state.user);
  const setPageError = useAppStatusStore((state) => state.setPageError);
  const setBanner = useAppStatusStore((state) => state.setBanner);
  const likedTrackIds = useCatalogStore((state) => state.likedTrackIds);
  const publicTracks = useCatalogStore((state) => state.publicTracks);
  const myTracks = useCatalogStore((state) => state.myTracks);
  const likedTracks = useCatalogStore((state) => state.likedTracks);
  const setLikedTrackIds = useCatalogStore((state) => state.setLikedTrackIds);
  const setPublicTracks = useCatalogStore((state) => state.setPublicTracks);
  const setMyTracks = useCatalogStore((state) => state.setMyTracks);
  const setLikedTracks = useCatalogStore((state) => state.setLikedTracks);

  const activeTrackId = usePlayerStore((state) => state.activeTrackId);
  const setActiveTrack = usePlayerStore((state) => state.setActiveTrack);
  const setActiveTrackId = usePlayerStore((state) => state.setActiveTrackId);

  const studioBusy = useStudioStore((state) => state.studioBusy);
  const editingTrackId = useStudioStore((state) => state.editingTrackId);
  const uploadingTrackId = useStudioStore((state) => state.uploadingTrackId);
  const uploadingCoverTrackId = useStudioStore((state) => state.uploadingCoverTrackId);
  const trackForm = useStudioStore((state) => state.trackForm);
  const setStudioBusy = useStudioStore((state) => state.setStudioBusy);
  const setEditingTrackId = useStudioStore((state) => state.setEditingTrackId);
  const setUploadingTrackId = useStudioStore((state) => state.setUploadingTrackId);
  const setUploadingCoverTrackId = useStudioStore((state) => state.setUploadingCoverTrackId);
  const setTrackForm = useStudioStore((state) => state.setTrackForm);
  const updateTrackForm = useStudioStore((state) => state.updateTrackForm);
  const resetTrackForm = useStudioStore((state) => state.resetTrackForm);
  const isStaff = user?.role === 'moderator' || user?.role === 'admin';

  const submitTrackWithUploads = async (event: FormEvent<HTMLFormElement>, files: StudioUploadSelection = {}) => {
    event.preventDefault();
    if (!user) {
      setPageError('Чтобы создать трек, сначала откройте сессию.');
      return false;
    }

    setStudioBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      const payload = buildTrackPayload(trackForm);
      let savedTrack: Track;
      const completedSteps: string[] = [];

      if (editingTrackId) {
        savedTrack = await api.updateTrack(editingTrackId, payload);
        completedSteps.push('metadata обновлено');
      } else {
        savedTrack = await api.createTrackMetadata(payload);
        completedSteps.push('metadata создано');
      }

      if (files.coverFile) {
        setUploadingCoverTrackId(savedTrack.id);
        savedTrack = await api.uploadTrackCover(savedTrack.id, files.coverFile);
        completedSteps.push('cover загружен');
        setUploadingCoverTrackId(null);
      }

      if (files.audioFile) {
        setUploadingTrackId(savedTrack.id);
        savedTrack = await api.uploadTrack(savedTrack.id, files.audioFile);
        completedSteps.push('audio принято в processing');
        setUploadingTrackId(null);
      }

      resetTrackForm();
      setBanner(
        files.audioFile
          ? `${completedSteps.join(', ')}. После processing трек опубликуется автоматически.`
          : `${completedSteps.join(', ')}. Audio можно загрузить здесь же в блоке "Мои треки".`
      );
      await refreshWholeUiIntoStore();
      return true;
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось сохранить или загрузить трек'));
      return false;
    } finally {
      setUploadingTrackId(null);
      setUploadingCoverTrackId(null);
      setStudioBusy(false);
    }
  };

  const submitTrack = (event: FormEvent<HTMLFormElement>) => submitTrackWithUploads(event);

  const startEditingTrack = (track: Track) => {
    setEditingTrackId(track.id);
    setTrackForm({
      title: track.title,
      description: track.description ?? '',
      genre: track.genre ?? '',
      category_id: track.category_id ? String(track.category_id) : '',
      is_downloadable: track.is_downloadable,
      license_type: track.license_type,
      tags: track.tags?.join(', ') ?? '',
    });
  };

  const deleteTrack = async (track: Track) => {
    const isDeletingOtherUsersTrack = user ? user.id !== track.user_id : false;
    const confirmMessage = isDeletingOtherUsersTrack ? `Удалить чужой трек "${track.title}"?` : `Удалить трек "${track.title}"?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setStudioBusy(true);
    setPageError(null);
    setBanner(null);

    try {
      await api.deleteTrack(track.id);
      if (editingTrackId === track.id) {
        resetTrackForm();
      }
      if (activeTrackId === track.id) {
        stopAndResetAudio();
        setActiveTrack(null);
        setActiveTrackId(null);
      }

      setBanner(
        isDeletingOtherUsersTrack
          ? `Трек "${track.title}" удалён по staff-праву.`
          : `Трек "${track.title}" переведён в deleted и снят с витрины.`
      );
      await refreshWholeUiIntoStore();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось удалить трек'));
    } finally {
      setStudioBusy(false);
    }
  };

  const uploadTrack = async (track: Track, file: File | null) => {
    if (!file) {
      return;
    }

    setStudioBusy(true);
    setUploadingTrackId(track.id);
    setPageError(null);
    setBanner(null);

    try {
      await api.uploadTrack(track.id, file);
      setBanner(`Source для "${track.title}" принят. Сейчас начнётся processing, после которого трек опубликуется автоматически.`);
      await refreshWholeUiIntoStore();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось загрузить аудиофайл'));
    } finally {
      setUploadingTrackId(null);
      setStudioBusy(false);
    }
  };

  const uploadCover = async (track: Track, file: File | null) => {
    if (!file) {
      return;
    }

    setStudioBusy(true);
    setUploadingCoverTrackId(track.id);
    setPageError(null);
    setBanner(null);

    try {
      await api.uploadTrackCover(track.id, file);
      setBanner(`Обложка для "${track.title}" загружена.`);
      await refreshWholeUiIntoStore();
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось загрузить обложку'));
    } finally {
      setUploadingCoverTrackId(null);
      setStudioBusy(false);
    }
  };

  const isTrackLiked = (trackId: number) => likedTrackIds.includes(trackId);
  const canDeleteTrack = (track: Track) => Boolean(user && (user.id === track.user_id || isStaff));

  const toggleLike = async (track: Track) => {
    if (!user) {
      setPageError('Чтобы ставить лайки, сначала откройте сессию.');
      return;
    }

    try {
      const liked = isTrackLiked(track.id);
      const response = liked ? await api.unlikeTrack(track.id) : await api.likeTrack(track.id);

      setLikedTrackIds(
        response.liked ? Array.from(new Set([...likedTrackIds, track.id])) : likedTrackIds.filter((value) => value !== track.id)
      );

      const applyLikeCount = (items: Track[]) =>
        items.map((item) => (item.id === track.id ? { ...item, like_count: response.like_count } : item));

      setPublicTracks(applyLikeCount(publicTracks));
      setMyTracks(applyLikeCount(myTracks));
      setLikedTracks(
        response.liked
          ? [{ ...track, like_count: response.like_count }, ...applyLikeCount(likedTracks).filter((item) => item.id !== track.id)]
          : applyLikeCount(likedTracks).filter((item) => item.id !== track.id)
      );
      const currentActiveTrack = usePlayerStore.getState().activeTrack;
      setActiveTrack(
        currentActiveTrack?.id === track.id ? { ...currentActiveTrack, like_count: response.like_count } : currentActiveTrack
      );
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось обновить лайк'));
    }
  };

  const reportTrack = async (track: Track) => {
    if (!user) {
      setPageError('Чтобы отправить жалобу, сначала откройте сессию.');
      return;
    }

    const selected = window.prompt(
      `Report "${track.title}"\n${reportReasons.map((reason, index) => `${index + 1}. ${reason.label}`).join('\n')}`,
      '1'
    );
    if (selected === null) {
      return;
    }

    const reason = reportReasons[Number(selected.trim()) - 1];
    if (!reason) {
      setPageError('Выберите причину жалобы номером из списка.');
      return;
    }

    const description = window.prompt('Additional note for staff', '')?.trim() || null;

    try {
      await api.reportTrack({ track_id: track.id, reason: reason.value, description });
      setBanner(`Жалоба на "${track.title}" отправлена staff-команде.`);
    } catch (err) {
      setPageError(getErrorMessage(err, 'Не удалось отправить жалобу'));
    }
  };

  return {
    canDeleteTrack,
    canUploadTrackMedia,
    deleteTrack,
    editingTrackId,
    hasPlayableMedia,
    isTrackLiked,
    resetTrackForm,
    startEditingTrack,
    studioBusy,
    submitTrack,
    submitTrackWithUploads,
    reportTrack,
    toggleLike,
    trackForm,
    updateTrackForm,
    uploadCover,
    uploadingCoverTrackId,
    uploadingTrackId,
    uploadTrack,
  };
}

export type UseTrackActionsResult = ReturnType<typeof useTrackActions>;
