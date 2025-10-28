@echo off
echo --- Starting GTAO-Timer Build ---
echo This may take a few minutes...

REM Clean up previous builds (optional but recommended)
echo Cleaning old build artifacts...
rmdir /s /q build
rmdir /s /q dist
del /q "GTAO-Timer.spec"

pyinstaller --onefile --windowed --name "GTAO-Timer" --paths "backend" --hidden-import "app" --hidden-import "appdirs" --add-data "frontend:frontend" run.py

echo --- Build Complete! ---
echo Your .exe file can be found in the 'dist' folder.

pause