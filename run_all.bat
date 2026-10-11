@echo off
title Nexora AI - Service Launcher
echo ========================================================
echo Launching Nexora AI Microservices and Frontend...
echo ========================================================

echo Starting Redis via Docker Compose...
start "Nexora AI - Redis" cmd /k "cd /d "%~dp0backend" && docker compose up"

echo Starting API Gateway (Port 8000)...
start "Nexora AI - Gateway (Port 8000)" cmd /k "cd /d "%~dp0backend\gateway" && npm run dev"

echo Starting Agent Service (Port 8003)...
start "Nexora AI - Agent Service (Port 8003)" cmd /k "cd /d "%~dp0backend\services\agent" && npm run dev"

echo Starting Auth Service (Port 8001)...
start "Nexora AI - Auth Service (Port 8001)" cmd /k "cd /d "%~dp0backend\services\auth" && npm run dev"

echo Starting Billing Service (Port 8004)...
start "Nexora AI - Billing Service (Port 8004)" cmd /k "cd /d "%~dp0backend\services\billing" && npm run dev"

echo Starting Chat Service (Port 8002)...
start "Nexora AI - Chat Service (Port 8002)" cmd /k "cd /d "%~dp0backend\services\chat" && npm run dev"

echo Starting Frontend (Port 5173)...
start "Nexora AI - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ========================================================
echo All Nexora AI services have been launched in separate terminal windows.
echo ========================================================
pause
