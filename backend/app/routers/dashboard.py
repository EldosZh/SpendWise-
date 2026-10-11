from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, extract, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction
from ..routers.transactions import output

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    row = db.execute(select(
        func.coalesce(func.sum(case((Transaction.type == "income", Transaction.amount_minor), else_=0)), 0),
        func.coalesce(func.sum(case((Transaction.type == "expense", Transaction.amount_minor), else_=0)), 0),
        func.count(Transaction.id),
    )).one()
    income, expense, count = map(int, row)
    recent = db.scalars(select(Transaction).order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).limit(5)).all()
    return {"total_income_minor": income, "total_expenses_minor": expense,
            "balance_minor": income - expense, "transaction_count": count,
            "recent_transactions": [output(item) for item in recent]}


@router.get("/category-breakdown")
def category_breakdown(db: Session = Depends(get_db)):
    rows = db.execute(select(Transaction.category, func.sum(Transaction.amount_minor).label("total_minor"))
                      .where(Transaction.type == "expense").group_by(Transaction.category)
                      .order_by(func.sum(Transaction.amount_minor).desc())).all()
    return [{"category": category, "total_minor": int(total)} for category, total in rows]


@router.get("/monthly-summary")
def monthly_summary(year: int | None = Query(default=None, ge=1900, le=2100), db: Session = Depends(get_db)):
    target_year = year or date.today().year
    rows = db.execute(select(extract("month", Transaction.transaction_date).label("month"),
        func.sum(case((Transaction.type == "income", Transaction.amount_minor), else_=0)),
        func.sum(case((Transaction.type == "expense", Transaction.amount_minor), else_=0)))
        .where(extract("year", Transaction.transaction_date) == target_year)
        .group_by("month").order_by("month")).all()
    values = {int(month): (int(income or 0), int(expense or 0)) for month, income, expense in rows}
    return [{"month": month, "income_minor": values.get(month, (0, 0))[0],
             "expenses_minor": values.get(month, (0, 0))[1]} for month in range(1, 13)]
