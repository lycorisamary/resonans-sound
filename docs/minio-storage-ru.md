# MinIO storage: как это работает сейчас

## 1. Роль MinIO в проекте

MinIO в `resonans-sound` — это объектное хранилище для бинарных медиафайлов.
PostgreSQL хранит бизнес-состояние трека, а MinIO хранит сами аудио-объекты.

Сейчас в MinIO лежат:

- исходный upload
- производные `128.mp3`
- производные `320.mp3`

Важно:

- бизнес-истина живёт не в MinIO
- бизнес-истина живёт в таблице `tracks`
- `tracks.metadata_json` хранит внутренние storage/process данные

## 2. Что именно хранится в MinIO

Текущий layout object key:

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`

Пример:

- `tracks/12/9/original/abc123.wav`
- `tracks/12/9/derived/128.mp3`
- `tracks/12/9/derived/320.mp3`

## 3. Как MinIO связано с БД

В БД сейчас используются такие слои:

- `tracks.original_url`, `tracks.mp3_128_url`, `tracks.mp3_320_url`
  — канонические backend stream URL
- `tracks.metadata_json.storage`
  — реальные object keys внутри MinIO
- `tracks.status`
  — бизнес-статус трека

Идея такая:

- frontend никогда не должен работать с внутренним object key напрямую
- frontend работает через backend endpoints
- backend уже сам знает, какой объект брать из MinIO

## 4. Как проходит полный путь файла

1. Пользователь создаёт metadata через `POST /api/v1/tracks`
2. Загружает исходник через `POST /api/v1/tracks/upload`
3. Backend кладёт оригинал в MinIO
4. Трек переходит в `processing`
5. Celery worker забирает оригинал из MinIO
6. Worker генерирует `128.mp3`, `320.mp3` и waveform
7. Worker сохраняет производные файлы обратно в MinIO
8. Worker переводит трек обратно в `pending`, если media готово и трек ждёт moderation
9. После approve трек может стать публично доступным

## 5. Как сейчас устроен playback поверх MinIO

### Публичный playback

Для approved public track browser может воспроизводить поток через:

- `GET /api/v1/tracks/{id}/stream?quality=128`
- `GET /api/v1/tracks/{id}/stream?quality=320`
- `GET /api/v1/tracks/{id}/stream?quality=original`

Backend по этим URL:

- проверяет доступ
- находит object key в MinIO
- отдаёт байты
- поддерживает `Range`

### Owner/private playback

Для private или non-approved track браузер не может просто взять обычный Bearer
из `localStorage` и автоматически подставить его в `<audio>`.

Поэтому сейчас используется безопасная схема:

1. frontend запрашивает `GET /api/v1/tracks/{id}/stream-url`
2. backend проверяет права owner/moderator
3. backend выдаёт короткоживущий signed URL с `stream_token`
4. `<audio>` воспроизводит уже этот URL

Это важно, потому что именно так сейчас работает private preview и moderation
preview без сломанного playback.

## 6. Где смотреть object keys

Самый удобный способ — через PostgreSQL:

```sql
select
  id,
  status,
  metadata_json->'storage' as storage
from tracks
order by id desc
limit 20;
```

На сервере:

```bash
cd /root/resonans-sound/infra
docker compose exec -T postgres \
  psql -U audioplatform -d audio_platform \
  -c "select id, status, metadata_json->'storage' as storage from tracks order by id desc limit 20;"
```

## 7. Как посмотреть файлы внутри MinIO

В текущем compose MinIO хранит данные во внутреннем volume, а внутри контейнера
они доступны через `/data`.

Примеры:

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'ls /data'
docker compose exec -T minio sh -lc 'ls -R /data/audio-tracks | tail -80'
```

## 8. Как понять, что upload реально прошёл

Нормальная цепочка сейчас такая:

- после upload трек уходит в `processing`
- после обработки worker возвращает его в `pending`
- в `tracks` появляются `original_url`, `mp3_128_url`, `mp3_320_url`
- это значит: media готово, но трек ещё ждёт moderation
- после moderation трек получает:
  - `approved`
  - или `rejected`

## 9. Как с MinIO правильно работать дальше

### Не использовать MinIO как базу данных

Нельзя ориентироваться только на “файл есть в bucket”.
Всегда надо смотреть:

- `tracks.status`
- `tracks.metadata_json`
- `tracks.rejection_reason`

### Не отдавать object keys наружу

Наружу должны уходить только backend URL:

- upload через API
- streaming через API
- private playback через signed `stream-url`

### При дебаге смотреть сразу три уровня

Если “трек не играет”, надо проверить:

1. есть ли row в `tracks`
2. есть ли `metadata_json.storage`
3. есть ли сам объект в MinIO

## 10. Полезные команды

Проверка сервисов:

```bash
cd /root/resonans-sound/infra
docker compose ps
docker compose logs minio --tail=100
docker compose logs backend --tail=100
docker compose logs celery_worker --tail=100
```

Проверка здоровья MinIO:

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'curl -f http://localhost:9000/minio/health/live'
```

Проверка bucket и файлов:

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'ls /data'
docker compose exec -T minio sh -lc 'ls -R /data/audio-tracks | tail -80'
```

## 11. Что дальше можно улучшать вокруг storage

Естественные следующие шаги:

- presigned direct-to-MinIO upload
- cleanup старых revisions
- integrity checks между БД и MinIO
- cover art и дополнительные media-артефакты
- backup strategy для MinIO
