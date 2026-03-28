from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
import models  # noqa: F401 — registers ORM models with Base

from routers import auth_routes, tasks, schedule, analytics, settings

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Productivity Maximizer API",
    description="Backend API for the AI Productivity Maximizer for Students application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers under /api/v1
PREFIX = "/api/v1"
app.include_router(auth_routes.router, prefix=PREFIX)
app.include_router(tasks.router,       prefix=PREFIX)
app.include_router(schedule.router,    prefix=PREFIX)
app.include_router(analytics.router,   prefix=PREFIX)
app.include_router(settings.router,    prefix=PREFIX)


@app.get("/")
def root():
    return {
        "message": "AI Productivity Maximizer API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
