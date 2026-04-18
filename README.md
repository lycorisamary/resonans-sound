# Audio Platform - Technical Specification Implementation

## Project Structure

```
/workspace
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core configuration
│   │   ├── db/             # Database connection
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   └── schemas/        # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React/Vue.js frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── infra/                  # Infrastructure configs
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── prometheus.yml
└── README.md
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Message Queue**: RabbitMQ
- **Storage**: MinIO (S3-compatible)
- **Audio Processing**: FFmpeg
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit / Zustand
- **Audio**: Web Audio API
- **UI Library**: Material-UI / Ant Design
- **Build Tool**: Vite

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **CDN**: Cloudflare (configuration ready)
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack ready

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);
```

### Tracks Table
```sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    category_id INTEGER REFERENCES categories(id),
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    original_url TEXT,
    mp3_128_url TEXT,
    mp3_320_url TEXT,
    waveform_data_json JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true
);
```

### Categories Table
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
```

### Playlists Table
```sql
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT true
);
```

### Playlist Tracks Table
```sql
CREATE TABLE playlist_tracks (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id),
    track_id INTEGER REFERENCES tracks(id),
    sort_order INTEGER DEFAULT 0,
    UNIQUE(playlist_id, track_id)
);
```

### Interactions Table
```sql
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    track_id INTEGER REFERENCES tracks(id),
    type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'repost'
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Logs Table
```sql
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);
```

## API Endpoints

Current live API surface in this repository:
- `GET /` - API info
- `GET /api/v1/health` - Health check
- `GET /api/v1/categories` - Active public categories with track counts
- `GET /api/v1/categories/:slug` - Active public category details
- `GET /api/v1/tracks` - Approved public tracks with pagination and simple filters
- `GET /api/v1/tracks/:id` - Approved public track details

Everything else below is still planned API surface, not fully implemented yet.

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - User logout

### Tracks
- `GET /api/v1/tracks` - List tracks with filtering
- `POST /api/v1/tracks` - Create track metadata
- `GET /api/v1/tracks/:id` - Get track details
- `PUT /api/v1/tracks/:id` - Update track
- `DELETE /api/v1/tracks/:id` - Delete track
- `POST /api/v1/tracks/upload` - Upload audio file
- `GET /api/v1/tracks/:id/stream` - Stream audio (Range requests)

### Categories
- `GET /api/v1/categories` - List categories
- `POST /api/v1/categories` - Create category (admin)
- `PUT /api/v1/categories/:id` - Update category (admin)
- `DELETE /api/v1/categories/:id` - Delete category (admin)

### Playlists
- `GET /api/v1/playlists` - List user playlists
- `POST /api/v1/playlists` - Create playlist
- `GET /api/v1/playlists/:id` - Get playlist details
- `PUT /api/v1/playlists/:id` - Update playlist
- `DELETE /api/v1/playlists/:id` - Delete playlist
- `POST /api/v1/playlists/:id/tracks` - Add track to playlist
- `DELETE /api/v1/playlists/:id/tracks/:trackId` - Remove track

### Interactions
- `POST /api/v1/interactions/like` - Like/unlike track
- `POST /api/v1/interactions/comment` - Add comment
- `POST /api/v1/interactions/repost` - Repost track
- `GET /api/v1/tracks/:id/comments` - Get track comments

### Admin
- `GET /api/v1/admin/stats` - Get system statistics
- `GET /api/v1/admin/users` - List users
- `PUT /api/v1/admin/users/:id` - Update user (ban, role change)
- `GET /api/v1/admin/moderation` - Get moderation queue
- `POST /api/v1/admin/moderate/:id` - Approve/reject track
- `GET /api/v1/admin/logs` - Get admin action logs

## Security Features

1. **Password Hashing**: Argon2id algorithm
2. **JWT Tokens**: 
   - Access token: 15 minutes
   - Refresh token: 7 days (httpOnly cookie)
3. **Rate Limiting**: 
   - Login: 5 attempts per minute
   - Upload: 10 files per hour
   - Streaming: 100 requests per minute
4. **File Validation**:
   - MIME type verification
   - Magic number signature check
   - Max size: 100MB
   - Allowed formats: MP3, WAV only
5. **SQL Injection Protection**: Parameterized queries via SQLAlchemy
6. **XSS Protection**: Input sanitization, Content-Security-Policy headers
7. **CSRF Protection**: Token validation for state-changing operations

