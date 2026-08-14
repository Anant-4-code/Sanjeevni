from fastapi import APIRouter

router = APIRouter()

@router.get("/queue")
async def pharmacy_queue():
    # TODO: query prescriptions WHERE status='verified' AND dispensed=false
    return {"queue": []}

@router.post("/dispense")
async def dispense():
    return {"status": "dispensed"}

@router.get("/inventory/forecast")
async def inventory_forecast():
    # TODO: Prophet / moving-average forecast job output
    return {"alerts": []}
