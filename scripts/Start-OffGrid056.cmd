@echo off
setlocal
cd /d "%~dp0.."
set "BUSINESS_EDITION=offgrid056"
set "DATA_DIR=%CD%\.local-data\offgrid056"
set "PORT=4000"
set "WEB_PORT=5173"
set "PUBLIC_URL=http://127.0.0.1:5173"
set "API_PROXY_TARGET=http://127.0.0.1:4000"
echo Starting the OffGrid056 prototype at http://127.0.0.1:5173
echo Keep this window open while testing. Press Ctrl+C to stop.
if /I not "%PROCONNECT_NO_BROWSER%"=="1" start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://127.0.0.1:5173'"
npm run dev
