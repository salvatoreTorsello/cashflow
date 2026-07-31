from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Numeric, String, Date, DateTime, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CommitmentStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    paid = "paid"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)

    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="category")
    commitments: Mapped[List["Commitment"]] = relationship("Commitment", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    commitment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("commitments.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped["Category"] = relationship("Category", back_populates="transactions")
    commitment: Mapped[Optional["Commitment"]] = relationship("Commitment", back_populates="transactions")


class Commitment(Base):
    __tablename__ = "commitments"

    id: Mapped[int] = mapped_column(primary_key=True)
    due_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[CommitmentStatus] = mapped_column(SQLEnum(CommitmentStatus), default=CommitmentStatus.pending)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("commitments.id"), nullable=True)

    category: Mapped["Category"] = relationship("Category", back_populates="commitments")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="commitment")
