import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas


## Users


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, email: str, hashed_password: str) -> models.User:
    db_obj = models.User(email=email, hashed_password=hashed_password)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


## Sessions


def create_session(
    db: Session, user_id: int, token_hash: str, expires_at: datetime
) -> models.UserSession:
    db_obj = models.UserSession(
        user_id=user_id, token_hash=token_hash, expires_at=expires_at
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_session(db: Session, token_hash: str) -> None:
    db.query(models.UserSession).filter(
        models.UserSession.token_hash == token_hash
    ).delete()
    db.commit()


## Workspaces


def create_workspace(db: Session, owner_id: int, name: str) -> models.Workspace:
    db_obj = models.Workspace(owner_id=owner_id, name=name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_workspaces(db: Session, owner_id: int):
    return (
        db.query(models.Workspace)
        .filter(models.Workspace.owner_id == owner_id)
        .order_by(models.Workspace.created_at)
        .all()
    )


def rename_workspace(db: Session, workspace: models.Workspace, name: str):
    workspace.name = name
    db.commit()
    db.refresh(workspace)
    return workspace


def delete_workspace(db: Session, workspace: models.Workspace) -> None:
    db.delete(workspace)
    db.commit()


## Categories


def create_category(db: Session, workspace_id: int, obj: schemas.CategoryCreate):
    db_obj = models.Category(workspace_id=workspace_id, **obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_categories(db: Session, workspace_id: int):
    return (
        db.query(models.Category)
        .filter(models.Category.workspace_id == workspace_id)
        .order_by(models.Category.name)
        .all()
    )


def get_category(db: Session, workspace_id: int, category_id: int):
    return (
        db.query(models.Category)
        .filter(
            models.Category.id == category_id,
            models.Category.workspace_id == workspace_id,
        )
        .first()
    )


def get_category_by_name(db: Session, workspace_id: int, name: str):
    return (
        db.query(models.Category)
        .filter(
            models.Category.name == name,
            models.Category.workspace_id == workspace_id,
        )
        .first()
    )


## Transactions


def create_transaction(
    db: Session, workspace_id: int, obj: schemas.TransactionCreate
):
    db_obj = models.Transaction(workspace_id=workspace_id, **obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_transactions(db: Session, workspace_id: int):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.workspace_id == workspace_id)
        .order_by(models.Transaction.date.desc())
        .all()
    )


def edit_transaction(
    db: Session, workspace_id: int, transaction_id: int, obj: schemas.TransactionUpdate
):
    db_obj = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    for field, value in obj.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    # In case transaction was linked to a commitment, amount should be <= 0
    if db_obj.commitment_id is not None and db_obj.amount >= 0:
        raise ValueError("amount must be negative when linked to a commitment")

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_transaction(db: Session, workspace_id: int, transaction_id: int):
    db_obj = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.id == transaction_id,
            models.Transaction.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    db.delete(db_obj)
    db.commit()
    return True


## Commitments


def create_commitment(
    db: Session, workspace_id: int, obj: schemas.CommitmentCreate
) -> models.Commitment:
    db_obj = models.Commitment(workspace_id=workspace_id, **obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_commitments(
    db: Session, workspace_id: int, status: models.CommitmentStatus | None = None
):
    q = db.query(models.Commitment).filter(
        models.Commitment.workspace_id == workspace_id
    )
    if status:
        q = q.filter(models.Commitment.status == status)
    return q.order_by(models.Commitment.due_date).all()


def edit_commitment(
    db: Session, workspace_id: int, commitment_id: int, obj: schemas.CommitmentUpdate
):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    for field, value in obj.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def execute_commitment(
    db: Session,
    workspace_id: int,
    commitment_id: int,
    obj: schemas.CommitmentExecute | None = None,
):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj or db_obj.status == models.CommitmentStatus.paid:
        return None

    tx = models.Transaction(
        workspace_id=workspace_id,
        date=obj.date if obj and obj.date else date.today(),
        amount=obj.amount if obj and obj.amount is not None else db_obj.amount,
        category_id=db_obj.category_id,
        description=obj.description if obj and obj.description is not None else db_obj.description,
        commitment_id=db_obj.id,
    )
    db_obj.status = models.CommitmentStatus.paid
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def delete_commitment(db: Session, workspace_id: int, commitment_id: int):
    db_obj = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.id == commitment_id,
            models.Commitment.workspace_id == workspace_id,
        )
        .first()
    )
    if not db_obj:
        return None

    db.query(models.Transaction).filter(
        models.Transaction.commitment_id == commitment_id
    ).update({"commitment_id": None})

    db.delete(db_obj)
    db.commit()
    return True


def get_next_commitment(db: Session, workspace_id: int):
    return (
        db.query(models.Commitment)
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status == models.CommitmentStatus.pending,
        )
        .order_by(models.Commitment.due_date)
        .first()
    )


