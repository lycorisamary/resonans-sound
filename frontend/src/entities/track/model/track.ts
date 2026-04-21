import { OwnerTrackStateTone, StreamQuality, Track } from '@/shared/api/types';

export function getTrackStatusColor(status: Track['status']): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved') {
    return 'success';
  }

  if (status === 'pending' || status === 'processing') {
    return 'warning';
  }

  if (status === 'rejected' || status === 'deleted') {
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
  return track.status === 'approved' || Boolean(track.original_url || track.mp3_128_url || track.mp3_320_url);
}

export function resolvePlayableQuality(track: Track, preferredQuality: StreamQuality): StreamQuality | null {
  if (preferredQuality === 'original' && track.original_url) {
    return 'original';
  }
  if (preferredQuality === '320' && track.mp3_320_url) {
    return '320';
  }
  if (preferredQuality === '128' && track.mp3_128_url) {
    return '128';
  }
  if (track.mp3_320_url) {
    return '320';
  }
  if (track.mp3_128_url) {
    return '128';
  }
  if (track.original_url) {
    return 'original';
  }
  if (track.status === 'approved') {
    return preferredQuality;
  }
  return null;
}

export const emptyTrack: Track = {
  id: 0,
  title: 'R',
  user_id: 0,
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
