@echo off
REM Shotgun Git Commit & Push
REM Place this file in your project folder or somewhere in your PATH

echo Adding all changes...
git add .

echo Committing with generic message...
git commit -m "update"

echo Pushing to GitHub (main branch)...
git push origin main

echo Done! All changes have been pushed.
pause