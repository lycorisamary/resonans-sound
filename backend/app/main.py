from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
import time
import structlog

from app.core.config import settings
from app.db.session import engine, Base
from app.models import User, Category, Track  # Import models to create tables

# Import currently active routers
from app.api import categories, tracks


# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level = 20
    context_class=dict, 
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint']
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting up Audio Platform API")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Audio Platform API")
    engine.dispose()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Audio streaming platform for MP3 and WAV files",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware for logging and metrics
@app.middleware("http")
async def log_and_metrics(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Log request
    process_time = time.time() - start_time
    logger.info(
        "request_processed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=process_time,
    )
    
    # Record metrics
    if request.url.path != "/metrics":
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(process_time)
    
    return response


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Health check endpoint
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
    }


@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Expose Prometheus metrics without a trailing-slash redirect."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Include currently active routers
app.include_router(categories.router, prefix=f"{settings.API_PREFIX}/categories", tags=["Categories"])
app.include_router(tracks.router, prefix=f"{settings.API_PREFIX}/tracks", tags=["Tracks"])

# Include routers planned for later phases
# app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])
# app.include_router(users.router, prefix=f"{settings.API_PREFIX}/users", tags=["Users"])
# app.include_router(playlists.router, prefix=f"{settings.API_PREFIX}/playlists", tags=["Playlists"])
# app.include_router(interactions.router, prefix=f"{settings.API_PREFIX}/interactions", tags=["Interactions"])
# app.include_router(admin.router, prefix=f"{settings.API_PREFIX}/admin", tags=["Admin"])


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "redoc": "/api/redoc",
        "health": "/api/v1/health",
        "metrics": "/metrics" if settings.PROMETHEUS_ENABLED else None,
        "categories": "/api/v1/categories",
        "category_detail_example": "/api/v1/categories/beats",
        "tracks": "/api/v1/tracks",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
