@echo off
cd /d "%~dp0"
set "LAB_NODE=node"
where node >nul 2>&1
if errorlevel 1 set "LAB_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%LAB_NODE%" scripts/serve.mjs
pause
