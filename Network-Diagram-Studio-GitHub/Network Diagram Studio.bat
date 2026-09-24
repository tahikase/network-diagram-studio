@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem Network Diagram Studio - production release v0.9.111
rem Extract the complete package. Save JSON before replacing an older release.
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

for %%F in (engine.js import.js import.css resource-ids.js resource-ids.css) do if not exist "%~dp0production_arm\%%F" goto missing_assets
for %%F in (demo.js demo.css group-copy.js walkthrough.mp4 poster.jpg) do if not exist "%~dp0production_demo\%%F" goto missing_assets
for %%F in (appearance.js appearance.css canvas-images.js canvas-images.css captions.js captions.css capture.js connectors.js connectors.css feedback.js feedback.css history.js history.css notes-layout.js notes-layout.css settings-help.js settings.css text-dock.js text-dock.css nds-logo.svg nds-logo-128.png nds-favicon-32.png) do if not exist "%~dp0production_editor\%%F" goto missing_assets
for %%F in (catalog.js catalog.json vendor-icons.js) do if not exist "%~dp0production_vendor\%%F" goto missing_assets
for %%F in (aws-direct-connect.svg aws-ec2.svg aws-load-balancer.svg aws-site-to-site-vpn.svg aws-vpc.svg kubernetes-endpoints.svg kubernetes-ingress.svg kubernetes-network-policy.svg kubernetes-node.svg kubernetes-pod.svg kubernetes-service.svg oci-drg.svg oci-load-balancer.svg oci-vcn.svg oci-virtual-machine.svg) do if not exist "%~dp0production_vendor\assets\%%F" goto missing_assets

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

:missing_assets
echo.
echo   ERROR: required production files are missing.
echo   Extract the complete Network Diagram Studio package and try again.
echo.
pause
exit /b 1

:pick
if defined BROWSER exit /b 0
if exist %1 set "BROWSER=%~1"
exit /b 0
