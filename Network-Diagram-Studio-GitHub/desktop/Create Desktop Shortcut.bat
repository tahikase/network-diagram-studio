@echo off
setlocal EnableExtensions

echo.
echo   Creating the Network Diagram Studio shortcut...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0nds-create-shortcut.ps1"
set "RESULT=%ERRORLEVEL%"

pause
exit /b %RESULT%
