from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Integer,
    Numeric,
    String,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Enum as SQLEnum,
    func,
    true as sa_true,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CommitmentStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    paid = "paid"


class CommitmentType(str, PyEnum):
    one_time = "one_time"
    periodic = "periodic"
    installment = "installment"


class IntervalUnit(str, PyEnum):
    day = "day"
    week = "week"
    month = "month"
    year = "year"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="owner", cascade="all, delete-orphan"
    )
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )


class UserSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_workspace_owner_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped["User"] = relationship("User", back_populates="workspaces")
    categories: Mapped[List["Category"]] = relationship(
        "Category", back_populates="workspace", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="workspace", cascade="all, delete-orphan"
    )
    commitments: Mapped[List["Commitment"]] = relationship(
        "Commitment", back_populates="workspace", cascade="all, delete-orphan"
    )
    commitment_series: Mapped[List["CommitmentSeries"]] = relationship(
        "CommitmentSeries", back_populates="workspace", cascade="all, delete-orphan"
    )


class CommitmentSeries(Base):
    __tablename__ = "commitment_series"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    type: Mapped[CommitmentType] = mapped_column(SQLEnum(CommitmentType))
    interval_count: Mapped[int] = mapped_column(Integer)
    interval_unit: Mapped[IntervalUnit] = mapped_column(SQLEnum(IntervalUnit))
    # Only set for installment series — periodic series have no fixed end.
    total_installments: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # False once a "delete this and future occurrences" action has cancelled
    # the series — checked before replenishing so paying an older, still-
    # pending occurrence can't resurrect a series the user already ended.
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=sa_true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="commitment_series")
    commitments: Mapped[List["Commitment"]] = relationship(
        "Commitment", back_populates="series", cascade="all, delete-orphan"
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_category_workspace_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    name: Mapped[str] = mapped_column(String)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="categories")
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="category"
    )
    commitments: Mapped[List["Commitment"]] = relationship(
        "Commitment", back_populates="category"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    commitment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("commitments.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="transactions")
    category: Mapped["Category"] = relationship(
        "Category", back_populates="transactions"
    )
    commitment: Mapped[Optional["Commitment"]] = relationship(
        "Commitment", back_populates="transactions"
    )


class Commitment(Base):
    __tablename__ = "commitments"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    due_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[CommitmentStatus] = mapped_column(
        SQLEnum(CommitmentStatus), default=CommitmentStatus.pending
    )
    series_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("commitment_series.id"), nullable=True
    )
    # Only set for installment occurrences — position within the series (1-based).
    installment_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="commitments")
    category: Mapped["Category"] = relationship(
        "Category", back_populates="commitments"
    )
    transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", back_populates="commitment"
    )
    series: Mapped[Optional["CommitmentSeries"]] = relationship(
        "CommitmentSeries", back_populates="commitments"
    )
