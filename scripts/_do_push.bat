@echo off
cd /d "E:\SANTOSHPUR"
git add -A
git commit -m "Add PHP+SQLSRV auto-setup scripts (setup-php-sqlsrv.bat + configure_phpini.ps1)"
git push
echo.
echo Push complete!
