# Текущее состояние проекта и план до MVP

## 1. Где проект находится сейчас

Проект уже вышел из стадии “только инженерной базы” и находится в состоянии
раннего, но реального MVP-среза:

- production поднят и считается рабочей базой
- frontend подключён к live API и раздаётся как production static site
- auth работает end-to-end
- upload/media pipeline работает end-to-end
- moderation работает end-to-end
- public playback и owner/private playback работают
- discovery уже не заглушка: есть поиск, категории и сортировка
- likes уже работают как первый social loop

Актуальный production baseline:

- домен: `https://resonance-sound.ru`
- host Nginx завершает SSL
- `/` проксируется на frontend `127.0.0.1:3000`
- `/api/` проксируется на backend `127.0.0.1:8000`
- production source of truth для конфигурации: `/root/resonans-sound/infra/.env`

## 2. Что уже реализовано

### Инфраструктура и production

- host Nginx и Let's Encrypt работают
- внешние лишние Docker-порты не торчат наружу
- backend, Celery, Postgres, Redis, RabbitMQ, MinIO работают через Docker Compose
- `/metrics` подключён и отдаётся без лишнего redirect
- frontend остаётся production static build, не dev server

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- refresh token rotation исправлена и подтверждена

### Tracks: metadata + media

- create/update/delete metadata для owner tracks
- `GET /api/v1/tracks/mine`
- `POST /api/v1/tracks/upload`
- загрузка оригинала в MinIO
- Celery processing
- генерация `128/320 mp3`
- генерация waveform data
- owner-facing media state в `tracks` и `metadata_json`

### Playback и access rules

- публично воспроизводятся только `approved + is_public`
- owner может слушать свои private/non-approved media
- moderator/admin может делать preview треков из moderation queue
- для private browser playback добавлен безопасный `GET /api/v1/tracks/{id}/stream-url`
- `GET /api/v1/tracks/{id}/stream` поддерживает HTTP Range
- private preview идёт через короткоживущие signed URL, а не через прямой Bearer в `<audio>`

### Moderation

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/moderation`
- `GET /api/v1/admin/logs`
- `POST /api/v1/admin/moderate/{track_id}`
- approve/reject flow
- owner видит причину reject
- admin log сохраняется и показывается в UI

### Discovery и social

- `GET /api/v1/tracks` поддерживает `search`
- `GET /api/v1/tracks` поддерживает `sort=newest|popular|title`
- category filter работает через текущий каталог
- лайки:
  - `GET /api/v1/interactions/likes/mine`
  - `POST /api/v1/interactions/like`
  - `DELETE /api/v1/interactions/like`

### Frontend

- live auth
- live catalog
- studio metadata flow
- upload flow
- owner track states с более понятными сообщениями
- единый player flow для public и private preview
- progress/status/error блок для плеера
- waveform preview
- moderation area с history
- search/sort UI
- likes UI

### Тесты и верификация

- backend tests добавлены для streaming/access/upload критических мест
- `pytest -q tests` проходит в backend container
- текущий серверный прогон дал `9 passed`

## 3. Текущая логика статусов

### Track.status

- `pending`
  - либо metadata уже создано, но upload ещё не сделан
  - либо media уже обработано, но трек ещё ждёт moderation
- `processing`
  - worker сейчас обрабатывает upload
- `approved`
  - moderation пройдена
- `rejected`
  - трек отклонён worker или moderator
- `deleted`
  - soft-delete

### Важное различие внутри `pending`

Сейчас `pending` включает два фактических под-состояния:

- metadata-only pending
- ready-for-moderation pending

Как различать:

- если `original_url` пустой, значит upload ещё не сделан
- если `original_url` уже есть и есть производные media URL, а `status` всё ещё `pending`, значит media готово и трек ждёт moderation

## 4. Что уже подтверждено на production

На проде уже были подтверждены:

- deploy последних коммитов
- auth flow: register -> me -> refresh -> logout
- upload flow end-to-end
- MinIO storage реально используется
- Celery processing реально запускается
- moderation approve/reject flow реально работает
- public streaming реально работает
- owner/private streaming реально работает через signed stream URL
- Range requests реально работают
- search по каталогу реально отвечает
- likes реально пишутся и читаются через live API

Последний server-side smoke после деплоя подтвердил:

- поиск по каталогу
- like публичного трека
- создание private track
- upload WAV
- успешный processing до `pending` с готовым `mp3_320_url`
- получение signed `stream-url`
- private playback response `206 Partial Content`
- `Content-Type: audio/mpeg`
- `Cache-Control: private, no-store`

## 5. Что протестировать руками прямо сейчас

Краткий список того, что стоит проверить вручную после этой итерации:

- публичный playback как гость
- поиск и сортировку в каталоге
- owner flow: metadata -> upload -> processing -> private preview
- moderation flow: preview -> reject -> approve
- видимость approved public vs approved private
- likes: поставить, обновить страницу, снять
- logout и повторную проверку private playback

Полный чек-лист вынесен в отдельный документ:

- [`manual-test-checklist-ru.md`](manual-test-checklist-ru.md)

## 6. Степень готовности MVP

### Уже можно считать реально рабочим

- инфраструктуру и production-базу
- auth
- metadata flow
- upload/media flow
- moderation core
- public player flow
- owner/private preview flow
- базовый discovery
- likes как первый social loop

### Уже близко, но ещё не доведено до комфортного MVP

- moderation UX как отдельная полноценная зона
- player UX как отдельный более polished experience
- play counters и аналитика прослушиваний
- download rules
- owner notifications о moderation result

### Всё ещё остаётся неполным

- playlists
- comments
- follows
- artist profile view
- frontend tests
- operational backup strategy
- rate limiting для upload/stream

## 7. План следующих работ

### Этап 1. Дошлифовать media/player core

- добавить play counters только при реальном прослушивании, а не при любом запросе потока
- реализовать download rules для `is_downloadable`
- сделать player UX ещё понятнее на мобильном и на длинных треках
- добавить cover art как следующий media-артефакт

### Этап 2. Усилить moderation UX

- добавить фильтры очереди moderation
- показать owner-friendly state для “на review” и “rejected”
- сделать повторную отправку на review более явной
- при необходимости добавить отдельный moderation screen вместо одного блока

### Этап 3. Дожать discovery MVP

- фильтры по тегам, BPM и key
- лучшие карточки треков
- artist profile / artist view

### Этап 4. Дожать первый social layer

- playlists как следующий логичный шаг после likes
- затем comments

### Этап 5. Reliability и operations

- расширить backend tests на auth/moderation/likes
- добавить frontend tests для player/search/likes
- описать backup strategy для Postgres и MinIO
- добавить upload/stream rate limiting

## 8. Самый выгодный следующий шаг

Если двигаться по соотношению эффект/риск, самый выгодный следующий срез такой:

- play counters + download rules
- затем moderation filters/resubmit UX
- затем playlists

Это даст уже не просто “работающий сервис”, а более цельный MVP, который
можно увереннее показывать и давать пользователям для настоящего раннего
фидбэка.