def get_pending_commitments_total(db: Session, workspace_id: int):
    result = (
        db.query(func.sum(models.Commitment.amount))
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status == models.CommitmentStatus.pending,
        )
        .scalar()
    )
    return result or Decimal("0")


## Balance


def get_balance(db: Session, workspace_id: int):
    result = (
        db.query(func.sum(models.Transaction.amount))
        .filter(models.Transaction.workspace_id == workspace_id)
        .scalar()
    )
    return result or Decimal("0")


## Predictions


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def get_average_salary(db: Session, workspace_id: int) -> Decimal:
    amounts = (
        db.query(models.Transaction.amount)
        .join(models.Category)
        .filter(
            models.Transaction.workspace_id == workspace_id,
            models.Category.name == "salary",
        )
        .all()
    )
    values = [row[0] for row in amounts]
    if not values:
        return Decimal("0")
    return sum(values) / len(values)


def _get_last_salary_date(db: Session, workspace_id: int):
    return (
        db.query(func.max(models.Transaction.date))
        .join(models.Category)
        .filter(
            models.Transaction.workspace_id == workspace_id,
            models.Category.name == "salary",
        )
        .scalar()
    )


def _get_projected_salary_dates(
    db: Session, workspace_id: int, today: date, horizon_end: date
) -> list[date]:
    last_salary_date = _get_last_salary_date(db, workspace_id)
    if last_salary_date is None:
        return []

    next_date = last_salary_date
    while next_date <= today:
        next_date = _add_months(next_date, 1)

    dates = []
    while next_date <= horizon_end:
        dates.append(next_date)
        next_date = _add_months(next_date, 1)
    return dates


def get_prediction(
    db: Session, workspace_id: int, target_date: date | None = None, months: int = 5
):
    today = date.today()
    horizon_end = _add_months(today, months)
    query_end = max(horizon_end, target_date) if target_date else horizon_end

    current_balance = get_balance(db, workspace_id)
    avg_salary = get_average_salary(db, workspace_id)

    pending_commitments = (
        db.query(models.Commitment)
        .filter(
            models.Commitment.workspace_id == workspace_id,
            models.Commitment.status != models.CommitmentStatus.paid,
            models.Commitment.due_date <= query_end,
        )
        .all()
    )
    salary_dates = _get_projected_salary_dates(db, workspace_id, today, query_end)

    def balance_at(d: date) -> Decimal:
        commitments_delta = sum(
            (c.amount for c in pending_commitments if c.due_date <= d), Decimal("0")
        )
        salary_delta = avg_salary * len([s for s in salary_dates if s <= d])
        return current_balance + commitments_delta + salary_delta

    series = []
    d = today
    while d <= horizon_end:
        series.append({"date": d, "balance": balance_at(d)})
        d += timedelta(days=7)

    selected = {"date": target_date, "balance": balance_at(target_date)} if target_date else None

    return {"average_salary": avg_salary, "series": series, "selected": selected}
