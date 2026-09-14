@echo off
setlocal EnableExtensions
title Santoshpur Git Code Pusher
color 0A

echo ======================================================================
echo                 Pushing Code Changes to GitHub...
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git command was not found! Please install Git for Windows.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%.git" (
    echo [ERROR] This folder is not a Git repository.
    pause
    exit /b 1
)

set "BRANCH="
for /f "delims=" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if not defined BRANCH (
    echo [ERROR] No branch is checked out. Please checkout a branch first.
    pause
    exit /b 1
)
echo Current branch: %BRANCH%
echo.

rem ---- Commit uncommitted changes (if any) ----
set "HAS_CHANGES="
for /f "delims=" %%s in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES goto :check_main

echo Uncommitted changes:
git status --short
echo.
set "CONFIRM="
set /p "CONFIRM=Commit ALL these changes and push? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto :cancel

set "NOW="
for /f "delims=" %%d in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "NOW=%%d"
set "MSG="
set /p "MSG=Commit message [Enter = Update %NOW%]: "
if not defined MSG set "MSG=Update %NOW%"
set "MSG=%MSG:"='%"

git add -A
if errorlevel 1 goto :fail
git commit -m "%MSG%"
if errorlevel 1 goto :fail
echo.

rem ---- Extra confirmation before pushing straight to main ----
:check_main
if /i not "%BRANCH%"=="main" goto :do_push
echo [WARNING] You are on MAIN. Office PCs download this code with update-code.bat.
set "CONFIRM_MAIN="
set /p "CONFIRM_MAIN=Push directly to main? (Y/N): "
if /i not "%CONFIRM_MAIN%"=="Y" goto :cancel

:do_push
echo Pushing branch "%BRANCH%" to GitHub...
git push -u origin "%BRANCH%"
if errorlevel 1 goto :fail

echo.
echo ======================================================================
echo  [DONE] Code pushed to GitHub! Branch: %BRANCH%
echo ======================================================================
echo.
pause
exit /b 0

:cancel
echo.
echo [CANCELLED] Nothing was pushed.
pause
exit /b 1

:fail
echo.
echo [ERROR] Git command failed. Read the message above.
echo         Any commit made above is still saved locally.
echo         If the push was rejected, run: git pull --rebase origin %BRANCH%
echo         then run this file again.
pause
exit /b 1
