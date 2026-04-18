# Диагностика сервера и SSL для `resonans-sound`

Этот документ привязан к текущему репозиторию и помогает проверить, готов ли сервер к запуску проекта, а также как сейчас правильно обновлять production.

## 1. Что использует проект

По [`infra/docker-compose.yml`](./infra/docker-compose.yml) проект использует такой стек:

- `postgres`
- `redis`
- `rabbitmq`
- `minio`
- `backend`
- `celery_worker`
- `frontend`
- `nginx`
- `prometheus`
- `grafana`

Backend ожидает Linux-окружение с `ffmpeg`.

## 2. Рекомендуемые ресурсы сервера

Минимум для тестового production-сервера:

- 2 vCPU
- 4 GB RAM
- 25-30 GB SSD

Комфортнее для полного docker-стека:

- 4 vCPU
- 8 GB RAM
- 40+ GB SSD

## 3. Production source of truth

Текущая production-схема для этого проекта:

- код на сервере: `/root/resonans-sound`
- запуск Docker Compose: `/root/resonans-sound/infra`
- production-конфиг: `/root/resonans-sound/infra/.env`
- HTTPS и reverse proxy: host Nginx на сервере
- frontend внутри Docker раздаёт статическую production-сборку
- backend и `celery_worker` запускаются из собранного image без bind-mount исходников

Реальные секреты должны храниться только в `infra/.env` на сервере и не должны попадать в tracked-файлы репозитория.

## 4. Быстрая диагностика сервера

### ОС, CPU, RAM, диск

```bash
uname -a
lsb_release -a || cat /etc/os-release
nproc
free -h
df -h
```

### Docker и Compose

```bash
docker --version
docker compose version
docker info
```

### Какие порты реально слушаются

```bash
sudo ss -tulpn | egrep ':(22|80|443|3000|3001|5432|5672|6379|8000|9000|9001|9090|15672)\b'
```

В production наружу обычно должны смотреть только:

- `22/tcp`
- `80/tcp`
- `443/tcp`

Порты `5432`, `6379`, `5672`, `15672`, `9000`, `9001`, `9090`, `3001`, `8000`, `3000` лучше не открывать в интернет.

### Firewall

Если используется `ufw`:

```bash
sudo ufw status numbered
```

Желаемое состояние:

- разрешён `OpenSSH`
- разрешены `80/tcp`
- разрешены `443/tcp`

### Nginx

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx -n 200 --no-pager
```

### Docker-сервисы проекта

```bash
cd /root/resonans-sound/infra
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
docker compose logs postgres --tail=100
docker compose logs redis --tail=100
docker compose logs rabbitmq --tail=100
docker compose logs minio --tail=100
```

### Проверка HTTP endpoint-ов

```bash
curl -I http://127.0.0.1
curl http://127.0.0.1:8000/api/v1/health
curl -I https://resonance-sound.ru/
curl -I https://resonance-sound.ru/login
curl https://resonance-sound.ru/api/v1/health
```

Ожидаемый ответ healthcheck:

```json
{"status":"healthy","version":"1.0.0"}
```

### Проверка bootstrap для Celery worker

```bash
cd /root/resonans-sound/infra
docker compose exec backend python -c "from app.tasks import smoke_check; result = smoke_check.delay(); print(result.get(timeout=30))"
```

Ожидаемый ответ:

```python
{'status': 'ok', 'broker': 'rabbitmq', 'result_backend': 'redis'}
```

### Проверка PostgreSQL / Redis / RabbitMQ / MinIO

```bash
cd /root/resonans-sound/infra
docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose exec redis redis-cli ping
docker compose exec rabbitmq rabbitmq-diagnostics -q ping
curl -f http://127.0.0.1:9000/minio/health/live
```

## 5. Деплой и обновление

Рекомендуемая последовательность обновления production:

```bash
cd /root/resonans-sound
git pull origin main
cd infra
test -f .env || cp .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
curl -I https://resonance-sound.ru/
curl -I https://resonance-sound.ru/login
curl https://resonance-sound.ru/api/v1/health
```

Если меняются только backend, frontend или celery worker:

```bash
cd /root/resonans-sound/infra
docker compose up -d --build backend frontend celery_worker
```

## 6. Важные проектные риски

### Не держите два публичных Nginx на 80/443

Если на сервере уже работает host Nginx через systemd, именно он должен обслуживать `80/443`.
Контейнерный Nginx не должен пытаться публиковать эти порты наружу.

Проверка:

```bash
sudo ss -tulpn | egrep ':(80|443)\b'
```

### Не храните production-секреты в репозитории

Все реальные значения должны жить в `/root/resonans-sound/infra/.env`.
В tracked-файлах должны оставаться только шаблоны и безопасные placeholder-значения.

### Frontend должен ходить в API через тот же домен

Для production используется:

```bash
VITE_API_URL=/api/v1
```

Это позволяет браузеру работать через тот же домен и host Nginx.

## 7. SSL через Let's Encrypt

Рекомендуемая схема: SSL завершает host Nginx, а приложение работает в Docker за ним.

### Установка Certbot на Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Шаблон Nginx-конфига

В репозитории есть пример:

- [`infra/nginx.host.example.conf`](./infra/nginx.host.example.conf)

Скопируйте его в `/etc/nginx/sites-available/YOUR_DOMAIN`, замените домены и upstream-порты, затем включите сайт:

```bash
sudo ln -s /etc/nginx/sites-available/YOUR_DOMAIN /etc/nginx/sites-enabled/YOUR_DOMAIN
sudo nginx -t
sudo systemctl reload nginx
```

### Выпуск сертификата

```bash
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

### Проверка автопродления

```bash
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

## 8. Что реально реализовано в проекте сейчас

Судя по коду, проект задуман как аудиоплатформа с загрузкой, хранением, конвертацией и стримингом треков, но текущее состояние пока раннее:

- в `backend/app/main.py` активны root, health, `GET /api/v1/categories`, `GET /api/v1/tracks` и `GET /api/v1/tracks/{id}`
- auth, playlists, interactions и admin router-ы пока не подключены
- модели БД и схемы уже довольно подробно подготовлены
- frontend сейчас минимальный и проверяет доступность backend
- production frontend уже переведён на статическую сборку и раздаётся через Nginx в контейнере
- backend в production не должен запускаться через `uvicorn --reload`
- `celery_worker` поднимается через `app.celery`; для быстрой проверки доступна smoke task `app.tasks.smoke_check`

## 9. Что прислать для следующего шага

Если понадобится дополнительная диагностика, полезно прислать вывод:

```bash
sudo ss -tulpn | egrep ':(80|443|8000|3000|5432|6379|5672|9000|9001|9090|15672)\b'
sudo nginx -t
sudo systemctl status nginx --no-pager
cd /root/resonans-sound/infra && docker compose ps
curl -I https://resonance-sound.ru/
curl -I https://resonance-sound.ru/login
curl https://resonance-sound.ru/api/v1/health
```

По ним уже можно точно понять:

- кто держит `80/443`
- корректно ли обновился docker-стек
- жив ли backend
- правильно ли отдаётся frontend после деплоя
