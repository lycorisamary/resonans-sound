# Диагностика production-сервера

Этот документ отражает актуальную production-схему `resonans-sound`.

## 1. Текущая production topology

На сервере сейчас правильной считается такая схема:

- код проекта: `/root/resonans-sound`
- Docker Compose запускается из `/root/resonans-sound/infra`
- production env: `/root/resonans-sound/infra/.env`
- host Nginx обслуживает `80/443`
- `/` проксируется на `127.0.0.1:3000`
- `/api/` проксируется на `127.0.0.1:8000`

Важно:

- frontend внутри Docker раздаёт статический production build
- backend и Celery запускаются из image, без возврата к dev-схеме
- лишние внешние Docker-порты не должны быть опубликованы

## 2. Что должно быть доступно снаружи

Обычно наружу должны торчать только:

- `22/tcp`
- `80/tcp`
- `443/tcp`

Проверка:

```bash
sudo ss -tulpn | egrep ':(22|80|443|3000|8000|5432|6379|5672|9000|15672)\b'
```

Ожидание:

- `80/443` слушает host Nginx
- `3000` и `8000` привязаны только к `127.0.0.1`
- `5432`, `6379`, `5672`, `9000`, `15672` не должны быть опубликованы наружу

## 3. Базовая диагностика хоста

```bash
uname -a
lsb_release -a || cat /etc/os-release
nproc
free -h
df -h
docker --version
docker compose version
docker info
```

## 4. Проверка host Nginx

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx -n 200 --no-pager
```

Шаблон host-конфига лежит в репозитории:

- [`../infra/nginx.host.example.conf`](../infra/nginx.host.example.conf)

## 5. Проверка docker-стека проекта

```bash
cd /root/resonans-sound/infra
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
docker compose logs celery_worker --tail=200
docker compose logs postgres --tail=100
docker compose logs rabbitmq --tail=100
docker compose logs minio --tail=100
```

## 6. Проверка public HTTP/HTTPS

```bash
curl -I https://resonance-sound.ru/
curl https://resonance-sound.ru/api/v1/health
curl -I http://127.0.0.1:3000/
curl http://127.0.0.1:8000/api/v1/health
```

Ожидаемый health:

```json
{"status":"healthy","version":"1.0.0"}
```

## 7. Проверка внутренних сервисов

```bash
cd /root/resonans-sound/infra
docker compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose exec -T redis redis-cli ping
docker compose exec -T rabbitmq rabbitmq-diagnostics -q ping
docker compose exec -T minio sh -lc 'curl -f http://localhost:9000/minio/health/live'
```

Такой способ важен, потому что MinIO не должен публиковаться наружу отдельным
портом на хосте.

## 8. Рекомендуемый deploy flow

Полный безопасный путь обновления:

```bash
cd /root/resonans-sound
git pull --ff-only origin main
cd infra
docker compose build backend celery_worker frontend
docker compose run --rm backend pytest -q tests
docker compose up -d backend celery_worker frontend
docker compose ps
curl https://resonance-sound.ru/api/v1/health
```

Если изменился только один сервис, можно собирать точечно, но после этого всё
равно стоит проверить `health`, frontend и нужный продуктовый flow.

## 9. Что важно не сломать

- не переводить production frontend обратно на dev server
- не публиковать лишние порты наружу
- не хранить реальные секреты в git
- не подменять host Nginx контейнерным Nginx на `80/443`

## 10. SSL и Certbot

Рекомендуемая схема не менялась:

- SSL завершается на host Nginx
- приложение живёт за ним в Docker

Проверка Certbot:

```bash
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

## 11. Что прислать для быстрой диагностики

Если нужно быстро продолжить дебаг, полезно прислать:

```bash
sudo ss -tulpn | egrep ':(80|443|3000|8000|5432|6379|5672|9000|15672)\b'
sudo nginx -t
sudo systemctl status nginx --no-pager
cd /root/resonans-sound/infra && docker compose ps
cd /root/resonans-sound/infra && docker compose logs backend --tail=200
curl -I https://resonance-sound.ru/
curl https://resonance-sound.ru/api/v1/health
```

По ним уже можно быстро понять:

- кто реально держит `80/443`
- жив ли backend
- корректно ли обновился frontend
- не сломалась ли reverse proxy схема
