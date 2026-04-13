# 🚀 Локальная разработка Audioplatform

Пошаговая инструкция для запуска проекта на локальной машине (Windows/macOS/Linux).

## ⚠️ Важное предупреждение

**Проект предназначен для запуска в Docker-контейнерах.** 

Локальная установка зависимостей на Windows может вызвать проблемы из-за:
- Python 3.14 не имеет готовых бинарных пакетов для некоторых библиотек
- Требуется компиляция C/C++ расширений (Visual Studio Build Tools)
- Требуется Rust компилятор для pydantic-core

**Рекомендуемый способ:** Используйте Docker Desktop для локальной разработки.

---

## 📋 Предварительные требования

### Обязательные
- **Docker Desktop** (версия 20.10+)
  - [Скачать для Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)
  - [Скачать для macOS](https://desktop.docker.com/mac/main/arm64/Docker.dmg)
  - [Скачать для Linux](https://docs.docker.com/engine/install/)
  
- **Git** для клонирования репозитория

### Опционально (для локальной разработки без Docker)
- Python 3.11 (не 3.14!)
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+

---

## 🔧 Способ 1: Запуск через Docker (РЕКОМЕНДУЕТСЯ)

Это единственный надежный способ запустить проект на Windows.

### Шаг 1: Установка Docker Desktop

1. Скачайте Docker Desktop с официального сайта
2. Установите и запустите приложение
3. Дождитесь завершения инициализации (зеленый индикатор внизу)
4. Проверьте установку:
   ```bash
   docker --version
   docker compose version
   ```

### Шаг 2: Клонирование проекта

```bash
cd C:\Users\YourUsername\Desktop
git clone <repository-url> resonans-sound
cd resonans-sound
```

### Шаг 3: Создание файла окружения

Создайте файл `.env` в корне проекта:

```bash
# Скопируйте шаблон
copy .env.example .env
```

Или создайте вручную файл `.env` со следующим содержимым:

```env
# PostgreSQL
POSTGRES_USER=audioplatform
POSTGRES_PASSWORD=audioplatform_secret
POSTGRES_DB=audioplatform
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_DEFAULT_USER=audioplatform
RABBITMQ_DEFAULT_PASS=audioplatform_secret
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672

# MinIO (S3-compatible storage)
MINIO_ROOT_USER=audioplatform
MINIO_ROOT_PASSWORD=audioplatform_secret
MINIO_BUCKET=tracks
MINIO_ENDPOINT=minio:9000

# Application
APP_ENV=development
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
FRONTEND_URL=http://localhost
```

### Шаг 4: Запуск всех сервисов

```bash
cd infra
docker compose up -d
```

**Что происходит:**
- Скачиваются все необходимые образы (PostgreSQL, Redis, RabbitMQ, MinIO, etc.)
- Создаются контейнеры для backend, frontend, celery_worker
- Инициализируется база данных
- Запускается nginx как reverse proxy

### Шаг 5: Проверка статуса

```bash
docker compose ps
```

Все сервисы должны быть в статусе `running`:

```
NAME                    STATUS
infra-backend           Up
infra-frontend          Up
infra-celery_worker     Up
infra-db                Up
infra-redis             Up
infra-rabbitmq          Up
infra-minio             Up
infra-nginx             Up
infra-prometheus        Up
infra-grafana           Up
```

### Шаг 6: Доступ к приложению

Откройте в браузере:

| Сервис | URL | Логин/Пароль |
|--------|-----|--------------|
| **Фронтенд** | http://localhost | - |
| **API Docs** | http://localhost/api/docs | - |
| **Admin Panel** | http://localhost/admin | admin@audioplatform.com / admin123 |
| **MinIO Console** | http://localhost:9001 | audioplatform / audioplatform_secret |
| **Grafana** | http://localhost:3000 | admin / admin |
| **RabbitMQ Management** | http://localhost:15672 | audioplatform / audioplatform_secret |

### Шаг 7: Просмотр логов

```bash
# Все логи
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только frontend
docker compose logs -f frontend

# Только база данных
docker compose logs -f db
```

### Шаг 8: Остановка проекта

```bash
# Остановить все сервисы
docker compose down

# Остановить и удалить тома (база данных очистится!)
docker compose down -v
```

---

## 🔨 Способ 2: Локальная разработка (ТОЛЬКО для опытных)

⚠️ **Не рекомендуется для Windows!** Используйте этот способ только на Linux/macOS с Python 3.11.

### Для бэкенда (Python)

```bash
cd backend

# Создайте виртуальное окружение с Python 3.11
python3.11 -m venv venv

# Активируйте
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Обновите pip
python -m pip install --upgrade pip

# Установите зависимости
pip install -r requirements.txt

# Настройте переменные окружения
copy .env.example .env  # Windows
# или
cp .env.example .env    # Linux/macOS

# Запустите сервер разработки
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Если возникают ошибки компиляции на Windows:**

1. Установите [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. При установке выберите "C++ build tools" с опцией "MSVC"
3. Перезапустите терминал
4. Попробуйте установить пакеты снова

ИЛИ используйте готовые бинарные пакеты:

```bash
# Установите сначала wheel
pip install wheel

# Затем установите пакеты с бинарными колесами
pip install aiohttp==3.9.1 --only-binary :all:
pip install pydantic==2.5.3
```

### Для фронтенда (Node.js)

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

### Для базы данных и других сервисов

Вам понадобится запустить отдельно:
- PostgreSQL на порту 5432
- Redis на порту 6379
- RabbitMQ на порту 5672
- MinIO на порту 9000

Или используйте docker compose только для инфраструктуры:

```bash
cd infra
docker compose up -d db redis rabbitmq minio
```

Затем подключайте backend и frontend локально.

---

## 🐛 Решение распространенных проблем

### Проблема 1: "Could not find a version that satisfies the requirement python-cors"

**Решение:** Этот пакет был удален из requirements.txt. Если ошибка возникает, обновите файл:

```bash
# Убедитесь что в requirements.txt нет строки python-cors
grep python-cors backend/requirements.txt
```

### Проблема 2: "Building wheel for aiohttp failed" на Windows

**Причина:** Отсутствие Visual C++ Build Tools

**Решение 1 (рекомендуется):** Используйте Docker

**Решение 2:** Установите Build Tools:
1. Скачайте [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Установите workload "Desktop development with C++"
3. Перезапустите терминал
4. Запустите `pip install -r requirements.txt`

**Решение 3:** Понизьте версию Python до 3.11 и используйте готовые колеса:
```bash
pip install --upgrade pip
pip install wheel
pip install -r requirements.txt --only-binary :all:
```

### Проблема 3: "link.exe not found" для pydantic-core

**Причина:** Требуется Rust компилятор и MSVC linker

**Решение:** Используйте Docker или установите:
1. [Rust](https://rustup.rs/)
2. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

ИЛИ используйте Docker (настоятельно рекомендуется).

### Проблема 4: Контейнеры не запускаются

**Проверьте:**
```bash
# Достаточно ли ресурсов Docker?
docker stats

# Есть ли конфликты портов?
netstat -ano | findstr :5432
netstat -ano | findstr :6379
netstat -ano | findstr :8000
```

**Решение:**
```bash
# Очистите старые контейнеры
docker compose down -v

# Пересоберите образы
docker compose build --no-cache

# Запустите снова
docker compose up -d
```

### Проблема 5: База данных не инициализируется

**Проверьте логи:**
```bash
docker compose logs db
```

**Пересоздайте базу:**
```bash
docker compose down -v
docker compose up -d db
# Подождите 30 секунд пока БД инициализируется
docker compose up -d backend
```

### Проблема 6: Frontend не подключается к API

**Проверьте CORS настройки в `.env`:**
```env
FRONTEND_URL=http://localhost
```

**Проверьте что nginx запущен:**
```bash
docker compose ps nginx
```

---

## 🧪 Тестирование

### Запуск тестов бэкенда

```bash
docker compose exec backend pytest
```

### Запуск тестов фронтенда

```bash
docker compose exec frontend npm test
```

---

## 📝 Разработка

### Внесение изменений в бэкенд

1. Измените файлы в `backend/app/`
2. Контейнер автоматически перезагрузится (режим --reload)
3. Проверьте изменения на http://localhost/api/docs

### Внесение изменений в фронтенд

1. Измените файлы в `frontend/src/`
2. Vite автоматически пересоберет проект
3. Обновите страницу в браузере

### Добавление новых миграций БД

```bash
# Создайте миграцию
docker compose exec backend alembic revision --autogenerate -m "Description"

# Примените миграцию
docker compose exec backend alembic upgrade head
```

---

## 🎯 Следующие шаги

1. ✅ Запустите проект через Docker
2. ✅ Проверьте доступность API на http://localhost/api/docs
3. ✅ Войдите как администратор (admin@audioplatform.com / admin123)
4. 📚 Изучите структуру проекта в README.md
5. 🔨 Начните разработку необходимых функций

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `docker compose logs -f`
2. Убедитесь что Docker Desktop запущен
3. Проверьте что порты 80, 5432, 6379 свободны
4. Попробуйте пересобрать образы: `docker compose build --no-cache`
5. Перезапустите Docker Desktop

**Документация:**
- [Docker Docs](https://docs.docker.com/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
