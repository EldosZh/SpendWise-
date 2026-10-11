from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"]
EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Housing", "Health", "Education", "Entertainment", "Utilities", "Other"]
CATEGORIES = {"income": INCOME_CATEGORIES, "expense": EXPENSE_CATEGORIES}


def to_minor_units(value: Decimal | int | str) -> int:
    try:
        amount = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError("Amount must be a valid number") from exc
    if not amount.is_finite() or amount <= 0:
        raise ValueError("Amount must be greater than zero")
    if amount != amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP):
        raise ValueError("Amount can have at most two decimal places")
    minor = int(amount * 100)
    if minor > 2_000_000_000:
        raise ValueError("Amount is too large")
    return minor


class TransactionInput(BaseModel):
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category: str = Field(min_length=2, max_length=30)
    description: str = Field(min_length=1, max_length=200)
    transaction_date: date

    @field_validator("amount")
    @classmethod
    def check_amount(cls, value: Decimal) -> Decimal:
        to_minor_units(value)
        return value

    @field_validator("category", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value cannot be blank")
        return cleaned

    @model_validator(mode="after")
    def category_matches_type(self):
        if self.category not in CATEGORIES[self.type]:
            raise ValueError(f"Invalid category for {self.type}")
        return self


class TransactionPatch(BaseModel):
    type: Literal["income", "expense"] | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    category: str | None = Field(default=None, min_length=2, max_length=30)
    description: str | None = Field(default=None, min_length=1, max_length=200)
    transaction_date: date | None = None

    @model_validator(mode="after")
    def reject_explicit_nulls(self):
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Patch values cannot be null")
        return self

    @field_validator("amount")
    @classmethod
    def check_amount(cls, value):
        if value is not None:
            to_minor_units(value)
        return value

    @field_validator("category", "description")
    @classmethod
    def strip_patch_text(cls, value):
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value cannot be blank")
        return cleaned


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    amount: Decimal
    category: str
    description: str
    transaction_date: date
    created_at: datetime
    updated_at: datetime


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int
