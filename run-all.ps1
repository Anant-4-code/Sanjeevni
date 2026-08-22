Write-Host "Starting Sanjeevani Unified Health Platform (Backend :8000 and App :3000)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\scaffold\frontend"
$env:WATCHPACK_POLLING = "true"
npx -y concurrently --handle-input --restart-tries 10 --restart-delay 1000 -n "BACKEND,APP" -c "blue,green" "python -m uvicorn app.main:app --app-dir ../backend --reload --reload-dir ../backend --port 8000" "npm run dev --workspace=@sanjeevani/patient"