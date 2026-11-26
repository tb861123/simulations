@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (
  node serve.mjs --open
) else (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" serve.mjs --open
  ) else (
    echo Install Node.js 22 or newer, then run this launcher again.
    pause
  )
)
