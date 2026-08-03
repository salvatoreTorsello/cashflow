from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app import crud, models
from app.database import SessionLocal
from app.security import hash_token

SESSION_COOKIE_NAME = "cf_session"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    cf_session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> models.User:
    if cf_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    token_hash = hash_token(cf_session)
    session = (
        db.query(models.UserSession)
        .filter(models.UserSession.token_hash == token_hash)
        .first()
    )
    if session is None or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        )

    return session.user


def get_current_workspace(
    workspace_id: int = Path(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Workspace:
    workspace = crud.get_workspace_for_member(db, workspace_id, current_user.id)
    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found"
        )
    return workspace
