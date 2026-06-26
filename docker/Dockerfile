# FROM python:3.11-alpine3.22
# WORKDIR /app
# RUN apk add --no-cache gcc musl-dev libffi-dev && \
#     apk upgrade --no-cache
# COPY backend/requirements.txt .
# RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
#     pip install --no-cache-dir -r requirements.txt
# COPY backend/ .
# COPY policy.yaml /policy.yaml

# # Fixed permissions before dropping privileges
# RUN chown -R nobody:nobody /app /policy.yaml

# EXPOSE 8000
# USER nobody
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    wget \
    tar \
    libssl-dev \
    libcurl4

COPY backend/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY policy.yaml /policy.yaml

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]