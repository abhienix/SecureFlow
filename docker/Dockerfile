FROM python:3.11-alpine
WORKDIR /app
RUN apk add --no-cache gcc musl-dev libffi-dev
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY policy.yaml /policy.yaml
EXPOSE 8000
USER nobody
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]