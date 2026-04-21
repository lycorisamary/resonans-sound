from contextlib import asynccontextmanager
import time
from uuid import uuid4

import structlog
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.core.config import settings
from app.db.schema import validate_schema_revision
from app.db.session import engine
from app.exceptions import DomainError

# Import currently active routers
from app.api import admin, auth, categories, interactions, tracks, users


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
    validate_schema_revision(engine)
    logger.info("Database schema revision verified")
    
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
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    request.state.request_id = request_id
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    try:
        response = await call_next(request)
    except Exception:
        structlog.contextvars.clear_contextvars()
        raise
    
    # Log request
    process_time = time.time() - start_time
    logger.info(
        "request_processed",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        process_time=process_time,
    )
    response.headers["X-Request-ID"] = request_id
    
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

    structlog.contextvars.clear_contextvars()
    return response


# Exception handlers
def _build_error_payload(
    *,
    code: str,
    message: str,
    request_id: str | None,
    details: object | None = None,
) -> dict:
    payload = {
        "code": code,
        "message": message,
        "request_id": request_id,
    }
    if details is not None:
        payload["details"] = jsonable_encoder(details)
    return payload


@app.exception_handler(DomainError)
async def domain_exception_handler(request: Request, exc: DomainError):
    request_id = getattr(request.state, "request_id", None)
    content = _build_error_payload(
        code=exc.code,
        message=exc.message,
        request_id=request_id,
        details=exc.details,
    )

    logger.warning(
        "domain_exception",
        request_id=request_id,
        path=request.url.path,
        code=exc.code,
        status_code=exc.status_code,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers={"X-Request-ID": request_id} if request_id else None,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    headers = dict(exc.headers or {})
    if request_id:
        headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_payload(
            code=f"http_{exc.status_code}",
            message=message,
            request_id=request_id,
            details=None if isinstance(exc.detail, str) else exc.detail,
        ),
        headers=headers or None,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=422,
        content=_build_error_payload(
            code="request_validation_error",
            message="Request validation error",
            request_id=request_id,
            details=exc.errors(),
        ),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception(
        "unhandled_exception",
        request_id=request_id,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content=_build_error_payload(
            code="internal_server_error",
            message="Internal server error",
            request_id=request_id,
        ),
        headers={"X-Request-ID": request_id} if request_id else None,
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
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])
app.include_router(categories.router, prefix=f"{settings.API_PREFIX}/categories", tags=["Categories"])
app.include_router(tracks.router, prefix=f"{settings.API_PREFIX}/tracks", tags=["Tracks"])
app.include_router(users.router, prefix=f"{settings.API_PREFIX}/users", tags=["Users"])
app.include_router(admin.router, prefix=f"{settings.API_PREFIX}/admin", tags=["Admin"])
app.include_router(interactions.router, prefix=f"{settings.API_PREFIX}/interactions", tags=["Interactions"])

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
        "auth": "/api/v1/auth/login",
        "me": "/api/v1/users/me",
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
