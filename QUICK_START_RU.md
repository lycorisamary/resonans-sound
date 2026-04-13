# 🚀 БЫСТРЫЙ ЗАПУСК ЛОКАЛЬНО (для тестов)

## ⚠️ ВАЖНО: Не устанавливайте ничего локально на Windows!

Проект работает **только внутри Docker-контейнеров**. Все зависимости уже настроены и будут установлены автоматически внутри контейнера с Linux.

---

## 📋 Шаг 1: Проверьте, что у вас установлено

### Обязательно:
1. **Docker Desktop** (для Windows/Mac) или **Docker + Docker Compose** (для Linux)
   - Скачать: https://www.docker.com/products/docker-desktop/
   - После установки **перезагрузите компьютер**

2. **Проверьте установку:**
   ```bash
   docker --version
   docker compose version
   ```
   
   Должно вывести версии (например, `Docker version 24.x.x` и `Docker Compose version v2.x.x`)

---

## 📋 Шаг 2: Запуск проекта

### Вариант A: Если у вас Windows/Mac (Docker Desktop)

1. **Откройте PowerShell или Command Prompt** (не нужно открывать проект в VS Code)

2. **Перейдите в папку infra:**
   ```bash
   cd C:\путь\к\проекту\workspace\infra
   ```
   Или если вы в корне проекта:
   ```bash
   cd infra
   ```

3. **Запустите все сервисы одной командой:**
   ```bash
   docker compose up -d
   ```
   
   Эта команда:
   - Скачает все необходимые образы (PostgreSQL, Redis, RabbitMQ, etc.)
   - Построит образы backend и frontend
   - Запустит все 10 сервисов

4. **Подождите 1-2 минуты** пока все сервисы запустятся

5. **Проверьте статус:**
   ```bash
   docker compose ps
   ```
   
   Все сервисы должны быть в статусе `running` или `healthy`

---

### Вариант B: Если у вас Linux

Те же команды, что и выше:
```bash
cd /path/to/workspace/infra
docker compose up -d
docker compose ps
```

---

## 📋 Шаг 3: Проверка работы

Откройте в браузере:

| Сервис | URL | Описание |
|--------|-----|----------|
| **Фронтенд** | http://localhost | Основное приложение |
| **API Документация** | http://localhost/api/docs | Swagger UI для тестирования API |
| **Admin Panel** | http://localhost/admin | Админ-панель |
| **Health Check** | http://localhost/api/v1/health | Проверка статуса API |
| **RabbitMQ Admin** | http://localhost:15672 | Панель управления очередями (логин/пароль: audioplatform / secure_password_change_me) |
| **Grafana** | http://localhost:3000 | Мониторинг (логин/пароль: admin / admin) |

---

## 📋 Шаг 4: Тестирование API

1. Откройте http://localhost/api/docs

2. Проверьте health endpoint:
   - Нажмите на `GET /api/v1/health`
   - Click "Try it out"
   - Click "Execute"
   - Должны получить ответ: `{"status": "healthy", "version": "1.0.0"}`

3. Проверьте корневой endpoint:
   - `GET /` вернет информацию о API

---

## 🔧 Решение проблем

### ❌ Ошибка: "Cannot connect to the Docker daemon"

**Решение:**
- Убедитесь, что Docker Desktop запущен
- На Windows: найдите иконку Docker в трее (возле часов)
- Подождите пока Docker полностью загрузится (зеленая иконка)

### ❌ Ошибка: "port already allocated"

**Решение:**
Какой-то другой сервис использует нужный порт. Освободите порты или измените их в `docker-compose.yml`:
```bash
# Остановите все контейнеры
docker compose down

# Запустите снова
docker compose up -d
```

### ❌ Контейнеры постоянно перезапускаются

**Посмотрите логи:**
```bash
# Логи всех сервисов
docker compose logs

# Логи конкретного сервиса (например, backend)
docker compose logs backend

# Следить за логами в реальном времени
docker compose logs -f backend
```

### ❌ Backend не запускается, ошибка с зависимостями

**Решение:**
Убедитесь, что в `backend/requirements.txt` нет проблемных пакетов. Проект уже настроен правильно, не меняйте версии пакетов без необходимости.

Если видите ошибку с `aiohttp` или `pydantic-core` — это значит вы пытаетесь установить зависимости локально на Windows. **Не делайте этого!** Все работает внутри Docker.

### ❌ Frontend не открывается

**Проверьте логи:**
```bash
docker compose logs frontend
```

**Пересоберите frontend:**
```bash
docker compose build frontend
docker compose up -d frontend
```

---

## 🛑 Как остановить проект

```bash
# Остановить все сервисы
docker compose down

# Остановить и удалить все данные (включая базу данных!)
docker compose down -v
```

⚠️ **Внимание:** команда `docker compose down -v` удалит все данные базы данных!

---

## 🔄 Как обновить код

Если вы изменили код в проекте:

```bash
# Пересобрать и перезапустить backend
docker compose build backend
docker compose up -d backend

# Пересобрать и перезапустить frontend
docker compose build frontend
docker compose up -d frontend

# Или пересобрать всё
docker compose build
docker compose up -d
```

---

## 📊 Архитектура запуска

```
┌─────────────────────────────────────────────────────┐
│              Docker Compose                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Backend   │  │  Frontend   │  │   Celery    │ │
│  │  (FastAPI)  │  │   (React)   │  │   Worker    │ │
│  │  Port 8000  │  │  Port 5173  │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          │                          │
│  ┌───────────────────────┼───────────────────────┐ │
│  │         Nginx (Reverse Proxy)                 │ │
│  │              Port 80                          │ │
│  └───────────────────────┬───────────────────────┘ │
│                          │                          │
└──────────────────────────┼──────────────────────────┘
                           │
                    Вы в браузере
                   http://localhost
```

---

## 🎯 Что дальше?

1. ✅ Запустите проект командой `docker compose up -d`
2. ✅ Откройте http://localhost/api/docs
3. ✅ Протестируйте health endpoint
4. ✅ Изучите доступные API endpoints

После того как базовый запуск работает, можно начинать разработку функционала!

---

## 💡 Советы для разработки

### Просмотр логов в реальном времени:
```bash
docker compose logs -f backend frontend
```

### Доступ к базе данных:
```bash
docker compose exec postgres psql -U audioplatform -d audio_platform
```

### Доступ к Redis:
```bash
docker compose exec redis redis-cli
```

### Выполнение команд внутри контейнера backend:
```bash
docker compose exec backend bash
# Внутри контейнера:
python -m pytest  # Запустить тесты
alembic upgrade head  # Применить миграции
```

---

## 📞 Если что-то не работает

1. Проверьте, что Docker Desktop запущен
2. Выполните `docker compose ps` — все ли сервисы running?
3. Посмотрите логи: `docker compose logs backend`
4. Попробуйте пересобрать: `docker compose build --no-cache backend`
5. Перезапустите: `docker compose down && docker compose up -d`
