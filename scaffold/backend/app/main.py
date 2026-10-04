from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import patients, uploads, doctor, pharmacy, lab, copilot, auth, settings, doctor_crm, reception

app = FastAPI(title="Sanjeevani API", version="0.1.0")

# BUG-BE-02 FIX: Explicitly specify allowed origins for credential-bearing CORS requests
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["reception"])
app.include_router(uploads.router, prefix="/api/upload", tags=["reception"])
app.include_router(reception.router, prefix="/api/reception", tags=["reception"])
app.include_router(doctor.router, prefix="/api/doctor", tags=["doctor"])
app.include_router(doctor_crm.router, prefix="/api/doctor/crm", tags=["doctor-crm"])
app.include_router(pharmacy.router, prefix="/api/pharmacy", tags=["pharmacy"])
app.include_router(lab.router, prefix="/api/lab", tags=["lab"])
app.include_router(copilot.router, prefix="/api/patient", tags=["patient"])
app.include_router(copilot.router, prefix="/api/copilot", tags=["copilot"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(settings.router, prefix="/api", tags=["profile"])


from typing import Optional
from pydantic import BaseModel

class ClinicAccessRequest(BaseModel):
    name: str
    contact: str
    clinic: Optional[str] = None


@app.post("/api/clinic/access-request")
async def handle_clinic_access_request(req: ClinicAccessRequest):
    print(f"[CLINIC-LEAD] Access request: name='{req.name}', contact='{req.contact}', clinic='{req.clinic}'")
    return {"status": "success", "message": "Lead received. Our team will contact you within 24 hours."}


@app.get("/health")
async def health():
    return {"status": "ok"}
