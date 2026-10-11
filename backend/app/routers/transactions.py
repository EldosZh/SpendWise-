from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction
from ..schemas import CATEGORIES, TransactionInput, TransactionOut, TransactionPage, TransactionPatch, to_minor_units

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def output(row: Transaction) -> dict:
    return {"id": row.id, "type": row.type, "amount": Decimal(row.amount_minor) / 100,
            "category": row.category, "description": row.description,
            "transaction_date": row.transaction_date, "created_at": row.created_at,
            "updated_at": row.updated_at}


@router.get("", response_model=TransactionPage)
def list_transactions(limit: int = Query(10, ge=1, le=100), offset: int = Query(0, ge=0),
                      type: Literal["income", "expense"] | None = None,
                      category: str | None = None, start_date: date | None = None,
                      end_date: date | None = None, search: str | None = Query(None, max_length=200),
                      sort: Literal["newest", "oldest"] = "newest", db: Session = Depends(get_db)):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422, "start_date must be on or before end_date")
    query = select(Transaction)
    if type:
        query = query.where(Transaction.type == type)
    if category:
        if category not in CATEGORIES["income"] + CATEGORIES["expense"]:
            raise HTTPException(422, "Invalid category")
        query = query.where(Transaction.category == category)
    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search.strip()}%"))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    order = Transaction.transaction_date.desc() if sort == "newest" else Transaction.transaction_date.asc()
    rows = db.scalars(query.order_by(order, Transaction.id.desc()).offset(offset).limit(limit)).all()
    return {"items": [output(row) for row in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    row = db.get(Transaction, transaction_id)
    if not row:
        raise HTTPException(404, "Transaction not found")
    return output(row)


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(body: TransactionInput, db: Session = Depends(get_db)):
    row = Transaction(type=body.type, amount_minor=to_minor_units(body.amount), category=body.category,
                      description=body.description, transaction_date=body.transaction_date)
    db.add(row)
    db.commit()
    db.refresh(row)
    return output(row)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: int, body: TransactionPatch, db: Session = Depends(get_db)):
    row = db.get(Transaction, transaction_id)
    if not row:
        raise HTTPException(404, "Transaction not found")
    changes = body.model_dump(exclude_unset=True)
    new_type = changes.get("type", row.type)
    new_category = changes.get("category", row.category)
    if new_category not in CATEGORIES[new_type]:
        raise HTTPException(422, "Invalid category for transaction type")
    if "amount" in changes and changes["amount"] is not None:
        row.amount_minor = to_minor_units(changes.pop("amount"))
    for key, value in changes.items():
        if value is not None:
            setattr(row, key, value.strip() if key == "description" else value)
    db.commit()
    db.refresh(row)
    return output(row)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    row = db.get(Transaction, transaction_id)
    if not row:
        raise HTTPException(404, "Transaction not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)
