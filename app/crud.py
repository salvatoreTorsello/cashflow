import calendar
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas


## Categories


def create_category(db: Session, obj: schemas.CategoryCreate):
    db_obj = models.Category(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_categories(db: Session):
    return db.query(models.Category).order_by(models.Category.name).all()


def get_category(db: Session, category_id: int):
    return (
        db.query(models.Category)
        .filter(models.Category.id == category_id)
        .first()
    )


def get_category_by_name(db: Session, name: str):
    return (
        db.query(models.Category).filter(models.Category.name == name).first()
    )


## Transactions


def create_transaction(db: Session, obj: schemas.TransactionCreate):
    db_obj = models.Transaction(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_transactions(db: Session):
    return (
        db.query(models.Transaction)
        .order_by(models.Transaction.date.desc())
        .all()
    )


def edit_transaction(
    db: Session, transaction_id: int, obj: schemas.TransactionUpdate
):
    db_obj = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
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


def delete_transaction(db: Session, transaction_id: int):
    db_obj = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )
    if not db_obj:
        return None

    db.delete(db_obj)
    db.commit()
    return True


## Commitments


def create_commitment(
    db: Session, obj: schemas.CommitmentCreate
) -> models.Commitment:
    db_obj = models.Commitment(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_commitments(db: Session, status: models.CommitmentStatus | None = None):
    q = db.query(models.Commitment)
    if status:
        q = q.filter(models.Commitment.status == status)
    return q.order_by(models.Commitment.due_date).all()


def edit_commitment(
    db: Session, commitment_id: int, obj: schemas.CommitmentUpdate
):
    db_obj = (
        db.query(models.Commitment)
        .filter(models.Commitment.id == commitment_id)
        .first()
    )
    if not db_obj:
        return None

    for field, value in obj.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def execute_commitment(db: Session, commitment_id: int):
    db_obj = (
        db.query(models.Commitment)
        .filter(models.Commitment.id == commitment_id)
        .first()
    )
    if not db_obj or db_obj.status == models.CommitmentStatus.paid:
        return None

    tx = models.Transaction(
        date=db_obj.due_date,
        amount=db_obj.amount,
        category_id=db_obj.category_id,
        description=db_obj.description,
        commitment_id=db_obj.id,
    )
    db_obj.status = models.CommitmentStatus.paid
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def delete_commitment(db: Session, commitment_id: int):
    db_obj = (
        db.query(models.Commitment)
        .filter(models.Commitment.id == commitment_id)
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


def get_next_commitment(db: Session):
    return (
        db.query(models.Commitment)
        .filter(models.Commitment.status == models.CommitmentStatus.pending)
        .order_by(models.Commitment.due_date)
        .first()
    )


def get_pending_commitments_total(db: Session):
    result = (
        db.query(func.sum(models.Commitment.amount))
        .filter(models.Commitment.status == models.CommitmentStatus.pending)
        .scalar()
    )
    return result or Decimal("0")


## Balance


def get_balance(db: Session):
    result = db.query(func.sum(models.Transaction.amount)).scalar()
    return result or Decimal("0")


## Predictions


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def get_average_salary(db: Session) -> Decimal:
    amounts = (
        db.query(models.Transaction.amount)
        .join(models.Category)
        .filter(models.Category.name == "salary")
        .all()
    )
    values = [row[0] for row in amounts]
    if not values:
        return Decimal("0")
    return sum(values) / len(values)


def _get_last_salary_date(db: Session):
    return (
        db.query(func.max(models.Transaction.date))
        .join(models.Category)
        .filter(models.Category.name == "salary")
        .scalar()
    )


def _get_projected_salary_dates(db: Session, today: date, horizon_end: date) -> list[date]:
    last_salary_date = _get_last_salary_date(db)
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


def get_prediction(db: Session, target_date: date | None = None, months: int = 5):
    today = date.today()
    horizon_end = _add_months(today, months)
    query_end = max(horizon_end, target_date) if target_date else horizon_end

    current_balance = get_balance(db)
    avg_salary = get_average_salary(db)

    pending_commitments = (
        db.query(models.Commitment)
        .filter(models.Commitment.status != models.CommitmentStatus.paid)
        .filter(models.Commitment.due_date <= query_end)
        .all()
    )
    salary_dates = _get_projected_salary_dates(db, today, query_end)

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
