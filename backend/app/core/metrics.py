from prometheus_client import Counter, Histogram


REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

AUTH_FAILURES = Counter(
    "auth_failures_total",
    "Authentication failures",
    ["reason"],
)

RATE_LIMIT_HITS = Counter(
    "rate_limit_hits_total",
    "Rate limit rejections",
    ["scope"],
)

TRACK_UPLOAD_EVENTS = Counter(
    "track_upload_events_total",
    "Track upload attempts by outcome",
    ["kind", "outcome"],
)

TRACK_PROCESSING_EVENTS = Counter(
    "track_processing_events_total",
    "Track processing task outcomes",
    ["outcome"],
)

TRACK_PROCESSING_LATENCY = Histogram(
    "track_processing_duration_seconds",
    "Track processing task latency in seconds",
)

TRACK_STREAM_ERRORS = Counter(
    "track_stream_errors_total",
    "Track stream failures",
    ["route", "reason"],
)

TRACK_PLAY_EVENTS = Counter(
    "track_play_events_total",
    "Track play-event outcomes",
    ["outcome"],
)
