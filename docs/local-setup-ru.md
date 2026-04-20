# Локальная разработка и запуск

Это актуальная инструкция для локального запуска `resonans-sound` в текущем
состоянии проекта.

## 1. Что важно понимать заранее

Рекомендуемый путь локальной работы - Docker Compose.

Почему это важно:

- backend зависит от Linux-окружения и `ffmpeg`
- media pipeline использует Postgres, Redis, RabbitMQ и MinIO
- через Docker проще поднять тот же стек, который уже используется в проекте

Локальный frontend dev server допустим только для изолированной разработки UI.
Он не заменяет production-схему и не должен считаться основной рабочей моделью.

## 2. Что нужно установить

Обязательно:

- Docker Desktop или Docker Engine с Compose
- Git

Опционально для режима без Docker:

- Python 3.11
- Node.js 18+

## 3. Рекомендуемый локальный запуск

### Шаг 1. Подготовить env

```bash
cd infra
cp .env.example .env
```

На Windows:

```powershell
cd infra
Copy-Item .env.example .env
```

### Шаг 2. Поднять стек

```bash
cd infra
docker compose up -d --build
```

### Шаг 3. Проверить, что сервисы поднялись

```bash
cd infra
docker compose ps
```

Ключевые сервисы:

- `postgres`
- `redis`
- `rabbitmq`
- `minio`
- `backend`
- `celery_worker`
- `frontend`

## 4. Что доступно локально с хоста

В текущем compose наружу публикуются только:

- frontend: `http://127.0.0.1:3000`
- backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/api/docs`

Быстрая проверка backend:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Ожидаемый ответ:

```json
{"status":"healthy","version":"1.0.0"}
```

## 5. Что важно знать про внутренние сервисы

MinIO, RabbitMQ, Prometheus и Grafana в текущем compose не публикуются наружу
отдельными портами. Для диагностики используйте `docker compose exec` и логи.

Примеры:

```bash
cd infra
docker compose logs minio --tail=100
docker compose logs rabbitmq --tail=100
docker compose exec minio sh
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## 6. Базовый локальный smoke

После запуска стоит проверить:

1. `GET /api/v1/health`
2. frontend открывается на `127.0.0.1:3000`
3. можно зарегистрировать пользователя
4. можно создать metadata трека
5. можно загрузить WAV или MP3
6. трек проходит путь `processing -> pending`
7. owner playback реально работает

Для полного ручного продуктового прогона используйте:

- [`manual-test-checklist-ru.md`](manual-test-checklist-ru.md)

## 7. Полезные команды

Логи:

```bash
cd infra
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery_worker
```

Пересборка только frontend:

```bash
cd infra
docker compose up -d --build frontend
```

Пересборка backend и worker:

```bash
cd infra
docker compose up -d --build backend celery_worker
```

Запуск тестов:

```bash
cd infra
docker compose run --rm backend pytest -q tests
```

## 8. Опциональный режим без Docker

Он допустим только если вы осознанно поднимаете зависимости отдельно.

Минимальная схема:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Но тогда отдельно всё равно нужно поднять:

- Postgres
- Redis
- RabbitMQ
- MinIO

Поэтому для этого проекта Docker остаётся основным способом локальной работы.

## 9. Частые проблемы

### Контейнеры не стартуют

```bash
cd infra
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
docker compose logs celery_worker --tail=200
```

### Upload не доходит до `pending`

Проверьте:

- `docker compose logs celery_worker --tail=200`
- `docker compose logs backend --tail=200`
- `tracks.metadata_json`

### Трек не играет локально

Проверьте:

- что track уже обработан
- что есть `mp3_128_url` или `mp3_320_url`
- что owner/private playback тестируется из активной сессии
- что public playback проверяется только на `approved + is_public`

## 10. Как остановить проект

```bash
cd infra
docker compose down
```

С удалением volumes:

```bash
cd infra
docker compose down -v
```

Эта команда удалит локальные данные Postgres, MinIO, Redis и RabbitMQ.
