from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_current_user, get_current_workspace, get_db
from app.seed import seed_categories

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[schemas.WorkspaceOut])
def list_all(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return crud.get_workspaces(db, current_user.id)


@router.post("", response_model=schemas.WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create(
    obj: schemas.WorkspaceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = crud.create_workspace(db, owner_id=current_user.id, name=obj.name)
    seed_categories(db, workspace.id)
    return workspace


@router.get("/{workspace_id}", response_model=schemas.WorkspaceOut)
def get(workspace: models.Workspace = Depends(get_current_workspace)):
    return workspace


@router.put("/{workspace_id}", response_model=schemas.WorkspaceOut)
def rename(
    obj: schemas.WorkspaceUpdate,
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    return crud.rename_workspace(db, workspace, obj.name)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    workspace: models.Workspace = Depends(get_current_workspace),
    db: Session = Depends(get_db),
):
    crud.delete_workspace(db, workspace)
