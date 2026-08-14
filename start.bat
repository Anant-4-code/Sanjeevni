@echo off
echo Starting Sanjeevani Platform & Opening Browser...
start "" "http://localhost:3000"
cd /d "%~dp0"
call run-all.bat
