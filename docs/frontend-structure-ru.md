# Структура frontend

Этот документ описывает текущую структуру `frontend/src`, чтобы правки можно
было вносить вручную без повторного разбора всего приложения.

## Общий принцип

Frontend больше не должен расти как один большой `App.tsx`.

`App.tsx` отвечает только за:

- общий layout страницы
- React Router
- подключение крупных feature-блоков
- общий hero/header и footer status

Бизнес-логика, API, карточки, формы и shared UI лежат в отдельных папках.

## Маршруты

Маршруты находятся в `frontend/src/App.tsx`.

- `/` — главная: studio form, public collections и catalog; глобальный player подключён выше маршрутов
- `/login` — auth panel
- `/studio` — отдельная studio-страница для metadata/upload flow
- `/me` — профильная зона: auth context и catalog/library
- `/tracks/:id` — страница одного трека
- `/collections` — публичные staff-curated подборки
- `/collections/:id` — отдельная публичная подборка с approved-треками
- `/admin` — staff-контроль треков и staff-managed подборок

Если добавляется новая страница, сначала добавьте feature/page-компонент, потом
подключайте его в `Routes` внутри `App.tsx`.

## Папки

### `app/`

Глобальная настройка приложения.

- `app/theme.ts` — MUI theme, typography, базовые component overrides

Править здесь стоит только внешний вид всего приложения: цвета, шрифты,
глобальные радиусы, дефолтные стили MUI-компонентов.

### `entities/`

Переиспользуемые сущности предметной области.

Сейчас активна сущность track:

- `entities/track/model/track.ts` — чистые функции по треку
- `entities/track/ui/TrackCard.tsx` — карточка трека
- `entities/track/ui/TrackArtwork.tsx` — cover/fallback artwork
- `entities/track/ui/WaveformPreview.tsx` — waveform preview

Важно: public catalog не отдаёт приватные media URL-поля
`mp3_320_url/original_url`. Поэтому playback для `approved` треков не должен
зависеть только от этих полей. Для выбора stream quality используется
`getPlayableQualityCandidates()`.

### `features/`

Крупные пользовательские блоки.

- `features/auth/AuthPanel.tsx` — login/register/session UI
- `features/admin/AdminPanel.tsx` — композиция staff-only блоков для треков и подборок
- `features/admin/collections/AdminCollectionsPanel.tsx` — staff CRUD, publish/unpublish, add/remove/reorder tracks для подборок
- `features/auth/model/authData.ts` — загрузка/сброс auth-зависимого состояния
- `features/catalog/CatalogPanel.tsx` — каталог, поиск, фильтры, liked tab
- `features/catalog/model/catalogData.ts` — загрузка catalog и общий refresh UI
- `features/collections/CollectionsPanel.tsx` — публичный список подборок
- `features/collections/CollectionDetailPage.tsx` — страница одной подборки
- `features/player/PlayerPanel.tsx` — глобальный sticky player block, подключён в `App.tsx` вне `Routes`
- `features/studio/StudioForm.tsx` — metadata form, выбор cover/audio, мои треки
- `features/tracks/TrackDetailPage.tsx` — страница `/tracks/:id`

Если правка касается конкретного пользовательского блока, начинайте с
соответствующего файла в `features/`, а не с `App.tsx`.

### `hooks/`

Логика, которую нельзя держать в UI-компонентах.

- `useAuth.ts` — login/register/logout и переходы после auth-действий
- `useCatalog.ts` — bootstrap, загрузка каталога, поиск, фильтры
- `useAudioPlayer.ts` — audio element, stream-url, play/pause, player state,
  listen-threshold play reporting
- `useCollections.ts` — загрузка публичных staff-curated подборок
- `useTrackActions.ts` — create/update metadata, delete, like, cover/audio upload

Правило: если компонент начинает содержать async API calls, побочные эффекты
или сложные state transitions, выносите это в hook.

### `shared/api/`

Типизированный API-клиент и backend DTO.

- `shared/api/client.ts` — axios client, auth refresh, методы API
- `shared/api/types.ts` — типы `User`, `Track`, `Category`, `Collection`, `AuthTokens`,
  `TrackMetadataPayload`, `PaginatedResponse` и другие DTO

Новые API-методы добавляются сюда. Не используйте `any`: сначала добавьте тип
request/response в `types.ts`, затем метод в `client.ts`.

### `shared/store/`

Централизованный Zustand state.

- `shared/store/appStore.ts`

Сейчас state разделён логически:

- `useAppStatusStore` — health, initial loading, page error, banner
- `useAuthStore` — user, auth mode, auth busy
- `useCatalogStore` — categories, public tracks, liked tracks, my tracks,
  filters/search/sort
