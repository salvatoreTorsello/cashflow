import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from decimal import Decimal
from typing import Optional

from app.models import CommitmentStatus, CommitmentType, IntervalUnit


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class UserOut(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceOut(BaseModel):
    id: int
    name: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TransactionBase(BaseModel):
    date: datetime.date
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
    created_at: datetime.datetime
    category: CategoryOut

    model_config = ConfigDict(from_attributes=True)


class TransactionUpdate(BaseModel):
    date: Optional[datetime.date] = None
    amount: Optional[Decimal] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    commitment_id: Optional[int] = None


class CommitmentBase(BaseModel):
    due_date: datetime.date
    amount: Decimal = Field(..., lt=0)
    category_id: int
    description: Optional[str] = None
    status: CommitmentStatus = CommitmentStatus.pending


class CommitmentCreate(BaseModel):
    type: CommitmentType = CommitmentType.one_time
    due_date: datetime.date
    category_id: int
    description: Optional[str] = None
    status: CommitmentStatus = CommitmentStatus.pending

    # one_time and periodic: a single repeated amount.
    amount: Optional[Decimal] = Field(None, lt=0)
    # periodic and installment.
    interval_count: Optional[int] = Field(None, ge=1)
    interval_unit: Optional[IntervalUnit] = None
    # installment only.
    total_installments: Optional[int] = Field(None, ge=1)
    installment_amounts: Optional[list[Decimal]] = None

    @model_validator(mode="after")
    def validate_by_type(self):
        if self.type == CommitmentType.one_time:
            if self.amount is None:
                raise ValueError("amount is required for one-time commitments")
        elif self.type == CommitmentType.periodic:
            if self.amount is None:
                raise ValueError("amount is required for periodic commitments")
            if self.interval_count is None or self.interval_unit is None:
                raise ValueError(
                    "interval_count and interval_unit are required for periodic commitments"
                )
            if not self.description:
                raise ValueError("description is required for periodic commitments")
        elif self.type == CommitmentType.installment:
            if self.interval_count is None or self.interval_unit is None:
                raise ValueError(
                    "interval_count and interval_unit are required for installment commitments"
                )
            if not self.total_installments:
                raise ValueError("total_installments is required for installment commitments")
            if not self.installment_amounts or len(self.installment_amounts) != self.total_installments:
                raise ValueError(
                    "installment_amounts must have exactly total_installments entries"
                )
            if any(a >= 0 for a in self.installment_amounts):
                raise ValueError("installment amounts must be negative")
            if not self.description:
                raise ValueError("description is required for installment commitments")
        return self


class CommitmentSeriesOut(BaseModel):
    id: int
    type: CommitmentType
    interval_count: int
    interval_unit: IntervalUnit
    total_installments: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CommitmentOut(CommitmentBase):
    id: int
    category: CategoryOut
    series_id: Optional[int] = None
    installment_number: Optional[int] = None
    series: Optional[CommitmentSeriesOut] = None

    model_config = ConfigDict(from_attributes=True)


class CommitmentUpdate(BaseModel):
    due_date: Optional[datetime.date] = None
    amount: Optional[Decimal] = Field(None, lt=0)
    category_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[CommitmentStatus] = None


class CommitmentExecute(BaseModel):
    date: Optional[datetime.date] = None
    amount: Optional[Decimal] = Field(None, lt=0)
    description: Optional[str] = None


class DashboardSummary(BaseModel):
    balance: Decimal
    pending_commitments_total: Decimal
    safe_margin: Decimal
    next_commitment: Optional[CommitmentOut] = None

    model_config = ConfigDict(from_attributes=True)


class PredictionPoint(BaseModel):
    date: datetime.date
    balance: Decimal


class PredictionResponse(BaseModel):
    average_salary: Decimal
    series: list[PredictionPoint]
    selected: Optional[PredictionPoint] = None
