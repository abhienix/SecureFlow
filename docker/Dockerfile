FROM python:3.11-alpine3.22

# Set working directory
WORKDIR /app

# Install build dependencies and git, upgrade all Alpine packages
RUN apk add --no-cache gcc musl-dev libffi-dev git && \
    apk upgrade --no-cache --available

# Copy requirements and install Python dependencies with pinned security fixes
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade \
    "pip>=26.1.2" \
    "setuptools>=83.0.0" \
    "wheel>=0.46.2" && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --upgrade \
    "jaraco.context>=6.1.0"

# Copy application code and policy
COPY backend/ .
COPY policy.yaml /policy.yaml

# Create non-root user and adjust permissions
RUN adduser -D appuser && \
    chown -R appuser:appuser /app /policy.yaml

EXPOSE 8000
USER appuser

# Default command
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]