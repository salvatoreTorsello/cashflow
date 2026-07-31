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
