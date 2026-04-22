from contextlib import asynccontextmanager
import time
from uuid import uuid4

import structlog
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.config import settings
from app.core.logging import configure_structured_logging
from app.core.metrics import REQUEST_COUNT, REQUEST_LATENCY
from app.db.schema import validate_schema_revision
from app.db.session import engine
from app.exceptions import DomainError, RateLimitExceededError

# Import currently active routers
from app.api import admin, auth, categories, collections, interactions, tracks, users


configure_structured_logging()

logger = structlog.get_logger()

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
}


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
    for header_name, header_value in SECURITY_HEADERS.items():
        response.headers.setdefault(header_name, header_value)
    
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


def _error_headers(request_id: str | None, extra_headers: dict[str, str] | None = None) -> dict[str, str] | None:
    headers = dict(extra_headers or {})
    if request_id:
        headers["X-Request-ID"] = request_id
    for header_name, header_value in SECURITY_HEADERS.items():
        headers.setdefault(header_name, header_value)
    return headers or None


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
    extra_headers = None
    if isinstance(exc, RateLimitExceededError):
        extra_headers = {"Retry-After": str(exc.retry_after_seconds)}

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=_error_headers(request_id, extra_headers),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    message = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    headers = dict(exc.headers or {})

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_payload(
            code=f"http_{exc.status_code}",
            message=message,
            request_id=request_id,
            details=None if isinstance(exc.detail, str) else exc.detail,
        ),
        headers=_error_headers(request_id, headers),
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
        headers=_error_headers(request_id),
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
        headers=_error_headers(request_id),
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
app.include_router(collections.router, prefix=f"{settings.API_PREFIX}/collections", tags=["Collections"])
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
        "collections": "/api/v1/collections",
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
