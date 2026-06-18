@echo off
echo Starting SecureFlow...

echo Starting Docker containers...
docker-compose up -d

echo Waiting for PostgreSQL to be ready...
timeout /t 5

echo Starting FastAPI server...
cd backend
call venv\Scripts\activate
start cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000"

echo.
echo SecureFlow is running!
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.
pause