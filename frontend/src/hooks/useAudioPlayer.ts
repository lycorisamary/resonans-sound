import { useEffect, useRef } from 'react';

import { getPlayableQualityCandidates } from '@/entities/track/model/track';
import api from '@/shared/api/client';
import { StreamQuality, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { useCatalogStore, usePlayerStore } from '@/shared/store/appStore';

const PLAY_REPORT_SECONDS = 30;
const PLAY_REPORT_RATIO = 0.5;

export function getPlayReportThreshold(durationSeconds: number): number {
  return Math.min(PLAY_REPORT_SECONDS, durationSeconds * PLAY_REPORT_RATIO);
}

function applyTrackPlayCount(trackId: number, playCount: number) {
  const catalogState = useCatalogStore.getState();
  const updateTracks = (tracks: Track[]) =>
    tracks.map((track) => (track.id === trackId ? { ...track, play_count: playCount } : track));

  catalogState.setPublicTracks(updateTracks(catalogState.publicTracks));
  catalogState.setMyTracks(updateTracks(catalogState.myTracks));
  catalogState.setLikedTracks(updateTracks(catalogState.likedTracks));

  const playerState = usePlayerStore.getState();
  if (playerState.activeTrack?.id === trackId) {
    playerState.setActiveTrack({ ...playerState.activeTrack, play_count: playCount });
  }
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeTrack = usePlayerStore((state) => state.activeTrack);
  const activeTrackId = usePlayerStore((state) => state.activeTrackId);
  const playerQuality = usePlayerStore((state) => state.playerQuality);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playerLoading = usePlayerStore((state) => state.playerLoading);
  const playerError = usePlayerStore((state) => state.playerError);
  const playerCurrentTime = usePlayerStore((state) => state.playerCurrentTime);
  const playerDuration = usePlayerStore((state) => state.playerDuration);
  const setActiveTrack = usePlayerStore((state) => state.setActiveTrack);
  const setActiveTrackId = usePlayerStore((state) => state.setActiveTrackId);
  const setPlayerQuality = usePlayerStore((state) => state.setPlayerQuality);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const setPlayerLoading = usePlayerStore((state) => state.setPlayerLoading);
  const setPlayerError = usePlayerStore((state) => state.setPlayerError);
  const setPlayerCurrentTime = usePlayerStore((state) => state.setPlayerCurrentTime);
  const setPlayerDuration = usePlayerStore((state) => state.setPlayerDuration);

  const myTracks = useCatalogStore((state) => state.myTracks);
  const publicTracks = useCatalogStore((state) => state.publicTracks);
  const likedTracks = useCatalogStore((state) => state.likedTracks);

  useEffect(() => {
    if (!activeTrackId) {
      return;
    }

    const latestTrack =
      myTracks.find((track) => track.id === activeTrackId) ??
      publicTracks.find((track) => track.id === activeTrackId) ??
      likedTracks.find((track) => track.id === activeTrackId);

    if (latestTrack) {
      setActiveTrack(latestTrack);
    }
  }, [activeTrackId, myTracks, publicTracks, likedTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onLoadStart = () => {
      setPlayerLoading(true);
      setPlayerError(null);
    };
    const onLoadedMetadata = () => {
      setPlayerDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setPlayerLoading(false);
    };
    const maybeReportTrackPlay = async () => {
      const trackId = Number(audio.dataset.trackId ?? '0');
      if (
        trackId <= 0 ||
        audio.dataset.playReportEligible !== 'true' ||
        audio.dataset.playReported === 'true' ||
        audio.dataset.playReportPending === 'true'
      ) {
        return;
      }

      const mediaDuration = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : Number(audio.dataset.trackDurationSeconds ?? '0');
      if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) {
        return;
      }

      if ((audio.currentTime || 0) < getPlayReportThreshold(mediaDuration)) {
        return;
      }

      audio.dataset.playReportPending = 'true';
      try {
        const response = await api.reportTrackPlay(trackId);
        if (response.counted) {
          applyTrackPlayCount(trackId, response.play_count);
        }
      } catch {
        // Playback should never fail because analytics/reporting failed.
      } finally {
        audio.dataset.playReported = 'true';
        delete audio.dataset.playReportPending;
      }
    };

    const onTimeUpdate = () => {
      setPlayerCurrentTime(audio.currentTime || 0);
      void maybeReportTrackPlay();
    };
    const onPlay = () => {
      setIsPlaying(true);
      setPlayerLoading(false);
      setPlayerError(null);
    };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPlayerCurrentTime(0);
    };
    const onWaiting = () => setPlayerLoading(true);
    const onCanPlay = () => setPlayerLoading(false);
    const onError = () => {
      const trackId = Number(audio.dataset.trackId ?? '0');
      const publicQualityCandidates = audio.dataset.publicQualityCandidates?.split(',') as StreamQuality[] | undefined;
      const qualityIndex = Number(audio.dataset.publicQualityIndex ?? '0');
      const nextQuality = publicQualityCandidates?.[qualityIndex + 1];

      if (trackId > 0 && nextQuality) {
        audio.dataset.publicQualityIndex = String(qualityIndex + 1);
        audio.dataset.streamQuality = nextQuality;
        audio.src = api.getDirectTrackStreamUrl(trackId, nextQuality);
        audio.load();
        void audio.play().catch(() => {
          setIsPlaying(false);
          setPlayerLoading(false);
          setPlayerError('Не удалось загрузить поток. Проверьте, что трек уже обработан и для него есть готовый audio-asset.');
        });
        return;
      }

      setIsPlaying(false);
      setPlayerLoading(false);
      setPlayerError('Не удалось загрузить поток. Проверьте, что трек уже обработан и для него есть готовый audio-asset.');
    };

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const stopAndResetAudio = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.removeAttribute('src');
    delete audio.dataset.streamUrl;
    delete audio.dataset.trackId;
    delete audio.dataset.streamQuality;
    delete audio.dataset.publicQualityCandidates;
    delete audio.dataset.publicQualityIndex;
    delete audio.dataset.trackDurationSeconds;
    delete audio.dataset.playReportEligible;
    delete audio.dataset.playReported;
    delete audio.dataset.playReportPending;
    audio.load();
    setPlayerCurrentTime(0);
    setPlayerDuration(0);
    setIsPlaying(false);
    setPlayerLoading(false);
  };

  const playTrack = async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      setPlayerError(null);
      const qualityCandidates = getPlayableQualityCandidates(track, playerQuality);
      if (qualityCandidates.length === 0) {
        throw new Error('Для этого трека пока нет готового аудио-ассета для воспроизведения.');
      }

      setActiveTrackId(track.id);
      setActiveTrack(track);
      setPlayerLoading(true);

      const loadedTrackId = Number(audio.dataset.trackId ?? '0');
      const loadedQuality = audio.dataset.streamQuality as StreamQuality | undefined;
      const shouldPauseCurrentTrack = loadedTrackId === track.id && activeTrackId === track.id && isPlaying && Boolean(audio.src);
      const shouldReuseCurrentSource =
        loadedTrackId === track.id &&
        loadedQuality !== undefined &&
        qualityCandidates.includes(loadedQuality) &&
        Boolean(audio.src);

      if (shouldPauseCurrentTrack) {
        audio.pause();
        setPlayerLoading(false);
        return;
      }

      if (!shouldReuseCurrentSource) {
        let streamUrl: string | null = null;
        let resolvedQuality = qualityCandidates[0];

        if (track.status === 'approved') {
          streamUrl = api.getDirectTrackStreamUrl(track.id, resolvedQuality);
          audio.dataset.publicQualityCandidates = qualityCandidates.join(',');
          audio.dataset.publicQualityIndex = '0';
        } else {
          let lastStreamError: unknown = null;

          for (const quality of qualityCandidates) {
            try {
              const streamResponse = await api.getTrackStreamUrl(track.id, quality);
              streamUrl = streamResponse.url;
              resolvedQuality = quality;
              break;
            } catch (err) {
              lastStreamError = err;
            }
          }

          delete audio.dataset.publicQualityCandidates;
          delete audio.dataset.publicQualityIndex;

          if (!streamUrl) {
            throw lastStreamError ?? new Error('Для этого трека пока нет доступного stream quality.');
          }
        }

        audio.pause();
        audio.src = streamUrl;
        audio.dataset.streamUrl = streamUrl;
        audio.dataset.trackId = String(track.id);
        audio.dataset.streamQuality = resolvedQuality;
        audio.dataset.trackDurationSeconds = String(track.duration_seconds ?? 0);
        audio.dataset.playReportEligible = track.status === 'approved' ? 'true' : 'false';
        audio.dataset.playReported = 'false';
        delete audio.dataset.playReportPending;
        audio.load();
        setPlayerCurrentTime(0);
        setPlayerDuration(track.duration_seconds ?? 0);
      }

      try {
        await audio.play();
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          throw err;
        }
      }
    } catch (err) {
      setPlayerLoading(false);
      setPlayerError(getErrorMessage(err, 'Не удалось запустить воспроизведение'));
    }
  };

  return {
    activeTrack,
    activeTrackId,
    audioRef,
    isPlaying,
    playTrack,
    playerCurrentTime,
    playerDuration,
    playerError,
    playerLoading,
    playerQuality,
    setPlayerQuality,
    stopAndResetAudio,
  };
}

export type UseAudioPlayerResult = ReturnType<typeof useAudioPlayer>;
