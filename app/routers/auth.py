from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.config import settings
from app.dependencies import SESSION_COOKIE_NAME, get_current_user, get_db
from app.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    session_expiry,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days, matches security.SESSION_TTL


def _login(db: Session, response: Response, user: models.User) -> None:
    token = generate_session_token()
    crud.create_session(
        db,
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=session_expiry(),
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(obj: schemas.UserCreate, response: Response, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, obj.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = crud.create_user(
        db, email=obj.email, hashed_password=hash_password(obj.password)
    )
    _login(db, response, user)
    return user


@router.post("/login", response_model=schemas.UserOut)
def login(obj: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, obj.email)
    if not user or not verify_password(obj.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    _login(db, response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    cf_session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if cf_session:
        crud.delete_session(db, hash_session_token(cf_session))
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
