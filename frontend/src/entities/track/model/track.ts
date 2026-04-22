import { OwnerTrackStateTone, StreamQuality, Track } from '@/shared/api/types';

export function getTrackStatusColor(status: Track['status']): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved') {
    return 'success';
  }

  if (status === 'pending' || status === 'processing') {
    return 'warning';
  }

  if (status === 'rejected' || status === 'hidden' || status === 'deleted') {
    return 'error';
  }

  return 'default';
}

export function getOwnerTrackState(track: Track): {
  tone: OwnerTrackStateTone;
  title: string;
  description: string;
} {
  const hasMedia = hasPlayableMedia(track);

  if (track.status === 'deleted') {
    return {
      tone: 'error',
      title: 'Трек снят с публикации',
      description: 'Этот трек переведён в deleted и больше не отображается в живом каталоге.',
    };
  }

  if (track.status === 'hidden') {
    return {
      tone: 'error',
      title: 'Трек скрыт staff-командой',
      description: 'Запись не видна в публичном каталоге. Заменить audio или cover можно только после восстановления staff-ролью.',
    };
  }

  if (track.status === 'processing') {
    return {
      tone: 'warning',
      title: 'Идёт media processing',
      description: 'Сервис принял исходник и сейчас готовит MP3-версии и waveform для плеера.',
    };
  }

  if (track.status === 'rejected') {
    return {
      tone: 'error',
      title: 'Обработка завершилась с ошибкой',
      description: 'Исправьте файл или загрузите новый source, чтобы снова запустить processing.',
    };
  }

  if (track.status === 'approved') {
    return {
      tone: 'success',
      title: 'Трек опубликован автоматически',
      description: 'После успешной обработки запись сразу стала доступна в каталоге и в общем плеере.',
    };
  }

  if (track.status === 'pending' && !hasMedia) {
    return {
      tone: 'info',
      title: 'Ждёт исходный файл',
      description: 'Metadata уже сохранено. Следующий шаг: загрузить MP3 или WAV, чтобы трек дошёл до публикации.',
    };
  }

  return {
    tone: 'warning',
    title: 'Переходное состояние',
    description: 'Трек выглядит как legacy pending-запись. Загрузите новый source, чтобы привести его к актуальному flow.',
  };
}

export function canUploadTrackMedia(track: Track): boolean {
  return track.status === 'pending' || track.status === 'rejected' || track.status === 'approved';
}

export function hasPlayableMedia(track: Track): boolean {
  if (track.status === 'hidden' || track.status === 'deleted') {
    return false;
  }
  return track.status === 'approved' || Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
}

export function getPlayableQualityCandidates(track: Track, preferredQuality: StreamQuality): StreamQuality[] {
  const qualities: StreamQuality[] = [];
  const addQuality = (quality: StreamQuality) => {
    if (!qualities.includes(quality)) {
      qualities.push(quality);
    }
  };

  const hasPublicStreamFallback = track.status === 'approved';
  const hasQuality = (quality: StreamQuality) => {
    if (hasPublicStreamFallback) {
      return true;
    }
    if (quality === '320') {
      return Boolean(track.mp3_320_url);
    }
    if (quality === '128') {
      return Boolean(track.mp3_128_url);
    }
    return Boolean(track.original_url);
  };

  if (hasQuality(preferredQuality)) {
    addQuality(preferredQuality);
  }

  const fallbackQualities: StreamQuality[] = ['320', '128', 'original'];
  for (const quality of fallbackQualities) {
    if (hasQuality(quality)) {
      addQuality(quality);
    }
  }

  return qualities;
}

export const emptyTrack: Track = {
  id: 0,
  title: 'R',
  user_id: 0,
  artist_id: 0,
  is_public: true,
  is_downloadable: false,
  license_type: 'all-rights-reserved',
  status: 'approved',
  created_at: '',
  updated_at: '',
  play_count: 0,
  like_count: 0,
  comment_count: 0,
};
