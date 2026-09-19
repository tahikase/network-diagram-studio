@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "APPFILE=%~dp0index.html"

if not exist "%APPFILE%" (
    echo.
    echo   ERROR: index.html is missing.
    echo   Extract the complete Network Diagram Studio package and try again.
    echo.
    pause
    exit /b 1
)

for %%D in (production_arm production_demo production_editor production_vendor) do (
    if not exist "%~dp0%%D\" (
        echo.
        echo   ERROR: the required %%D folder is missing.
        echo   Extract the complete Network Diagram Studio package and try again.
        echo.
        pause
        exit /b 1
    )
)

set "APPURL=file:///%APPFILE:\=/%"
set "PF=%ProgramFiles%"
set "PF86=%ProgramFiles(x86)%"
set "LAD=%LocalAppData%"
set "BROWSER="

call :pick "%PF86%\Microsoft\Edge\Application\msedge.exe"
call :pick "%PF%\Microsoft\Edge\Application\msedge.exe"
call :pick "%LAD%\Microsoft\Edge\Application\msedge.exe"
call :pick "%PF%\Google\Chrome\Application\chrome.exe"
call :pick "%PF86%\Google\Chrome\Application\chrome.exe"
call :pick "%LAD%\Google\Chrome\Application\chrome.exe"

if defined BROWSER (
    start "" "%BROWSER%" --app="%APPURL%" --start-maximized
) else (
    start "" "%APPURL%"
)
exit /b 0

:pick
if defined BROWSER exit /b 0
if exist %1 set "BROWSER=%~1"
exit /b 0
