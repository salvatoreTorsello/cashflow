from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.dependencies import get_current_workspace, get_db

router = APIRouter(prefix="/workspaces/{workspace_id}/commitments", tags=["commitments"])


@router.post("", response_model=schemas.CommitmentOut)
def create(
    obj: schemas.CommitmentCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    if not crud.get_category(db, workspace.id, obj.category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return crud.create_commitment(db, workspace.id, obj)


@router.get("", response_model=list[schemas.CommitmentOut])
def list_all(
    status: models.CommitmentStatus | None = None,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    return crud.get_commitments(db, workspace.id, status)


@router.post("/{commitment_id}/execute", response_model=schemas.TransactionOut)
def execute(
    commitment_id: int,
    obj: schemas.CommitmentExecute | None = None,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    tx = crud.execute_commitment(db, workspace.id, commitment_id, obj)
    if not tx:
        raise HTTPException(
            status_code=404, detail="Commitment not found or already paid"
        )
    return tx


@router.put("/{commitment_id}/edit", response_model=schemas.CommitmentOut)
def edit(
    obj: schemas.CommitmentUpdate,
    commitment_id: int,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    # Check if requested category exists
    if (obj.category_id is not None) and (
        not crud.get_category(db, workspace.id, obj.category_id)
    ):
        raise HTTPException(status_code=404, detail="Category not found")

    # Edit the commitment
    commitment = crud.edit_commitment(db, workspace.id, commitment_id, obj)
    if not commitment:
        raise HTTPException(status_code=404, detail="Commitment not found")
    return commitment


@router.delete("/{commitment_id}", status_code=204)
def delete(
    commitment_id: int,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    if not crud.delete_commitment(db, workspace.id, commitment_id):
        raise HTTPException(status_code=404, detail="Commitment not found")
