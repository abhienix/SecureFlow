FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create chromadb storage folder and non-root appuser
RUN mkdir -p /data/chromadb && \
    useradd -u 10001 -m appuser && \
    chown -R appuser:appuser /app /data/chromadb

# Copy application source
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
