import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .routers import dashboard, transactions
from .schemas import CATEGORIES

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SpendWise API", version="1.0.0", description="Personal finance tracker API")
origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_credentials=False,
                   allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["*"])
app.include_router(transactions.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/api/categories", tags=["categories"])
def categories():
    return CATEGORIES
