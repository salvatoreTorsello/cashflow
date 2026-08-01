from pydantic import BaseModel, ConfigDict, Field, model_validator
from decimal import Decimal
from datetime import date, datetime
from typing import Optional

from app.models import CommitmentStatus


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TransactionBase(BaseModel):
    date: date
    amount: Decimal
    category_id: int
    description: Optional[str] = None
    commitment_id: Optional[int] = None

    @model_validator(mode="after")
    def check_amount_sign(self):
        if self.commitment_id is not None and self.amount >= 0:
            raise ValueError(
                "amount must be negative when linked to a commitment"
            )
        return self


class TransactionCreate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    id: int
    created_at: datetime
    category: CategoryOut

    model_config = ConfigDict(from_attributes=True)


class TransactionUpdate(BaseModel):
    date: Optional[date] = None
    amount: Optional[Decimal] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    commitment_id: Optional[int] = None


class CommitmentBase(BaseModel):
    due_date: date
    amount: Decimal = Field(..., lt=0)
    category_id: int
    description: Optional[str] = None
    status: CommitmentStatus = CommitmentStatus.pending
    parent_id: Optional[int] = None


class CommitmentCreate(CommitmentBase):
    pass


class CommitmentOut(CommitmentBase):
    id: int
    category: CategoryOut

    model_config = ConfigDict(from_attributes=True)


class CommitmentUpdate(BaseModel):
    due_date: Optional[date] = None
    amount: Optional[Decimal] = Field(None, lt=0)
    category_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[CommitmentStatus] = None
    parent_id: Optional[int] = None


class DashboardSummary(BaseModel):
    balance: Decimal
    pending_commitments_total: Decimal
    safe_margin: Decimal
    next_commitment: Optional[CommitmentOut] = None

    model_config = ConfigDict(from_attributes=True)
