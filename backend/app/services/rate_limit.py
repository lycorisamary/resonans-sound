from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from threading import Lock
import time

from fastapi import Request
from redis import Redis
from redis.exceptions import RedisError
import structlog

from app.core.config import settings
from app.core.metrics import RATE_LIMIT_HITS
from app.exceptions import RateLimitExceededError


logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class RateLimit:
    max_requests: int
    window_seconds: int


class FixedWindowRateLimiter:
    def __init__(self) -> None:
        self._memory_counts: dict[str, tuple[int, int]] = {}
        self._memory_lock = Lock()
        self._redis_client: Redis | None = None
        self._redis_disabled = False

    def reset(self) -> None:
        with self._memory_lock:
            self._memory_counts.clear()
        self._redis_client = None
        self._redis_disabled = False

    def check(self, *, scope: str, subject: str, limit: RateLimit) -> int:
        if not settings.RATE_LIMIT_ENABLED or limit.max_requests <= 0:
            return 0

        now = int(time.time())
        window = max(1, int(limit.window_seconds))
        retry_after = window - (now % window)
        bucket = now // window
        key = self._build_key(scope=scope, subject=subject, bucket=bucket)

        count = self._increment(key=key, expires_in=retry_after + 1)
        if count <= limit.max_requests:
            return count

        RATE_LIMIT_HITS.labels(scope=scope).inc()
        logger.warning(
            "rate_limit_exceeded",
            scope=scope,
            subject_hash=self._hash_subject(subject),
            limit=limit.max_requests,
            window_seconds=window,
            retry_after_seconds=retry_after,
        )
        raise RateLimitExceededError(retry_after)

    def _build_key(self, *, scope: str, subject: str, bucket: int) -> str:
        return f"rate_limit:{scope}:{self._hash_subject(subject)}:{bucket}"

    def _hash_subject(self, subject: str) -> str:
        return sha256(subject.encode("utf-8")).hexdigest()

    def _increment(self, *, key: str, expires_in: int) -> int:
        redis_client = self._get_redis_client()
        if redis_client is not None:
            try:
                pipeline = redis_client.pipeline(transaction=True)
                pipeline.incr(key)
                pipeline.expire(key, expires_in)
                count, _ = pipeline.execute()
                return int(count)
            except RedisError:
                self._redis_disabled = True
                logger.warning("rate_limit_redis_unavailable", exc_info=True)

        return self._increment_memory(key=key, expires_in=expires_in)

    def _increment_memory(self, *, key: str, expires_in: int) -> int:
        expires_at = int(time.time()) + expires_in
        now = int(time.time())

        with self._memory_lock:
            stale_keys = [
                stored_key
                for stored_key, (_, stored_expires_at) in self._memory_counts.items()
                if stored_expires_at <= now
            ]
            for stale_key in stale_keys:
                self._memory_counts.pop(stale_key, None)

            count, stored_expires_at = self._memory_counts.get(key, (0, expires_at))
            if stored_expires_at <= now:
                count = 0
                stored_expires_at = expires_at

            count += 1
            self._memory_counts[key] = (count, stored_expires_at)
            return count

    def _get_redis_client(self) -> Redis | None:
        if self._redis_disabled or settings.ENV == "test":
            return None
        if self._redis_client is not None:
            return self._redis_client

        redis_url = settings.RATE_LIMIT_REDIS_URL or settings.REDIS_URL
        if not redis_url:
            return None

        self._redis_client = Redis.from_url(redis_url, decode_responses=True)
        return self._redis_client


rate_limiter = FixedWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first_forwarded_ip = forwarded_for.split(",", 1)[0].strip()
        if first_forwarded_ip:
            return first_forwarded_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def ip_subject(request: Request) -> str:
    return f"ip:{get_client_ip(request)}"


def user_subject(user_id: int) -> str:
    return f"user:{user_id}"


def token_subject(token: str) -> str:
    return f"token:{sha256(token.encode('utf-8')).hexdigest()}"


def user_or_ip_subject(request: Request, user_id: int | None) -> str:
    if user_id is not None:
        return user_subject(user_id)
    return ip_subject(request)


def enforce_rate_limit(
    *,
    request: Request,
    scope: str,
    subject: str,
    limit: RateLimit,
) -> None:
    rate_limiter.check(scope=scope, subject=subject, limit=limit)
