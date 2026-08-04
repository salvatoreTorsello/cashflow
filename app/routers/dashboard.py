import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.dependencies import get_current_workspace, get_db

router = APIRouter(prefix="/workspaces/{workspace_id}/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardSummary)
def get(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    balance = crud.get_balance(db, workspace.id)
    pending = crud.get_pending_commitments_total(db, workspace.id)
    next_c = crud.get_next_commitment(db, workspace.id)
    return schemas.DashboardSummary(
        balance=balance,
        pending_commitments_total=pending,
        safe_margin=balance + pending,
        next_commitment=next_c
    )


@router.get("/predictions", response_model=schemas.PredictionResponse)
def predictions(
    date: datetime.date | None = None,
    average_salary: Decimal | None = None,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    result = crud.get_prediction(
        db, workspace.id, target_date=date, average_salary_override=average_salary
    )
    return schemas.PredictionResponse(**result)
