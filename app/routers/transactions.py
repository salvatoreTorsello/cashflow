from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud
from app.dependencies import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=schemas.TransactionOut)
def create(obj: schemas.TransactionCreate, db: Session = Depends(get_db)):
    if not crud.get_category(db, obj.category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return crud.create_transaction(db, obj)


@router.get("", response_model=list[schemas.TransactionOut])
def list_all(db: Session = Depends(get_db)):
    return crud.get_transactions(db)


@router.put("/{transaction_id}/edit", response_model=schemas.TransactionOut)
def edit(
    obj: schemas.TransactionUpdate,
    transaction_id: int,
    db: Session = Depends(get_db),
):
    # Check if requested category exists
    if (obj.category_id is not None) and (
        not crud.get_category(db, obj.category_id)
    ):
        raise HTTPException(status_code=404, detail="Category not found")

    # Edit the transaction
    try:
        transaction = crud.edit_transaction(db, transaction_id, obj)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction
