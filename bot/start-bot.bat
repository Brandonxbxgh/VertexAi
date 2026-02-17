@echo off
REM Start Vertex arbitrage bot - keeps running until you close the window
cd /d "%~dp0"

REM Add Node to PATH if needed
set "NODE_PATH=C:\Program Files\nodejs"
if exist "%NODE_PATH%\node.exe" set "PATH=%NODE_PATH%;%PATH%"

echo Building and starting Vertex arbitrage bot...
call npm run build
if errorlevel 1 ( echo Build failed. pause & exit /b 1 )
echo.
echo Bot running. Press Ctrl+C to stop.
node dist/arbitrage.js
pause
