from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import schemas, crud
from app.dependencies import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardSummary)
def get(db: Session = Depends(get_db)):
    balance = crud.get_balance(db)
    pending = crud.get_pending_commitments_total(db)
    next_c = crud.get_next_commitment(db)
    return schemas.DashboardSummary(
        balance=balance,
        pending_commitments_total=pending,
        safe_margin=balance + pending,
        next_commitment=next_c
    )
