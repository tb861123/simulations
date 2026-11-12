@echo off
rem Three-Body Gravitational Chaos Lab: local HTTP launcher for the supplied build.
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found, so the local server cannot start.
  echo Opening the single-file build directly in your default browser instead ^(Chrome or Edge recommended^).
  start "" "%~dp0three-body-chaos.html"
  pause
  exit /b
)
echo Starting the lab at http://127.0.0.1:4173/ ...
node "%~dp0source\scripts\serve.mjs"
pause