## Streaming Implementation

### HTTP Range Requests
```python
# Support for partial content delivery
Headers:
- Accept-Ranges: bytes
- Content-Range: bytes start-end/total
- Content-Length: chunk_size
Status: 206 Partial Content
```

### Adaptive Bitrate
- Original file stored in S3
- Async conversion to MP3 128kbps and 320kbps
- Client selects quality based on connection speed
- CDN caching for popular tracks

## Performance Requirements

1. **Startup Time**: < 1 second to begin playback
2. **Concurrent Users**: Support 1000+ simultaneous streams
3. **Response Time**: API responses < 200ms (p95)
4. **Availability**: 99.9% uptime SLA

## Scalability Strategy

1. **Horizontal Scaling**: Multiple API instances behind load balancer
2. **CDN**: CloudFlare for static assets and audio files
3. **Database**: Read replicas for heavy read operations
4. **Caching**: Redis for sessions, popular tracks, categories
5. **Async Processing**: Celery workers for audio conversion
6. **Future**: HLS/DASH migration path ready

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Infrastructure setup (Docker, DB, Redis, MinIO)
- [ ] Basic authentication system
- [ ] User model and CRUD operations
- [ ] Category management

### Phase 2: Core Features (Weeks 3-4)
- [ ] Track upload and metadata management
- [ ] Audio file processing pipeline
- [ ] Basic streaming endpoint
- [ ] Search and filtering

### Phase 3: Media Processing (Weeks 5-6)
- [ ] FFmpeg integration for conversion
- [ ] Waveform generation
- [ ] Metadata extraction
- [ ] Quality variants creation

### Phase 4: Frontend (Weeks 7-9)
- [ ] Audio player component
- [ ] User dashboard
- [ ] Browse and search interface
- [ ] Playlist management

### Phase 5: Social Features (Weeks 10-11)
- [ ] Likes and comments
- [ ] Follow system
- [ ] Notifications
- [ ] Sharing functionality

### Phase 6: Admin Panel (Weeks 12-13)
- [ ] Admin dashboard
- [ ] Moderation tools
- [ ] Analytics and reporting
- [ ] User management

### Phase 7: Testing & Optimization (Weeks 14-15)
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Bug fixes

### Phase 8: Deployment (Week 16)
- [ ] Production environment setup
- [ ] Monitoring configuration
- [ ] Backup systems
- [ ] Documentation

## Monitoring & Observability

### Metrics (Prometheus)
- API response times
- Request rates by endpoint
- Error rates
- Active streams
- File upload rates
- Database query performance

### Logging (ELK Stack)
- Application logs
- Access logs
- Error tracking
- Audit trails

### Alerts
- High error rate (> 1%)
- Slow response times (> 500ms p95)
- Disk space warnings
- Service health checks

## Future Enhancements

1. **Payment Integration**: Stripe/PayPal for premium features
2. **Subscription Model**: Tiered access levels
3. **Mobile Apps**: iOS and Android native applications
4. **HLS Streaming**: Adaptive bitrate for mobile networks
5. **AI Features**: Auto-tagging, recommendation engine
6. **Live Streaming**: Real-time audio broadcasting
7. **Podcast Support**: RSS feed generation
8. **API Public Access**: Developer API with OAuth2

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Local Development
```bash
# Start infrastructure
cd infra
docker-compose up -d

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend setup
cd frontend
npm install
npm run dev
```

### Production Deployment

Current production layout:
- host Nginx terminates HTTPS and proxies traffic
- Docker Compose is run from `infra/`
- production configuration lives in `infra/.env` on the server

Recommended deploy flow:

```bash
cd /root/resonans-sound
git pull origin main
cd infra
test -f .env || cp .env.example .env
docker compose config
docker compose up -d --build
```

Production runtime notes:
- frontend is served as a static build from its own `nginx:alpine` container
- backend runs from the built image without a source bind mount
- backend is started without `uvicorn --reload`
- `celery_worker` now boots through `app.celery` and can be smoke-checked before the real audio pipeline exists

Recommended verification:

```bash
docker compose ps
curl -I https://resonance-sound.ru/
curl -I https://resonance-sound.ru/login
curl https://resonance-sound.ru/api/v1/health
docker compose exec backend python -c "from app.tasks import smoke_check; result = smoke_check.delay(); print(result.get(timeout=30))"
```

## License

MIT License - See LICENSE file for details.

## Contact

For questions and support, contact the development team.
