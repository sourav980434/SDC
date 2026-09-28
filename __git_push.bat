@echo off
cd /d "E:\SANTOSHPUR"
git add -A
git commit -m "Add AGENTS guide files; restore missing vendor packages (mpdf, phpword)"
git push
echo.
echo Done!
