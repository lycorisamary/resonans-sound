FROM python:3.11-slim

# Install system dependencies including FFmpeg for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpq-dev \
    python3-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Upgrade pip and core tools before installing dependencies
RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
