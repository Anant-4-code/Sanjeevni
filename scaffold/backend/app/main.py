from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import patients, uploads, doctor, pharmacy, lab, copilot, auth

app = FastAPI(title="Sanjeevani API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["reception"])
app.include_router(uploads.router, prefix="/api/upload", tags=["reception"])
app.include_router(doctor.router, prefix="/api/doctor", tags=["doctor"])
app.include_router(pharmacy.router, prefix="/api/pharmacy", tags=["pharmacy"])
app.include_router(lab.router, prefix="/api/lab", tags=["lab"])
app.include_router(copilot.router, prefix="/api/patient", tags=["patient"])


@app.get("/health")
async def health():
    return {"status": "ok"}
