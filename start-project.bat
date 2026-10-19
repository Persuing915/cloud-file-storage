@echo off
title Cloud File Storage System - Starter
echo ==============================================
echo Starting Cloud File Storage System (MERN Stack)
echo ==============================================

start "Backend Server (Port 5000)" cmd /k "cd /d D:\cloudFileProject\backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend React App (Port 3000)" cmd /k "cd /d D:\cloudFileProject\frontend && npm run dev"

timeout /t 2 /nobreak >nul
start http://localhost:3000
echo Servers started! Opening http://localhost:3000 in your browser...
