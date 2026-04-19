# Текущее состояние проекта и план до MVP

## 1. Что уже реализовано

### Инфраструктура и production

- host Nginx и SSL работают
- reverse proxy уже в production
- frontend работает как production static site
- backend, worker, MinIO, Postgres, Redis, RabbitMQ живут в Docker Compose
- production source of truth для env находится в `/root/resonans-sound/infra/.env`
- метрики Prometheus доступны

### Auth

- register
- login
- refresh
- logout
- `GET /users/me`
- refresh rotation уже работает

### Tracks: metadata + media

- create/update/delete metadata
- owner list `GET /tracks/mine`
- upload исходного файла
- сохранение оригинала в MinIO
- Celery processing
- генерация `128/320 mp3`
- генерация waveform data
- стриминг через backend endpoint
- HTTP Range support для audio streaming

### Access rules

- публично стримятся только `approved + is_public`
- owner может слушать свои private/non-approved media
- moderator/admin может слушать треки для проверки moderation

### Moderation

- backend moderation queue
- approve/reject actions
- system stats для moderation
- admin log entry при approve/reject

### Frontend

- live auth
- live catalog
- studio metadata flow
- upload flow
- owner track states
- базовый audio player
- waveform visualization на основе `waveform_data_json`
- moderation block для moderator/admin

## 2. Текущая логика статусов

### Track.status

- `pending`
  - metadata создано, но либо upload ещё не сделан, либо media уже обработано и трек ждёт moderation
- `processing`
  - worker сейчас обрабатывает upload
- `approved`
  - moderation пройдена, трек может попасть в публичный каталог
- `rejected`
  - track отклонён worker или moderator
- `deleted`
  - soft-delete

### Важное различие

Сейчас `pending` имеет два под-состояния:

- metadata-only pending
- ready-for-moderation pending

Они различаются по media-полям:

- если `original_url` пустой, это metadata-only pending
- если `original_url` уже есть, а `status` всё ещё `pending`, значит media готово и трек ждёт moderation

## 3. Что уже подтверждено на production

- deploy последних шагов
- upload flow end-to-end
- MinIO storage реально используется
- Celery processing реально запускается
- streaming endpoint реально отдаёт audio
- Range requests реально работают

## 4. Что ещё осталось до полного MVP

### Блок A. UX и продуктовые сценарии

- улучшить публичный каталог и карточки треков
- отдельная страница/зона player experience
- понятные owner states и moderation states в UI
- уведомления пользователю о результате moderation

### Блок B. Moderation UX

- отдельная moderation dashboard, а не только встроенный блок
- moderation history
- просмотр причин отклонения и повторная отправка на review
- audit/logs view для admin

### Блок C. Streaming и media

- play count analytics при реальном прослушивании
- скачивание original/derived при `is_downloadable`
- better player controls
- buffer/progress UI
- cover art

### Блок D. Search и discovery

- текстовый поиск
- фильтры по тегам, bpm, key
- сортировки
- artist profile views

### Блок E. Social / library

- likes
- comments
- playlists
- follows

### Блок F. Reliability

- тесты backend
- тесты frontend
- rollback/cleanup strategy для failed uploads
- backup strategy для Postgres и MinIO

## 5. Поэтапный план дальше

### Этап 1. Дошлифовать текущий media core

- сделать player UX более удобным
- добавить play counters
- добавить download rules
- показать moderation state в UI ещё яснее

### Этап 2. Нормальная moderation area

- выделенный moderation screen
- queue filters
- action history
- review notes

### Этап 3. Discovery MVP

- поиск
- расширенные фильтры
- карточка артиста

### Этап 4. Engagement MVP

- likes
- comments
- playlists

### Этап 5. Operational hardening

- тесты
- резервные копии
- алерты
- rate limiting для upload/stream

## 6. Минимум, который ещё нужен до “MVP можно показывать”

Если смотреть прагматично, то до минимально цельного MVP осталось:

1. Сделать более понятный и приятный пользовательский player flow
2. Стабилизировать moderation UX
3. Добавить базовый search/discovery
4. Добавить хотя бы likes или playlists как первый social loop
5. Закрыть тестами критические backend flow

## 7. Рекомендуемый следующий шаг

Самый выгодный следующий шаг по соотношению эффект/риск:

- добить frontend experience вокруг player + moderation dashboard
- потом перейти к search/discovery

Это даст уже не просто “рабочую инженерную базу”, а MVP, который можно
показывать и тестировать на реальных пользователях.
