# Ручной чек-лист готовности

## 1. Гость и общий каталог

- Открыть `https://resonance-sound.ru` и убедиться, что страница загружается без ошибок.
- Проверить навигацию между `/`, `/login`, `/studio`, `/me`.
- Переключить несколько категорий и проверить, что список треков реально меняется.
- Проверить поиск и сортировку.
- Нажать `Слушать` на опубликованном треке и убедиться:
  - звук действительно идёт
  - прогресс плеера движется
  - waveform подсвечивается
- Дождаться порога прослушивания `30 секунд или 50% длительности` и убедиться,
  что `Plays` увеличивается один раз.
- Повторить прослушивание сразу и убедиться, что дедуп за 6 часов не увеличил
  `Plays` второй раз для того же listener-а.
- Убедиться, что без логина лайк поставить нельзя.

## 2. Owner flow

- Зарегистрировать нового пользователя.
- Создать metadata трека.
- Загрузить cover.
- Проверить, что обложка появилась в `Мои треки`.
- Загрузить WAV или MP3 через `Upload audio`.
- Проверить переходы:
  - после upload трек становится `processing`
  - после работы worker трек становится `approved`
  - трек появляется в общем каталоге
- Проверить playback из `Мои треки`.
- Проверить playback того же трека из общего каталога.
- Открыть страницу опубликованного трека по `/tracks/<id>` и проверить, что карточка трека загружается.

## 3. Likes

- Под логином поставить лайк треку из каталога.
- Убедиться, что счётчик лайков обновился сразу.
- Переключиться на вкладку лайкнутых треков и проверить, что трек там появился.
- Обновить страницу и убедиться, что лайк и вкладка сохранились.
- Снять лайк и проверить, что трек исчез из вкладки лайкнутых.

## 4. Права на удаление

- Под обычным пользователем удалить свой трек.
- Убедиться, что он исчез из `Мои треки` и общего каталога.
- Под `admin` или `moderator` проверить, что доступно удаление чужого трека из каталога.

## 5. Staff access

Additional staff-control checks:

- Open `/admin` under `admin` or `moderator`.
- Verify that recent non-deleted tracks are visible by default.
- Hide a disposable approved track and verify it disappears from the public catalog and `/tracks/<id>`.
- Restore the same track and verify it becomes public again.
- Delete the disposable track and verify it no longer appears in staff default review.
- Create a draft collection in `/admin`.
- Add an approved disposable track to that collection.
- Use the approved-track search field, not a static list, when adding the track.
- Upload a collection cover and verify the public cover URL works after publish.
- Publish the collection and verify it appears on `/collections` and `/collections/<id>`.
- Press collection play and verify tracks advance in collection order.
- Reorder tracks inside the collection and verify the public page follows the staff order.
- Hide the linked track and verify it disappears from the public collection surface.
- Remove the track from the collection and delete the disposable collection.

- Войти под `admin`.
- Убедиться, что роль отображается корректно.
- Если есть пользователь с ролью `moderator`, войти и проверить те же staff delete-права.

Подробности по входу:

- [`staff-access-ru.md`](staff-access-ru.md)

## 6. Что считать сигналом “итерация уже живая”

Если все пункты выше проходят без ручных костылей, текущую итерацию уже можно
считать рабочей по таким направлениям:

- metadata работает
- cover upload работает
- audio upload работает
- auto-publish работает
- playback работает
- play counters работают после listen-threshold
- discovery работает
- likes работают
- role-based delete работает
- staff hide/restore работает
- staff-managed collections работают

## 6.1 Artist profile smoke

- Open `/artists` as a guest and verify active artists load.
- Open `/artists/<username>` and verify the page shows profile data and only approved tracks.
- From a public track card, click the artist link and verify it opens `/artists/<username>`.
- Log in, open `/me`, edit display name, location, genres, bio, social links, and streaming links.
- Upload avatar and banner images; verify public `/artists/<username>/avatar` and `/artists/<username>/banner` return images.
- Hide one of the artist's tracks as staff and verify it disappears from the public artist page.

## 7. Operations hardening smoke

- Проверить, что `curl -i https://resonance-sound.ru/api/v1/health` возвращает
  `X-Request-ID`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` и `Permissions-Policy`.
- Несколько раз подряд вызвать login с неверным паролем и убедиться, что после
  лимита приходит `429` с `code=rate_limit_exceeded` и header `Retry-After`.
- Проверить, что `/root/resonans-sound/infra/.env` не содержит wildcard или
  localhost origins в `CORS_ORIGINS` при `ENV=production`.
- Через SSH tunnel открыть Grafana по инструкции из
  [`operations-hardening-runbook.md`](operations-hardening-runbook.md).
