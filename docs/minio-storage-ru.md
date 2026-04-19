# MinIO Storage: как это работает в проекте

## Что такое MinIO в этом проекте

MinIO у нас используется как S3-совместимое объектное хранилище для аудиофайлов.
PostgreSQL хранит бизнес-данные и статусы, а MinIO хранит сами бинарные файлы:

- исходный загруженный файл
- производные MP3-версии
- будущие медиа-артефакты, если они появятся

Важно: MinIO не является источником бизнес-истины. Источник истины по состоянию
трека находится в таблице `tracks` и в `tracks.metadata_json`.

## Что именно лежит в MinIO

Для каждого трека сейчас используются такие ключи:

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`

Пример:

- `tracks/6/3/original/814435e9212240808f9a6004adc2641b.wav`
- `tracks/6/3/derived/128.mp3`
- `tracks/6/3/derived/320.mp3`

## Как это связано с БД

В БД:

- `tracks.original_url`, `tracks.mp3_128_url`, `tracks.mp3_320_url`
  это канонические backend URL для стриминга
- `tracks.metadata_json.storage`
  хранит реальные object keys в MinIO
- `tracks.status`
  хранит бизнес-статус трека

То есть frontend и API работают через backend URL, а backend уже знает, какой
объект брать из MinIO.

## Полный путь файла

1. Пользователь создаёт metadata через `POST /api/v1/tracks`
2. Загружает исходник через `POST /api/v1/tracks/upload`
3. Backend кладёт оригинал в MinIO
4. Celery worker скачивает оригинал из MinIO
5. Worker генерирует `128.mp3` и `320.mp3`
6. Worker загружает производные файлы обратно в MinIO
7. Backend стримит их через `GET /api/v1/tracks/{id}/stream`

## Где смотреть object keys

Самый удобный способ:

- в PostgreSQL в `tracks.metadata_json`
- в MinIO volume внутри контейнера

Пример SQL:

```sql
select
  id,
  status,
  metadata_json->'storage' as storage
from tracks
order by id desc
limit 20;
```

Пример на сервере:

```bash
cd /root/resonans-sound/infra
docker compose exec -T postgres \
  psql -U audioplatform -d audio_platform \
  -c "select id, status, metadata_json->'storage' as storage from tracks order by id desc limit 20;"
```

## Как посмотреть файлы внутри MinIO

В текущем compose MinIO хранит данные во внутреннем volume и внутри контейнера
они доступны через `/data`.

Пример:

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'ls -R /data | tail -80'
```

## Как понять, что upload прошёл успешно

Нормальная цепочка сейчас такая:

- после upload трек уходит в `processing`
- после обработки worker переводит его в `pending`
- это значит: media готово и трек ждёт moderation
- после moderation трек получает:
  - `approved`
  - или `rejected`

## Как теперь работать с MinIO дальше

### 1. Не использовать MinIO как базу данных

Нельзя ориентироваться только на наличие файлов в bucket. Всегда смотрим:

- `tracks.status`
- `tracks.metadata_json`
- `tracks.rejection_reason`

### 2. Не отдавать прямые внутренние object keys наружу

Снаружи пользователи должны работать через backend endpoints:

- upload через API
- streaming через API

Это позволяет централизованно применять:

- owner/private access rules
- moderation rules
- future analytics
- future signed URLs или CDN

### 3. При дебаге проверять три уровня

Если “файл не играет”:

1. Есть ли row в `tracks`
2. Есть ли `storage.original_object_key` и `processed_object_keys`
3. Есть ли сам объект внутри MinIO

### 4. При расширении pipeline складывать в MinIO только медиа-артефакты

Хорошие кандидаты на новые объекты:

- waveform preview files
- cover art
- stem exports
- compressed previews
- alternate encodes

Но статус и логика их использования должны оставаться в PostgreSQL.

## Полезные команды

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
curl -f http://127.0.0.1:9000/minio/health/live
```

Проверка bucket и файлов:

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'ls /data'
docker compose exec -T minio sh -lc 'ls -R /data/audio-tracks | tail -80'
```

## Что дальше можно улучшить

Следующие естественные шаги вокруг storage:

- presigned upload URLs
- CDN перед streaming endpoint
- cleanup старых revisions
- отдельная таблица media assets
- background integrity checks между БД и MinIO
