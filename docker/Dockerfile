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

# INTENTIONALLY using old base image for Trivy testing
FROM ubuntu:18.04

WORKDIR /app

# Add known vulnerable system packages (for CVE detection)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    tar \
    openssl \
    libssl1.0.0 \
    libcurl3

COPY . .

CMD ["echo", "SecureFlow Trivy test running"]