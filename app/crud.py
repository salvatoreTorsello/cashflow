from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas


def create_category(db: Session, obj: schemas.CategoryCreate):
    db_obj = models.Category(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_categories(db: Session):
    return db.query(models.Category).order_by(models.Category.name).all()


def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()


def get_category_by_name(db: Session, name: str):
    return db.query(models.Category).filter(models.Category.name == name).first()


def create_transaction(db: Session, obj: schemas.TransactionCreate):
    db_obj = models.Transaction(**obj.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_transactions(db: Session):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()


def create_commitment(db: Session, obj: schemas.CommitmentCreate):
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


def execute_commitment(db: Session, commitment_id: int):
    c = db.query(models.Commitment).filter(models.Commitment.id == commitment_id).first()
    if not c or c.status == models.CommitmentStatus.paid:
        return None

    tx = models.Transaction(
        date=c.due_date,
        amount=c.amount,
        category_id=c.category_id,
        description=c.description,
        commitment_id=c.id
    )
    c.status = models.CommitmentStatus.paid
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_balance(db: Session):
    result = db.query(func.sum(models.Transaction.amount)).scalar()
    return result or Decimal("0")


def get_pending_commitments_total(db: Session):
    result = db.query(func.sum(models.Commitment.amount)).filter(
        models.Commitment.status == models.CommitmentStatus.pending
    ).scalar()
    return result or Decimal("0")


def get_next_commitment(db: Session):
    return db.query(models.Commitment).filter(
        models.Commitment.status == models.CommitmentStatus.pending
        ).order_by(models.Commitment.due_date).first()