- `usePlayerStore` — active track, player quality, play/loading/error/progress
- `useStudioStore` — studio form, editing track, upload busy flags

Не добавляйте Redux Toolkit параллельно: активный state-подход сейчас Zustand.

### `shared/lib/`

Маленькие чистые утилиты без React.

- `error.ts` — нормализация ошибок API в пользовательский текст
- `time.ts` — форматирование времени
- `tokens.ts` — access/refresh tokens в `localStorage`

### `shared/ui/`

Переиспользуемые UI-примитивы.

- `ActionButton.tsx`
- `AppTextField.tsx`
- `MetricTile.tsx`
- `SectionCard.tsx`
- `icons.tsx`

Иконки лежат локально в `icons.tsx`, чтобы не тащить тяжёлый
`@mui/icons-material`. Если нужна новая иконка, добавьте маленький SVG wrapper
туда.

### `test/`

Общие test helpers.

- `test/render.tsx` — render с MUI theme для Vitest SSR smoke-тестов

## Частые ручные правки

### Изменить карточку трека

Файл: `frontend/src/entities/track/ui/TrackCard.tsx`.

Если меняется правило доступности playback, также проверьте:

- `frontend/src/entities/track/model/track.ts`
- `frontend/src/hooks/useAudioPlayer.ts`
- `frontend/src/entities/track/ui/TrackCard.test.tsx`

### Изменить форму выкладывания трека

Файл: `frontend/src/features/studio/StudioForm.tsx`.

Форма показывает metadata-поля всегда. Без сессии поля disabled, чтобы было
понятно, где создаётся трек, но отправка доступна только авторизованному
пользователю.

В форме можно выбрать audio и cover сразу при создании metadata. Если audio
выбрано, `useTrackActions` после создания metadata сам отправит файл в upload,
и backend запустит processing. Старый двухшаговый flow также остаётся: можно
создать metadata, а потом загрузить audio/cover из карточки в блоке "Мои треки".

Логика сохранения metadata/upload лежит в:

- `frontend/src/hooks/useTrackActions.ts`

Тип payload для backend:

- `frontend/src/shared/api/types.ts`
- `TrackMetadataPayload`

### Изменить каталог

UI:

- `frontend/src/features/catalog/CatalogPanel.tsx`

Загрузка данных:

- `frontend/src/hooks/useCatalog.ts`
- `frontend/src/features/catalog/model/catalogData.ts`

### Изменить player

UI:

- `frontend/src/features/player/PlayerPanel.tsx`

Логика:

- `frontend/src/hooks/useAudioPlayer.ts`
- `frontend/src/entities/track/model/track.ts`

Важно: для public approved треков frontend ставит в `<audio>` прямой backend URL
`GET /api/v1/tracks/{id}/stream?quality=...`, чтобы запуск не терял пользовательский
клик из-за предварительного async-запроса. Если выбранное качество недоступно,
hook должен пробовать fallback-качества.

Важно: `PlayerPanel` должен оставаться вне `Routes`, иначе при переходе между
страницами React размонтирует `<audio>`, и воспроизведение прервётся.

### Добавить поле в track metadata

1. Проверьте backend schema/API.
2. Добавьте поле в `Track`, `TrackFormState` и `TrackMetadataPayload` в
   `shared/api/types.ts`.
3. Добавьте поле в `initialTrackForm` в `shared/store/appStore.ts`.
4. Добавьте input в `features/studio/StudioForm.tsx`.
5. Добавьте сериализацию в `buildTrackPayload()` внутри `hooks/useTrackActions.ts`.
6. При необходимости обновите `TrackCard.tsx`.

## Проверки перед коммитом

Локально из `frontend/`:

```bash
npm install
npm run test
npm run build
```

В текущей Windows-среде может не быть системного `npm`; тогда проверяйте через
Docker или на сервере, но коммитить frontend-изменения без `test/build` нельзя.

Production deploy frontend:

```bash
cd /root/resonans-sound
git pull --ff-only origin main
cd infra
docker compose build frontend
docker compose up -d frontend
curl https://resonance-sound.ru/api/v1/health
```

После деплоя проверить:

- `/`
- `/login`
- `/studio`
- `/me`
- playback из catalog
- наличие studio form на главной и на `/studio`
## 2026-04-22 Collection UX note

- Collection play uses `useAudioPlayer.playTrackQueue()` so a public collection
  plays approved tracks in order and advances automatically.
- `PlayerPanel` is a compact fixed bottom player, still mounted outside
  `Routes`.
- Admin collection management uses searchable approved-track lookup and
  supports collection cover upload through the typed API client.
