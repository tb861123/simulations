@echo off
REM ============================================================
REM  Edexcel iGCSE Chemistry Simulations  -  ONE-TIME SETUP
REM ============================================================
REM  These simulations need NO software to be installed. They
REM  run in any modern web browser (Edge, Chrome, Firefox).
REM
REM  This optional script just creates a Desktop shortcut so
REM  colleagues can launch the gallery with one click. Run it
REM  once; afterwards use the "Chemistry Simulations" shortcut
REM  on the Desktop, or double-click run.bat in this folder.
REM ============================================================

echo.
echo  Setting up Edexcel iGCSE Chemistry Simulations...
echo.

set "TARGET=%~dp0index.html"
set "SHORTCUT=%USERPROFILE%\Desktop\Chemistry Simulations.lnk"

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut('%SHORTCUT%');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.IconLocation = '%SystemRoot%\System32\SHELL32.dll, 13';" ^
  "$s.Description = 'Edexcel iGCSE Chemistry Simulations';" ^
  "$s.Save()"

if exist "%SHORTCUT%" (
  echo  Done! A "Chemistry Simulations" shortcut has been added to your Desktop.
) else (
  echo  Could not create a Desktop shortcut, but that's OK -
  echo  just double-click run.bat ^(or index.html^) to launch the gallery.
)

echo.
echo  Press any key to close this window.
pause >nul
