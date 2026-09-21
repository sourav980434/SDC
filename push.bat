@echo off
cd /d "%~dp0"

echo === Git Status ===
git status -s
echo.

set "msg="
set /p msg=Commit message (Enter = auto message):
if "%msg%"=="" set "msg=Update: %date% %time%"

git add -A
git diff --cached --quiet
if %errorlevel%==0 (
    echo Nothing new to commit.
) else (
    git commit -m "%msg%"
    if errorlevel 1 goto fail
)

echo.
echo === Pushing to origin/main ===
git pull --rebase origin main
if errorlevel 1 goto fail
git push origin main
if errorlevel 1 goto fail

echo.
echo Done! Push successful.
pause
exit /b 0

:fail
echo.
echo ERROR: Something went wrong. Check the messages above.
pause
exit /b 1
