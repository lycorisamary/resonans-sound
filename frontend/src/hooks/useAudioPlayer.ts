import { useEffect, useRef } from 'react';

import { resolvePlayableQuality } from '@/entities/track/model/track';
import api from '@/shared/api/client';
import { StreamQuality, Track } from '@/shared/api/types';
import { getErrorMessage } from '@/shared/lib/error';
import { useCatalogStore, usePlayerStore } from '@/shared/store/appStore';

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
    const onTimeUpdate = () => setPlayerCurrentTime(audio.currentTime || 0);
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
      const quality = resolvePlayableQuality(track, playerQuality);
      if (!quality) {
        throw new Error('Для этого трека пока нет готового аудио-ассета для воспроизведения.');
      }

      const loadedTrackId = Number(audio.dataset.trackId ?? '0');
      const loadedQuality = audio.dataset.streamQuality as StreamQuality | undefined;
      const shouldReuseCurrentSource = loadedTrackId === track.id && loadedQuality === quality && Boolean(audio.src);

      if (activeTrackId === track.id && isPlaying && shouldReuseCurrentSource) {
        audio.pause();
        return;
      }

      if (!shouldReuseCurrentSource) {
        setPlayerLoading(true);
        const streamResponse = await api.getTrackStreamUrl(track.id, quality);
        audio.pause();
        audio.src = streamResponse.url;
        audio.dataset.streamUrl = streamResponse.url;
        audio.dataset.trackId = String(track.id);
        audio.dataset.streamQuality = quality;
        audio.load();
        setPlayerCurrentTime(0);
        setPlayerDuration(track.duration_seconds ?? 0);
      }

      setActiveTrackId(track.id);
      setActiveTrack(track);

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
