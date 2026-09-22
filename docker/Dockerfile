# ---- builder: compiles/installs Python deps into a venv ----
FROM python:3.11-alpine3.22 AS builder

WORKDIR /app

# Build-time only: gcc/musl-dev/libffi-dev are needed to compile any
# dependency that ships no musllinux wheel; git is needed by pip for
# some source installs. None of this ships in the final image.
RUN apk add --no-cache gcc musl-dev libffi-dev git

COPY backend/requirements.txt .
RUN python -m venv /venv && \
    /venv/bin/pip install --no-cache-dir --upgrade \
    "pip>=26.1.2" \
    "setuptools>=83.0.0" \
    "wheel>=0.46.2" && \
    /venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /venv/bin/pip install --no-cache-dir --upgrade \
    "jaraco.context>=6.1.0"

# ---- runtime: slim final image, no compilers, no pip cache ----
FROM python:3.11-alpine3.22

# Security patches for the base OS packages; no build tooling installed here.
RUN apk upgrade --no-cache --available

WORKDIR /app

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

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
