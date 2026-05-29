@echo off
echo ============================================
echo   Calendario-WhatsApp Recordatorios
echo ============================================
echo.

cd /d "%~dp0"

:: --- Configurar Node.js portable ---
set NODE_DIR=%USERPROFILE%\.local\nodejs\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%

if not exist "%NODE_DIR%\node.exe" (
    echo Descargando Node.js portable...
    mkdir "%USERPROFILE%\.local\nodejs" 2>nul
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip' -OutFile '%USERPROFILE%\.local\nodejs\node.zip'" 2>nul
    if errorlevel 1 (
        echo Error al descargar Node.js. Comprueba tu conexion a internet.
        pause
        exit /b 1
    )
    echo Extrayendo Node.js...
    powershell -Command "Expand-Archive -Path '%USERPROFILE%\.local\nodejs\node.zip' -DestinationPath '%USERPROFILE%\.local\nodejs' -Force" 2>nul
    del "%USERPROFILE%\.local\nodejs\node.zip" 2>nul
    echo Node.js portable instalado.
)

echo Node.js:
call node --version 2>nul
if errorlevel 1 (
    echo ERROR: Node.js no encontrado en %NODE_DIR%
    pause
    exit /b 1
)

:: --- Instalar dependencias ---
if not exist "node_modules\" (
    echo Instalando dependencias npm...
    call npm install
    if errorlevel 1 (
        echo Error instalando dependencias.
        pause
        exit /b 1
    )
)

:: --- Verificar credenciales Google ---
if not exist "credentials\google-oauth.json" (
    echo.
    echo ========================================
    echo FALTA EL ARCHIVO DE CREDENCIALES GOOGLE
    echo ========================================
    echo.
    echo   1. Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts
    echo   2. Crea una Service Account
    echo   3. Descarga la clave JSON
    echo   4. Guardala como: credentials\google-oauth.json
    echo   5. Comparte tu calendario con el email de la service account
    echo.
    pause
    exit /b 1
)

:: --- Iniciar servicio ---
echo.
echo Iniciando servicio de recordatorios...
echo (primera ejecucion: escanear QR de WhatsApp)
echo.
call npx ts-node src/index.ts

pause
