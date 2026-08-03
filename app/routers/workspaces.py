from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_current_user, get_current_workspace, get_db
from app.seed import seed_categories
from app.security import generate_invite_code, hash_token, invite_expiry

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _to_out(workspace: models.Workspace, user_id: int) -> schemas.WorkspaceOut:
    return schemas.WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        created_at=workspace.created_at,
        is_owner=workspace.owner_id == user_id,
    )


def _require_owner(workspace: models.Workspace, user: models.User) -> None:
    if workspace.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can do this",
        )


@router.get("", response_model=list[schemas.WorkspaceOut])
def list_all(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    workspaces = crud.get_workspaces(db, current_user.id)
    return [_to_out(w, current_user.id) for w in workspaces]


@router.post("", response_model=schemas.WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create(
    obj: schemas.WorkspaceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = crud.create_workspace(db, owner_id=current_user.id, name=obj.name)
    seed_categories(db, workspace.id)
    return _to_out(workspace, current_user.id)


@router.post("/join", response_model=schemas.WorkspaceOut)
def join(
    obj: schemas.WorkspaceJoinRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = crud.redeem_invite(db, hash_token(obj.code), current_user.id)
    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite code not found or expired",
        )
    return _to_out(workspace, current_user.id)


@router.get("/{workspace_id}", response_model=schemas.WorkspaceOut)
def get(
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
):
    return _to_out(workspace, current_user.id)


@router.put("/{workspace_id}", response_model=schemas.WorkspaceOut)
def rename(
    obj: schemas.WorkspaceUpdate,
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace = crud.rename_workspace(db, workspace, obj.name)
    return _to_out(workspace, current_user.id)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(workspace, current_user)
    crud.delete_workspace(db, workspace)


@router.post("/{workspace_id}/invite", response_model=schemas.WorkspaceInviteOut)
def create_invite(
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(workspace, current_user)
    code = generate_invite_code()
    invite = crud.create_invite(db, workspace.id, hash_token(code), invite_expiry())
    return schemas.WorkspaceInviteOut(code=code, expires_at=invite.expires_at)


@router.get("/{workspace_id}/invite", response_model=schemas.WorkspaceInviteStatus)
def get_invite_status(
    workspace: models.Workspace = Depends(get_current_workspace),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(workspace, current_user)
    invite = crud.get_active_invite(db, workspace.id)
    return schemas.WorkspaceInviteStatus(expires_at=invite.expires_at if invite else None)
