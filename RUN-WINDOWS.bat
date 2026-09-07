@echo off
title AC-ITS E-Comic
cd /d "%~dp0"
echo ==========================================
echo       AC-ITS E-COMIC - STARTER
echo ==========================================
echo.
if not exist node_modules (
  echo [1/2] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Gagal menjalankan npm install.
    pause
    exit /b 1
  )
)
echo.
echo [2/2] Starting development server...
echo Browser: http://localhost:5173
echo Tekan Ctrl+C untuk menghentikan server.
echo.
call npm run dev
pause
