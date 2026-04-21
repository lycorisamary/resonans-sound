# Текущее состояние проекта и план до MVP

## 1. Где проект находится сейчас

Проект уже находится в состоянии раннего, но реального MVP-среза:

- production поднят и считается рабочей базой
- frontend работает как production static site
- auth работает end-to-end
- upload/media pipeline работает end-to-end
- после успешного processing треки публикуются автоматически
- общий каталог, поиск, сортировка и лайки работают через live API
- обложки треков уже можно загружать отдельно
- у пользователя есть отдельная вкладка с лайкнутыми треками

Актуальный production baseline:

- домен: `https://resonance-sound.ru`
- host Nginx завершает SSL
- `/` проксируется на frontend `127.0.0.1:3000`
- `/api/` проксируется на backend `127.0.0.1:8000`
- production source of truth для конфигурации: `/root/resonans-sound/infra/.env`

## 2. Что уже реализовано

### Инфраструктура и production

- host Nginx и Let's Encrypt работают
- лишние внешние Docker-порты не торчат наружу
- backend, Celery, Postgres, Redis, RabbitMQ и MinIO работают через Docker Compose
- `/metrics` подключён
- frontend не использует dev server в production

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`

### Tracks, media и covers

- create/update/delete metadata для owner tracks
- `GET /api/v1/tracks/mine`
- `POST /api/v1/tracks/upload`
- `POST /api/v1/tracks/{id}/cover`
- загрузка source и cover в MinIO
- Celery processing
- генерация `128/320 mp3`
- генерация waveform data
- после успешного processing трек автоматически получает `approved`

### Playback и доступ

- опубликованные треки доступны в общем каталоге
- `GET /api/v1/tracks/{id}/stream` поддерживает HTTP Range
- `GET /api/v1/tracks/{id}/stream-url` остаётся для owner preview и безопасного browser playback там, где нужен signed URL
- owner может проверять свои ещё неготовые или проблемные треки

### Роли и права

- каждый пользователь видит опубликованные треки в общем каталоге
- обычный пользователь может удалять свои треки
- `admin` и `moderator` могут удалять любые треки
- ручная moderation-публикация сейчас не является обязательным этапом

### Discovery и social

- `GET /api/v1/tracks` поддерживает `search`
- `GET /api/v1/tracks` поддерживает `sort=newest|popular|title`
- category filter работает
- лайки:
  - `GET /api/v1/interactions/likes/mine`
  - `GET /api/v1/interactions/likes/mine/tracks`
  - `POST /api/v1/interactions/like`
  - `DELETE /api/v1/interactions/like`

### Frontend

- `App.tsx` больше не монолит: он отвечает за layout и маршрутизацию
- структура разнесена на `features/`, `entities/`, `shared/` и `hooks/`
- React Router маршруты: `/`, `/login`, `/studio`, `/me`, `/tracks/:id`
- Zustand хранит auth/catalog/player/studio state
- typed API client находится в `shared/api/`
- единый player flow вынесен в `PlayerPanel` и `useAudioPlayer`
- catalog/library вынесены в `CatalogPanel`, `TrackCard`, `TrackArtwork`, `WaveformPreview`
- studio metadata/upload flow вынесен в `StudioForm` и `useTrackActions`
- auth UI и логика вынесены в `AuthPanel` и `useAuth`
- добавлены минимальные frontend-тесты для auth, track card и player

## 3. Текущая логика статусов

### Track.status

- `pending`
  - metadata уже создано, но source ещё не загружен
- `processing`
  - worker обрабатывает загруженный source
- `approved`
  - media успешно обработано и трек опубликован
- `rejected`
  - processing завершился ошибкой
- `deleted`
  - soft-delete

## 4. Что нужно протестировать руками прямо сейчас

- регистрация нового пользователя
- создание metadata
- загрузка cover
- загрузка WAV/MP3
- переход `pending -> processing -> approved`
- появление трека в общем каталоге после обработки
- playback как из каталога, так и из `Мои треки`
- лайк, обновление страницы и вкладка лайкнутых треков
- удаление своего трека
- удаление чужого трека под `admin` или `moderator`

Полный чек-лист:

- [`manual-test-checklist-ru.md`](manual-test-checklist-ru.md)

## 5. Что уже можно считать реально рабочим

- production-базу и инфраструктуру
- auth
- metadata flow
- audio upload flow
- cover upload flow
- playback
- базовый discovery
- лайки как первый social loop
- разграничение прав на удаление

## 6. Что ещё остаётся до более цельного MVP

- play counters при реальном прослушивании
- download rules
- playlists
- comments
- artist profile / artist view
- расширить frontend tests за пределы первичных smoke-тестов
- backup strategy для Postgres и MinIO
- rate limiting для upload/stream

## 7. План следующих работ

### Этап 1. Player и media polish

- play counters только при реальном listen-threshold
- download rules для `is_downloadable`
- более сильный mobile/player UX

### Этап 2. Discovery

- фильтры по тегам, BPM и key
- более сильные карточки треков
- artist profile view

### Этап 3. Social layer

- playlists
- comments

### Этап 4. Reliability

- расширить backend tests
- расширить frontend tests
- rate limiting, request id/correlation id, базовые metrics, Grafana provisioning
  и security headers начаты в итерации 4
- automated backup/restore и load baseline остаются следующими reliability-блоками
