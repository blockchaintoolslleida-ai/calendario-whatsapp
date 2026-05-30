@echo off
cd /d "%~dp0"

set NODE_DIR=%USERPROFILE%\.local\nodejs\node-v22.14.0-win-x64
set PATH=%NODE_DIR%;%PATH%

echo ============================================
echo   Calendario-WhatsApp (OpenWA + Servicio)
echo ============================================
echo.

:: --- Iniciar OpenWA en segundo plano ---
echo [1/2] Iniciando OpenWA...
set OPENWA_DIR=%USERPROFILE%\openwa

if not exist "%OPENWA_DIR%\node_modules\" (
    echo ERROR: OpenWA no esta instalado.
    echo Ejecuta en PowerShell:
    echo   cd %USERPROFILE%\openwa
    echo   $env:Path = "%NODE_DIR%;" + $env:Path
    echo   npm install
    pause
    exit /b 1
)

cd /d "%OPENWA_DIR%"
start "OpenWA" cmd /c "set PATH=%NODE_DIR%;%%PATH%% && npm run dev 2>&1"
echo    OpenWA iniciado en segundo plano.
echo    Dashboard: http://localhost:2886 (primera vez: escanear QR)
echo    API:       http://localhost:2785

:: Esperar a que OpenWA este listo
echo    Esperando a que OpenWA este listo...
set /a TRIES=0
:wait_openwa
timeout /t 2 >nul
curl -s http://localhost:2785 >nul 2>&1
if %errorlevel% equ 0 goto openwa_ready
set /a TRIES+=1
if %TRIES% lss 15 goto wait_openwa
echo    ADVERTENCIA: OpenWA no responde. Revisa la ventana OpenWA.
echo    Si es la primera vez, abre http://localhost:2886 y escanea el QR.

:openwa_ready
echo    OpenWA listo.

:: --- Iniciar servicio de recordatorios ---
echo.
echo [2/2] Iniciando servicio de recordatorios...
cd /d "%~dp0"
call npx ts-node src/index.ts

pause
