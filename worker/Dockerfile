FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    useradd -u 10001 -m workeruser

COPY --chown=workeruser:workeruser app ./app

ENV PYTHONPATH=/app

USER workeruser

CMD ["celery", "-A", "app.celery_app:celery", "worker", "--loglevel=info"]
