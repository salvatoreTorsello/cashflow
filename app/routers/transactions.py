from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.dependencies import get_current_workspace, get_db

router = APIRouter(prefix="/workspaces/{workspace_id}/transactions", tags=["transactions"])


@router.post("", response_model=schemas.TransactionOut)
def create(
    obj: schemas.TransactionCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    if not crud.get_category(db, workspace.id, obj.category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return crud.create_transaction(db, workspace.id, obj)


@router.get("", response_model=list[schemas.TransactionOut])
def list_all(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    return crud.get_transactions(db, workspace.id)


@router.put("/{transaction_id}/edit", response_model=schemas.TransactionOut)
def edit(
    obj: schemas.TransactionUpdate,
    transaction_id: int,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    # Check if requested category exists
    if (obj.category_id is not None) and (
        not crud.get_category(db, workspace.id, obj.category_id)
    ):
        raise HTTPException(status_code=404, detail="Category not found")

    # Edit the transaction
    try:
        transaction = crud.edit_transaction(db, workspace.id, transaction_id, obj)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete(
    transaction_id: int,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    if not crud.delete_transaction(db, workspace.id, transaction_id):
        raise HTTPException(status_code=404, detail="Transaction not found")
