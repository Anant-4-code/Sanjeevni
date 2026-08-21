Write-Host "Starting Sanjeevani Backend and All Frontend Portals..." -ForegroundColor Green
Set-Location "$PSScriptRoot\scaffold\frontend"
$env:WATCHPACK_POLLING = "true"
npx -y concurrently --restart-tries 5 -k -n "BACKEND,PATIENT,DOCTOR,RECEPTION,PHARMACY,LAB" -c "blue,red,magenta,green,yellow,cyan" "python -m uvicorn app.main:app --app-dir ../backend --reload --reload-delay 0.5 --port 8000" "npm run dev --workspace=@sanjeevani/patient" "npm run dev --workspace=@sanjeevani/doctor" "npm run dev --workspace=@sanjeevani/reception" "npm run dev --workspace=@sanjeevani/pharmacy" "npm run dev --workspace=@sanjeevani/lab"
