import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class Settings(BaseModel):
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")  # nosemgrep: generic-api-key,hardcoded-secret
    SECUREFLOW_API_URL: str = os.getenv("SECUREFLOW_API_URL", "https://your-cloudrun-backend-url.run.app")
    SECUREFLOW_API_TOKEN: str = os.getenv("SECUREFLOW_API_TOKEN", "")  # nosemgrep: generic-api-key,hardcoded-token
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    AI_SERVER_HOST: str = os.getenv("AI_SERVER_HOST", "0.0.0.0")
    AI_SERVER_PORT: int = int(os.getenv("AI_SERVER_PORT", "8100"))
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen2.5:3b")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "nomic-embed-text")
    CHROMADB_PATH: str = os.getenv("CHROMADB_PATH", "/data/chromadb")

settings = Settings()
