@echo off
rem ============================================================
rem paper_agent one-click launcher: AGH daemon + AGH Web + BFF + frontend
rem
rem Wraps the official launcher paper-agent-backend/scripts/start.mjs
rem (orchestration: AGH build probe -> daemon serve -> AGH Web serve ->
rem BFF -> frontend -> health wait -> open browser).
rem
rem AGH Web (default http://127.0.0.1:4177) lets you observe the real
rem AGH invocations. Override the port with the AGH_WEB_PORT env var.
rem
rem Before spawning any service, start.mjs pre-releases the ports this run
rem needs (BFF / AGH Web / frontend) by terminating processes LISTENING on
rem them (netstat+taskkill on Windows), so a stale process from a previous
rem run no longer aborts the launch.
rem
rem ASCII-only on purpose: all paths are resolved at RUNTIME via %~dp0,
rem so this file stays safe for non-ASCII project paths (CJK etc.).
rem
rem Usage:
rem   start.bat                  full stack (daemon + AGH Web + BFF + frontend)
rem   start.bat --no-browser     do not open the browser
rem   start.bat --bff-only       skip AGH daemon, AGH Web and frontend
rem   start.bat --json           machine-readable step report
rem
rem Stop: press Ctrl+C in this window (kills all child processes too).
rem ============================================================
setlocal
set "BACKEND=%~dp0paper-agent-backend"

rem --- Pick a Node >= 24.10 -----------------------------------------------
rem AGH native modules are built against the Node 24 libuv ABI; running the
rem daemon on Node 22 fails with E_SEAM_INIT (misleading "credential store"
rem errors). start.mjs pickNode() falls back to process.execPath, so whatever
rem Node launches THIS script is inherited by daemon/BFF/frontend children.
set "NODE_EXE=D:\Node.js\node.exe"
if exist "%NODE_EXE%" goto run
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if exist "%NODE_EXE%" goto run
set "NODE_EXE=node"
echo [warn] No known Node 24 installation found; falling back to PATH node.
echo        AGH daemon requires Node ^>= 24.10 - older Node will fail to start it.

:run
echo [start] project : %~dp0
echo [start] node    : %NODE_EXE%
"%NODE_EXE%" --version

if not exist "%BACKEND%\scripts\start.mjs" (
  echo [start] Launcher not found: %BACKEND%\scripts\start.mjs
  goto fail
)
if not exist "%BACKEND%\node_modules\tsx\dist\cli.mjs" (
  echo [start] Backend deps missing. Run first:
  echo           cd /d "%BACKEND%"
  echo           pnpm install
  goto fail
)

cd /d "%BACKEND%"
"%NODE_EXE%" scripts\start.mjs %*
if errorlevel 1 goto fail
goto :eof

:fail
echo.
echo [start] Launcher stopped with an error. Read the messages above.
pause
