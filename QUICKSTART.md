# Audio Platform - Quick Start Guide

## Prerequisites

- Docker & Docker Compose installed
- Git (optional, for version control)
- At least 4GB RAM available
- 10GB free disk space

## Quick Start

### 1. Clone and Navigate

```bash
cd /workspace
```

### 2. Start All Services

```bash
cd infra
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- RabbitMQ message queue
- MinIO object storage
- FastAPI backend
- Celery worker
- React frontend
- Nginx reverse proxy
- Prometheus monitoring
- Grafana dashboards

### 3. Wait for Services to Initialize

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

Wait until all services show "healthy" status (approximately 1-2 minutes).

### 4. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost | Auto-login or register |
| API Docs | http://localhost/api/docs | - |
| Admin Panel | http://localhost/admin | admin@audioplatform.com / admin123 |
| MinIO Console | http://localhost:9001 | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `infra/.env` |
| RabbitMQ Management | http://localhost:15672 | `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` from `infra/.env` |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin / admin |

### 5. Default Admin Account

**IMPORTANT**: Change these credentials immediately in production!

- Email: `admin@audioplatform.com`
- Password: `admin123`
- Role: Admin

## Development Mode

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

Copy the infrastructure env template and customize it:

```bash
cd infra
cp .env.example .env
```

### Changing Default Passwords

Edit `infra/.env` and change:
- `POSTGRES_PASSWORD`
- `RABBITMQ_DEFAULT_PASS`
- `MINIO_ROOT_PASSWORD`
- `MINIO_SECRET_KEY`
- `SECRET_KEY`
- `GF_SECURITY_ADMIN_PASSWORD`

Then recreate containers:

```bash
docker compose config
docker compose up -d --build
```

## Common Tasks

### Upload Your First Track

1. Login to the application
2. Navigate to "Upload" page
3. Select MP3 or WAV file (max 100MB)
4. Fill in track details (title, genre, etc.)
5. Click "Upload"
6. Wait for processing (conversion and waveform generation)

### Create a Playlist

1. Go to any track page
2. Click "Add to Playlist"
3. Create new playlist or add to existing
4. Access playlists from your profile

### Admin Moderation

1. Login as admin
2. Navigate to `/admin` panel
3. View pending tracks in moderation queue
4. Approve or reject tracks
5. Manage users and categories

## Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose logs [service_name]

# Restart specific service
docker-compose restart [service_name]

# Rebuild containers
docker-compose up -d --build
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Port Conflicts

If ports are already in use, edit `infra/docker-compose.yml` and change port mappings:

```yaml
ports:
  - "8080:80"  # Change host port from 80 to 8080
```

### MinIO Bucket Not Created

The bucket should be auto-created on first upload. To manually create:

```bash
# Access MinIO console at http://localhost:9001
# Navigate to Buckets > Create Bucket > audio-tracks
```

## Monitoring

### View Metrics

- Prometheus: http://localhost:9090
- Grafana Dashboards: http://localhost:3001

### Key Metrics to Monitor

- API response times
- Request rates
- Error rates
- Active streams
- Database connections
- Cache hit rates
- Queue lengths

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Backup and Restore

### Backup Database

```bash
docker exec audio_platform_db pg_dump -U audioplatform audio_platform > backup.sql
```

### Restore Database

```bash
docker exec -i audio_platform_db psql -U audioplatform audio_platform < backup.sql
```

### Backup MinIO Data

MinIO data is stored in Docker volume `minio_data`. Backup the volume:

```bash
docker run --rm \
  -v audio_platform_minio_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup.tar.gz /data
```

## Production Deployment

For production deployment:

1. Change all default passwords
2. Use HTTPS/TLS certificates
3. Configure proper domain names
4. Set up external database (not Docker volume)
5. Use managed Redis and RabbitMQ services
6. Configure CDN for audio delivery
7. Set up proper monitoring and alerting
8. Enable database backups
9. Configure rate limiting
10. Review security settings

See `DEPLOYMENT.md` for detailed production instructions.

## Support

For issues and questions:
- Check documentation in README.md
- Review API docs at http://localhost/api/docs
- Check logs for error messages
- Ensure all services are healthy

## License

MIT License - See LICENSE file for details.
