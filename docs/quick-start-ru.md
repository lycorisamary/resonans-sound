# Быстрый локальный старт

## 1. Что нужно

- Docker
- Docker Compose

## 2. Запуск

```bash
cd infra
cp .env.example .env
docker compose up -d --build
docker compose ps
```

## 3. Куда заходить

- frontend: `http://127.0.0.1:3000`
- API docs: `http://127.0.0.1:8000/api/docs`
- health: `http://127.0.0.1:8000/api/v1/health`

## 4. Что проверить первым делом

1. health endpoint отвечает
2. сайт открывается
3. можно зарегистрироваться
4. можно создать metadata трека
5. можно загрузить MP3/WAV
6. после обработки трек начинает проигрываться

## 5. Полезные команды

```bash
cd infra
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery_worker
docker compose run --rm backend pytest -q tests
```

## 6. Важно

- в локальном compose наружу опубликованы только frontend `3000` и backend `8000`
- production не использует frontend dev server
- полный ручной продуктовый smoke смотрите в:
  - [`manual-test-checklist-ru.md`](manual-test-checklist-ru.md)
