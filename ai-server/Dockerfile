# ---- Stage 1: Build virtual environment & compile C/C++ extensions ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install compilation dependencies (required for chromadb / hnswlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ---- Stage 2: Minimal runtime image (no compilers or build tools) ----
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install minimal runtime dependencies (curl for health check)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create chromadb storage folder and non-root appuser
RUN mkdir -p /data/chromadb && \
    useradd -u 10001 -m appuser && \
    chown -R appuser:appuser /app /data/chromadb

# Copy application source
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]

