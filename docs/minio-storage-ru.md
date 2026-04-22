# MinIO storage: как это работает сейчас

## 1. Роль MinIO в проекте

MinIO в `resonans-sound` хранит бинарные медиа-объекты:

- исходный audio upload
- производные `128.mp3`
- производные `320.mp3`
- cover images

PostgreSQL остаётся бизнес-истиной, а MinIO хранит сами файлы.

## 2. Layout object key

- `tracks/{user_id}/{track_id}/original/{uuid}.{ext}`
- `tracks/{user_id}/{track_id}/derived/128.mp3`
- `tracks/{user_id}/{track_id}/derived/320.mp3`
- `tracks/{user_id}/{track_id}/cover/{uuid}.{ext}`

## 3. Как MinIO связано с БД

В БД используются:

- `tracks.original_url`, `tracks.mp3_128_url`, `tracks.mp3_320_url`
- `tracks.cover_image_url`
- `tracks.metadata_json`
- `tracks.status`

Главная идея:

- frontend не должен работать с object key напрямую
- frontend использует backend URL
- backend сам знает, какой объект брать из MinIO

## 4. Текущий media flow

1. Пользователь создаёт metadata.
2. При необходимости загружает cover.
3. Загружает audio source.
4. Backend кладёт файлы в MinIO.
5. Worker забирает оригинал, генерирует производные MP3 и waveform.
6. Worker сохраняет производные файлы обратно в MinIO.
7. После успешной обработки трек автоматически получает `approved`.

## 5. Playback и cover delivery

### Audio

- `GET /api/v1/tracks/{id}/stream?quality=128`
- `GET /api/v1/tracks/{id}/stream?quality=320`
- `GET /api/v1/tracks/{id}/stream?quality=original`

### Cover

- `GET /api/v1/tracks/{id}/cover`

И в audio, и в cover-flow browser ходит через backend, а не напрямую в MinIO.

## 6. Где смотреть object keys

Самый удобный способ — через PostgreSQL:

```sql
select
  id,
  status,
  metadata_json->'storage' as storage,
  metadata_json->'cover' as cover
from tracks
order by id desc
limit 20;
```

## 7. Как проверить файлы в MinIO

```bash
cd /root/resonans-sound/infra
docker compose exec -T minio sh -lc 'ls /data'
docker compose exec -T minio sh -lc 'ls -R /data/audio-tracks | tail -120'
```

## 8. Как понять, что upload реально прошёл

Нормальная цепочка сейчас такая:

- после upload трек уходит в `processing`
- после обработки worker переводит его в `approved`
- в `tracks` появляются `original_url`, `mp3_128_url`, `mp3_320_url`
- если загружена cover image, появляется `cover_image_url`

## 9. Как правильно работать с storage дальше

- не использовать MinIO как бизнес-базу данных
- не отдавать object key наружу
- при дебаге смотреть сразу:
  - `tracks.status`
  - `tracks.metadata_json`
  - наличие объекта в MinIO

## 10. Естественные следующие шаги вокруг storage

- presigned direct-to-MinIO upload
- cleanup старых revisions
- integrity checks между БД и MinIO
- backup strategy для MinIO

## 11. Artist profile media

Artist profile avatar and banner images are active runtime media.

- Object keys use `profiles/{user_id}/avatar/{uuid}.{ext}` and
  `profiles/{user_id}/banner/{uuid}.{ext}`.
- Public clients receive only backend URLs:
  `/api/v1/artists/{slug}/avatar` and
  `/api/v1/artists/{slug}/banner`.
- Upload validation reuses the same server-side image signature checks as track
  and collection covers.
- MinIO object keys stay internal and must not be exposed to the frontend.
