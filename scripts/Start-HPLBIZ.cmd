@echo off
setlocal
cd /d "%~dp0.."
set "BUSINESS_EDITION=hplbiz"
set "DATA_DIR=%CD%\.local-data\hplbiz"
set "PORT=4100"
set "WEB_PORT=5174"
set "PUBLIC_URL=http://127.0.0.1:5174"
set "API_PROXY_TARGET=http://127.0.0.1:4100"
echo Starting the independent HPLBIZ prototype at http://127.0.0.1:5174
echo Keep this window open while testing. Press Ctrl+C to stop.
if /I not "%PROCONNECT_NO_BROWSER%"=="1" start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://127.0.0.1:5174'"
npm run dev
