FROM python:3.11-alpine3.22

# Set working directory
WORKDIR /app

# Install build dependencies and git
RUN apk add --no-cache gcc musl-dev libffi-dev git && \
    apk upgrade --no-cache

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

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