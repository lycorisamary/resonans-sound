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

export function getTrackStatusLabel(status: Track['status']): string {
  const labels: Record<Track['status'], string> = {
    pending: 'Ждёт аудио',
    processing: 'Обрабатывается',
    approved: 'Опубликован',
    rejected: 'Нужно исправить',
    hidden: 'Скрыт',
    deleted: 'Удалён',
  };

  return labels[status];
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
      description: 'Этот трек больше не отображается в каталоге и недоступен слушателям.',
    };
  }

  if (track.status === 'hidden') {
    return {
      tone: 'error',
      title: 'Трек скрыт командой проекта',
      description: 'Запись не видна в публичном каталоге. Заменить аудио или обложку можно после восстановления.',
    };
  }

  if (track.status === 'processing') {
    return {
      tone: 'warning',
      title: 'Аудио обрабатывается',
      description: 'Файл принят. Плеер и публикация станут доступны после завершения обработки.',
    };
  }

  if (track.status === 'rejected') {
    return {
      tone: 'error',
      title: 'Обработка завершилась с ошибкой',
      description: 'Исправьте файл или загрузите новое аудио, чтобы снова отправить трек на обработку.',
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
      description: 'Карточка сохранена. Следующий шаг: загрузить MP3 или WAV, чтобы трек дошёл до публикации.',
    };
  }

  return {
    tone: 'warning',
    title: 'Трек ждёт обновления',
    description: 'Загрузите аудио заново, чтобы трек прошёл актуальную обработку и появился в каталоге.',
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
