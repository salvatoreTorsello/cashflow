from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud
from app.dependencies import get_db

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=schemas.CategoryOut)
def create(obj: schemas.CategoryCreate, db: Session = Depends(get_db)):
    if crud.get_category_by_name(db, obj.name):
        raise HTTPException(status_code=400, detail="Category already exists")
    return crud.create_category(db, obj)


@router.get("", response_model=list[schemas.CategoryOut])
def list_all(db: Session = Depends(get_db)):
    return crud.get_categories(db)