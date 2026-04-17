# Диагностика сервера и SSL для `resonans-sound`

Этот документ привязан к текущему репозиторию и помогает проверить, готов ли сервер к запуску проекта, а также правильно включить HTTPS.

## 1. Что требует проект

По [`infra/docker-compose.yml`](./infra/docker-compose.yml) проект рассчитывает на такой стек:

- `postgres` для основной БД
- `redis` для кеша
- `rabbitmq` для очередей
- `minio` для хранения аудиофайлов
- `backend` на FastAPI
- `celery_worker` для фоновой обработки аудио
- `frontend` на React/Vite
- `nginx` как reverse proxy
- `prometheus` и `grafana` для мониторинга

По [`backend/Dockerfile`](./backend/Dockerfile) backend ожидает Linux-окружение с `ffmpeg`.

## 2. Рекомендуемые ресурсы сервера

Оценка ниже сделана по составу сервисов в репозитории.

Минимум для тестового прод-сервера:

- 2 vCPU
- 4 GB RAM
- 25-30 GB SSD

Рекомендуемо для нормальной работы всего стека из `docker-compose`:

- 4 vCPU
- 8 GB RAM
- 40+ GB SSD

Если Prometheus, Grafana, MinIO и RabbitMQ действительно нужны на том же сервере, лучше ориентироваться именно на рекомендованный вариант.

## 3. Быстрая диагностика сервера

Все команды ниже предполагают Linux-сервер с Docker и Nginx.

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

В проде наружу обычно должны смотреть только:

- `22/tcp` для SSH
- `80/tcp` для HTTP и получения сертификата
- `443/tcp` для HTTPS

Порты `5432`, `6379`, `5672`, `15672`, `9000`, `9001`, `9090`, `3001`, `8000`, `3000` лучше не открывать в интернет.

### Firewall

Если используется `ufw`:

```bash
sudo ufw status numbered
```

Желаемое состояние:

- разрешены `OpenSSH`
- разрешены `80/tcp`
- разрешены `443/tcp`
- всё остальное либо закрыто, либо ограничено внутренней сетью

### Nginx

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx -n 200 --no-pager
```

### Docker-сервисы проекта

Из корня репозитория:

```bash
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs backend --tail=200
docker compose -f infra/docker-compose.yml logs frontend --tail=200
docker compose -f infra/docker-compose.yml logs nginx --tail=200
docker compose -f infra/docker-compose.yml logs postgres --tail=100
docker compose -f infra/docker-compose.yml logs redis --tail=100
docker compose -f infra/docker-compose.yml logs rabbitmq --tail=100
docker compose -f infra/docker-compose.yml logs minio --tail=100
```

### Проверка HTTP-эндпоинтов

```bash
curl -I http://127.0.0.1
curl http://127.0.0.1/api/v1/health
curl -I http://YOUR_DOMAIN
curl -I https://YOUR_DOMAIN
```

Ожидаемо backend должен отдавать:

```json
{"status":"healthy","version":"1.0.0"}
```

### Проверка PostgreSQL / Redis / RabbitMQ / MinIO

```bash
docker compose -f infra/docker-compose.yml exec postgres pg_isready -U audioplatform
docker compose -f infra/docker-compose.yml exec redis redis-cli ping
docker compose -f infra/docker-compose.yml exec rabbitmq rabbitmq-diagnostics -q ping
curl -f http://127.0.0.1:9000/minio/health/live
```

## 4. Важные проектные риски, которые стоит проверить

### Не держите одновременно два Nginx на 80/443

В репозитории уже есть контейнерный `nginx`, который хочет слушать `80:80` и `443:443`.

Если у вас на сервере установлен host Nginx через `apt`, нужно выбрать одну схему:

- либо host Nginx обслуживает `80/443`, а Docker-контейнер `nginx` не публикует эти порты
- либо Docker Nginx обслуживает `80/443`, а systemd-сервис `nginx` на хосте выключен

Проверка:

```bash
sudo ss -tulpn | egrep ':(80|443)\b'
```

### Для продакшена сейчас наружу опубликовано слишком много портов

В текущем `docker-compose` наружу проброшены БД, Redis, RabbitMQ, MinIO, Prometheus и Grafana. Для продакшена это нужно либо убрать из `ports`, либо закрыть firewall.

### Frontend должен ходить в API через тот же домен

В коде frontend базовый API URL теперь по умолчанию выставлен как `/api/v1`, а не `http://localhost:8000/api/v1`. Это нужно, чтобы браузер на проде не пытался обращаться к своему локальному `localhost`.

Если вы всё же захотите задавать адрес явно, используйте:

```bash
VITE_API_URL=https://YOUR_DOMAIN/api/v1
```

## 5. SSL через Let's Encrypt

Ниже рекомендуемая схема: SSL завершает **host Nginx**, а приложение работает в Docker за ним.

### Предварительные условия

- домен уже указывает на IP сервера
- открыты `80/tcp` и `443/tcp`
- только один процесс слушает `80/443`
- `nginx -t` проходит без ошибок

### Установка Certbot на Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Шаблон Nginx-конфига

В репозитории добавлен пример:

- [`infra/nginx.host.example.conf`](./infra/nginx.host.example.conf)

Скопируйте его в `/etc/nginx/sites-available/YOUR_DOMAIN`, замените:

- `YOUR_DOMAIN`
- `www.YOUR_DOMAIN`
- при необходимости upstream-порты

Потом включите сайт:

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

## 6. Что реально реализовано в проекте сейчас

Судя по коду, проект задуман как платформа для публикации и стриминга аудио:

- загрузка треков
- хранение аудио в S3-совместимом хранилище
- конвертация в несколько битрейтов
- стриминг
- плейлисты
- лайки, комментарии, подписки
- админка и модерация

Но фактическое состояние репозитория пока раннее:

- в `backend/app/main.py` реально есть только root и health endpoint
- роутеры API там закомментированы
- модели БД уже довольно подробно описаны
- frontend-клиент API написан как заготовка, но сам UI ещё не собран

## 7. Что прислать для следующего шага

Если хотите, следующим сообщением можно прислать вывод этих команд:

```bash
sudo ss -tulpn | egrep ':(80|443|8000|3000|5432|6379|5672|9000|9001|9090|15672)\b'
sudo nginx -t
sudo systemctl status nginx --no-pager
docker compose -f infra/docker-compose.yml ps
curl -I http://YOUR_DOMAIN
curl -I https://YOUR_DOMAIN
curl http://127.0.0.1/api/v1/health
```

По ним уже можно будет точно сказать:

- кто у вас держит `80/443`
- где именно ставить сертификат
- какие порты надо закрыть
- что из проекта реально работает на сервере прямо сейчас
