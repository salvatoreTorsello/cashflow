from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.dependencies import get_current_workspace, get_db

router = APIRouter(prefix="/workspaces/{workspace_id}/categories", tags=["categories"])


@router.post("", response_model=schemas.CategoryOut)
def create(
    obj: schemas.CategoryCreate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    if crud.get_category_by_name(db, workspace.id, obj.name):
        raise HTTPException(status_code=400, detail="Category already exists")
    return crud.create_category(db, workspace.id, obj)


@router.get("", response_model=list[schemas.CategoryOut])
def list_all(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    return crud.get_categories(db, workspace.id)
