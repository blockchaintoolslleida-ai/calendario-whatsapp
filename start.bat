@echo off
echo =====================================
echo   Calendario WhatsApp Recordatorios
echo =====================================
echo.

cd /d "%~dp0"

echo Instalando dependencias (si es necesario)...
call npm install --silent 2>nul

echo.
echo Iniciando servicio...
echo.

npx ts-node src/index.ts

pause
