@echo off
chcp 65001 >nul
echo ============================================
echo   📅 Calendario-WhatsApp Recordatorios
echo ============================================
echo.

cd /d "%~dp0"

:: ── Configurar Node.js portable ──────────────
set NODE_DIR=%USERPROFILE%\.local\nodejs\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%

if not exist "%NODE_DIR%\node.exe" (
    echo ⬇️  Descargando Node.js portable...
    mkdir "%USERPROFILE%\.local\nodejs" 2>nul
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip' -OutFile '%USERPROFILE%\.local\nodejs\node.zip'" 2>nul
    if errorlevel 1 (
        echo ❌ Error al descargar Node.js. Conéctate a internet y reintenta.
        pause
        exit /b 1
    )
    echo 📦 Extrayendo Node.js...
    powershell -Command "Expand-Archive -Path '%USERPROFILE%\.local\nodejs\node.zip' -DestinationPath '%USERPROFILE%\.local\nodejs' -Force" 2>nul
    del "%USERPROFILE%\.local\nodejs\node.zip" 2>nul
    echo ✅ Node.js portable instalado.
)

:: ── Instalar dependencias ────────────────────
if not exist "node_modules\" (
    echo 📦 Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo ❌ Error instalando dependencias.
        pause
        exit /b 1
    )
)

:: ── Verificar credenciales Google ────────────
if not exist "credentials\google-oauth.json" (
    echo.
    echo ⚠️  FALTA EL ARCHIVO DE CREDENCIALES DE GOOGLE
    echo ─────────────────────────────────────────────
    echo.
    echo   1. Ve a https://console.cloud.google.com/apis/credentials
    echo   2. Crea un OAuth 2.0 Client ID (Desktop App)
    echo   3. Descarga el JSON
    echo   4. Guárdalo como:
    echo      credentials\google-oauth.json
    echo.
    echo   ¿Quieres abrir Google Cloud Console ahora? (S/N)
    set /p ABRIR=
    if /i "%ABRIR%"=="S" start https://console.cloud.google.com/apis/credentials
    pause
    exit /b 1
)

:: ── Iniciar servicio ─────────────────────────
echo.
echo 🚀 Iniciando servicio de recordatorios...
echo    (primera ejecución: autorizar Google + escanear QR WhatsApp)
echo.
call npx ts-node src/index.ts

pause
