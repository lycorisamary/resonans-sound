# Структура frontend

Этот документ описывает текущую структуру `frontend/src`, чтобы редизайн и
дальнейшие правки можно было делать без возврата к монолитному `App.tsx`.

## Общий принцип

Frontend остаётся разложенным по слоям:

- `App.tsx` отвечает только за shell, маршруты, banner/error верхнего уровня и
  подключение глобального `PlayerPanel`
- page-level композиция живёт в `features/`
- повторно используемые предметные карточки лежат в `entities/`
- Zustand store, typed API client и hooks остаются источником состояния и
  side effects
- визуальные примитивы и общий layout-shell лежат в `shared/ui`

Редизайн не должен тащить бизнес-логику обратно в layout-файлы или размазывать
API-вызовы по случайным компонентам.

## Маршруты

Маршруты собираются в `frontend/src/App.tsx`.

- `/` — discovery-led главная: hero, подборки, recent/popular, spotlight по
  артистам и встроенный общий каталог
- `/login` — auth surface
- `/studio` — отдельный studio flow для metadata/upload
- `/me` — кабинет: auth context, artist profile editor и owner studio/library
- `/tracks/:id` — detail-страница трека
- `/artists` — public discovery по артистам
- `/artists/:slug` — публичный профиль артиста и его approved-треки
- `/collections` — публичные staff-curated подборки
- `/collections/:id` — detail-страница одной подборки
- `/admin` — staff control surface для треков, жалоб и подборок

Важно: `PlayerPanel` по-прежнему подключается вне `Routes`. Нельзя переносить
его `<audio>` в route-local экран, иначе playback будет сбрасываться при
навигации.

## Папки

### `app/`

Глобальная тема и MUI overrides.

- `app/theme.ts` — dark discovery theme, typography, buttons, text fields,
  surface defaults

### `entities/`

Переиспользуемые предметные сущности.

Сейчас основной активный entity-слой — `track`:

- `entities/track/model/track.ts` — статусы, playback helpers, owner-state
- `entities/track/ui/TrackCard.tsx` — универсальная карточка каталога/owner view
- `entities/track/ui/TrackArtwork.tsx` — cover/fallback artwork
- `entities/track/ui/WaveformPreview.tsx` — waveform preview

Если меняется доступность playback, обязательно проверьте:

- `entities/track/model/track.ts`
- `hooks/useAudioPlayer.ts`
- `entities/track/ui/TrackCard.test.tsx`

### `features/`

Крупные пользовательские блоки и страницы.

- `features/home/HomePage.tsx` — новая discovery-главная
- `features/home/model/useHomeFeed.ts` — загрузка curated блоков для главной
- `features/catalog/CatalogPanel.tsx` — общий каталог, фильтры, liked view
- `features/studio/StudioForm.tsx` — metadata/upload flow и owner track library
- `features/auth/AuthPanel.tsx` — auth/login/register/session surface
- `features/artists/ArtistsPanel.tsx` — поиск и фильтры по артистам
- `features/artists/ArtistDetailPage.tsx` — публичный профиль артиста
- `features/artists/ArtistProfileEditor.tsx` — создание/редактирование своего
  artist profile в `/me`
- `features/collections/CollectionsPanel.tsx` — публичный список подборок
- `features/collections/CollectionDetailPage.tsx` — detail страницы подборки
- `features/tracks/TrackDetailPage.tsx` — detail страницы трека
- `features/player/PlayerPanel.tsx` — глобальный фиксированный player
- `features/admin/AdminPanel.tsx` — staff orchestration
- `features/admin/collections/AdminCollectionsPanel.tsx` — staff CRUD по
  подборкам
- `features/admin/SiteContentPanel.tsx` — staff editing for footer contacts
  and FAQ content
- `features/siteContent/SiteFooter.tsx` — public responsive footer mounted by
  the app shell

Правило: если правка относится к конкретному экрану, начинайте с файла внутри
`features/`, а не с `App.tsx`.

### `hooks/`

Асинхронная логика и side effects, которые не должны жить внутри UI.

- `useAuth.ts` — login/register/logout и навигация после auth
- `useCatalog.ts` — bootstrap приложения, public catalog, filters/search
- `useAudioPlayer.ts` — audio element, stream URL, quality fallback, reporting
- `useCollections.ts` — загрузка публичных подборок
- `useSiteContent.ts` — public footer/FAQ loading and refresh after admin save
- `useTrackActions.ts` — create/update/delete track, like/report, cover/audio
  upload

Если компонент начинает держать сложные async переходы или несколько
взаимосвязанных флагов загрузки, вынесите это в hook.

### `shared/api/`

Typed API-клиент и DTO.

- `shared/api/client.ts`
- `shared/api/types.ts`

Новые методы сначала типизируются в `types.ts`, затем добавляются в `client.ts`.
`any` не используем.

### `shared/store/`

Централизованный Zustand state.

- `shared/store/appStore.ts`

Сейчас store логически разделён на:

- `useAppStatusStore` — health, initial loading, page error, banner
- `useAuthStore` — user, auth mode, auth busy
- `useCatalogStore` — public tracks, liked tracks, my tracks, filters/search
- `usePlayerStore` — active track, quality, loading/error/progress
- `useStudioStore` — studio form и upload/edit flags

Redux не добавляем: активный state-подход проекта сейчас Zustand.

### `shared/ui/`

Повторно используемые визуальные примитивы и layout-shell.

- `AppShell.tsx` — общий sidebar/topbar shell
- `PageHeader.tsx` — единый page-section header
- `SectionCard.tsx` — базовая surface-панель
- `ActionButton.tsx`
- `AppTextField.tsx`
- `MetricTile.tsx`
- `icons.tsx`

Иконки держим локально, чтобы не тащить `@mui/icons-material`.

## Частые ручные правки

### Изменить главную

UI:

- `features/home/HomePage.tsx`

Загрузка данных витрины:

- `features/home/model/useHomeFeed.ts`

Если меняется shell или верхняя навигация:

- `App.tsx`
- `shared/ui/AppShell.tsx`

### Изменить studio flow

UI:

- `features/studio/StudioForm.tsx`

Логика сохранения metadata/upload:

- `hooks/useTrackActions.ts`

Payload для backend:

- `shared/api/types.ts`
- `TrackMetadataPayload`

### Изменить каталог

UI:

- `features/catalog/CatalogPanel.tsx`

Загрузка данных:

- `hooks/useCatalog.ts`
- `features/catalog/model/catalogData.ts`

### Изменить player

UI:

- `features/player/PlayerPanel.tsx`

Логика:

- `hooks/useAudioPlayer.ts`
- `entities/track/model/track.ts`

Важно: public approved track по-прежнему должен играть от прямого backend stream
`GET /api/v1/tracks/{id}/stream?quality=...`, чтобы пользовательский клик не
ломался из-за промежуточного async-запроса.

## Проверки перед коммитом

Локально из `frontend/`:

```bash
npm run test
npm run build
```

В текущей Windows-среде `npm` может отсутствовать в `PATH`. Тогда запускайте
те же команды через bundled Node runtime или проверяйте внутри контейнера, но
не коммитьте frontend-изменения без `test/build`.

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
- `/collections`
- `/artists`
- `/tracks/:id`
- `/studio`
- `/me`
- `/admin`
- playback из каталога, страницы трека и подборки
