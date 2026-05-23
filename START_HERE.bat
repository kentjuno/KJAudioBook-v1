@echo off
setlocal EnableExtensions

title AudioBook KJ - One Click Setup
set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_DIR=%ROOT%audiobook_builder"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "BACKEND_PY=%VENV_DIR%\Scripts\python.exe"
set "PYTHON_CMD=python"
set "MISSING_REQUIRED=0"

cd /d "%ROOT%"

echo.
echo ============================================================
echo  AudioBook KJ - One Click Setup / Launcher
echo ============================================================
echo.
echo This launcher will:
echo  - Check required software
echo  - Offer to install missing software with winget
echo  - Install frontend dependencies
echo  - Create Python virtual environment
echo  - Install backend dependencies
echo  - Start backend and frontend in separate windows
echo.
echo NOTE: AI/TTS dependencies can be large and may take a long time.
echo.

call :ensure_tool git Git.Git "Git"
call :ensure_node
call :ensure_python
call :ensure_tool ffmpeg Gyan.FFmpeg "FFmpeg"

if "%MISSING_REQUIRED%"=="1" (
  echo.
  echo One or more required tools are still missing.
  echo If winget installed something, close this window, open it again,
  echo then double-click START_HERE.bat one more time.
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Preparing frontend
echo ============================================================
if not exist "%FRONTEND_DIR%\package.json" (
  echo ERROR: Cannot find frontend\package.json
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\.env" (
  echo Creating frontend\.env
  > "%FRONTEND_DIR%\.env" echo VITE_API_URL=http://localhost:8000
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo Installing frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo frontend\node_modules already exists. Skipping npm install.
)

echo.
echo ============================================================
echo  Preparing backend
echo ============================================================
if not exist "%BACKEND_DIR%\requirements.txt" (
  echo ERROR: Cannot find audiobook_builder\requirements.txt
  pause
  exit /b 1
)

if not exist "%VENV_DIR%" (
  echo Creating Python virtual environment...
  %PYTHON_CMD% -m venv "%VENV_DIR%"
  if errorlevel 1 (
    echo.
    echo ERROR: Could not create Python virtual environment.
    pause
    exit /b 1
  )
) else (
  echo Python virtual environment already exists.
)

echo Upgrading pip...
"%BACKEND_PY%" -m pip install --upgrade pip
if errorlevel 1 (
  echo.
  echo WARNING: pip upgrade failed. Continuing anyway.
)

echo.
echo Backend dependencies include AI/TTS packages such as torch and OmniVoice.
echo They may download large files and can take a while.
choice /C YN /M "Install/update backend Python dependencies now"
if errorlevel 2 goto skip_backend_deps

"%BACKEND_PY%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
if errorlevel 1 (
  echo.
  echo ERROR: Backend dependency install failed.
  echo You can still inspect the source, but the backend may not run.
  pause
  exit /b 1
)

:skip_backend_deps
if not exist "%BACKEND_DIR%\output" mkdir "%BACKEND_DIR%\output"
if not exist "%BACKEND_DIR%\outputs" mkdir "%BACKEND_DIR%\outputs"
if not exist "%BACKEND_DIR%\temp_audio" mkdir "%BACKEND_DIR%\temp_audio"
if not exist "%BACKEND_DIR%\Voice_ref" mkdir "%BACKEND_DIR%\Voice_ref"

echo.
echo ============================================================
echo  Starting app
echo ============================================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Two terminal windows will open. Keep them running while using the app.
echo.

start "AudioBook KJ Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && ""%BACKEND_PY%"" server.py"
timeout /t 4 /nobreak >nul
start "AudioBook KJ Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev -- --host 127.0.0.1"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Done. If the browser shows an error, wait a little and refresh.
echo If the backend window is downloading AI models, let it finish.
echo.
pause
exit /b 0

:ensure_tool
set "TOOL=%~1"
set "WINGET_ID=%~2"
set "LABEL=%~3"
where "%TOOL%" >nul 2>nul
if not errorlevel 1 (
  echo [OK] %LABEL% found.
  exit /b 0
)

echo [MISSING] %LABEL% was not found.
call :install_with_winget "%WINGET_ID%" "%LABEL%"
where "%TOOL%" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] %LABEL% is still missing.
  set "MISSING_REQUIRED=1"
) else (
  echo [OK] %LABEL% found after install.
)
exit /b 0

:ensure_node
where node >nul 2>nul
if errorlevel 1 (
  echo [MISSING] Node.js was not found.
  call :install_with_winget "OpenJS.NodeJS.LTS" "Node.js LTS"
) else (
  node -e "const v=process.versions.node.split('.').map(Number); process.exit(((v[0]===20&&v[1]>=19)||v[0]>=22)?0:1)" >nul 2>nul
  if errorlevel 1 (
    echo [WARNING] Node.js is installed, but this project expects Node 20.19+ or 22.12+.
    choice /C YN /M "Install/update Node.js LTS with winget"
    if not errorlevel 2 call :install_with_winget "OpenJS.NodeJS.LTS" "Node.js LTS"
  ) else (
    echo [OK] Node.js version looks good.
  )
)

where node >nul 2>nul
if errorlevel 1 set "MISSING_REQUIRED=1"
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  set "MISSING_REQUIRED=1"
) else (
  echo [OK] npm found.
)
exit /b 0

:ensure_python
where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  echo [OK] Python found.
  exit /b 0
)

where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  echo [OK] Python launcher found.
  exit /b 0
)

echo [MISSING] Python was not found.
call :install_with_winget "Python.Python.3.11" "Python 3.11"
where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  echo [OK] Python found after install.
  exit /b 0
)

where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  echo [OK] Python launcher found after install.
  exit /b 0
)

echo [ERROR] Python is still missing.
set "MISSING_REQUIRED=1"
exit /b 0

:install_with_winget
set "PKG=%~1"
set "NAME=%~2"
where winget >nul 2>nul
if errorlevel 1 (
  echo [ERROR] winget is not available. Please install %NAME% manually.
  set "MISSING_REQUIRED=1"
  exit /b 0
)

choice /C YN /M "Install %NAME% with winget"
if errorlevel 2 (
  set "MISSING_REQUIRED=1"
  exit /b 0
)

winget install --id "%PKG%" -e --accept-package-agreements --accept-source-agreements
exit /b 0
