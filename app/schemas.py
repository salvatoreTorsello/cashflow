import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from decimal import Decimal
from typing import Optional

from app.models import CommitmentStatus


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


class CommitmentCreate(CommitmentBase):
    pass


class CommitmentOut(CommitmentBase):
    id: int
    category: CategoryOut

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
