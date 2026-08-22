Write-Host "Starting Sanjeevani Unified Health Platform (Backend :8000 & Consolidated App :3000)..." -ForegroundColor Green
Set-Location "$PSScriptRoot\scaffold\frontend"
$env:WATCHPACK_POLLING = "true"
npx -y concurrently --restart-tries 5 -k -n "BACKEND,APP" -c "blue,green" "python -m uvicorn app.main:app --app-dir ../backend --reload --reload-dir ../backend --reload-delay 0.5 --port 8000" "npm run dev --workspace=@sanjeevani/patient"