from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from database import get_db
from auth import get_current_user
import models
import schemas
from ml.train_model import predict_performance

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    total = len(all_tasks)
    completed = sum(1 for t in all_tasks if t.is_completed)
    completion_rate = round(completed / total * 100, 1) if total else 0.0

    # Simple streak: count consecutive days with at least one completed task
    today = date.today()
    streak = 0
    for offset in range(30):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        has_completion = any(
            t.is_completed and t.updated_at and day_start <= t.updated_at <= day_end
            for t in all_tasks
        )
        if has_completion:
            streak += 1
        else:
            break

    upcoming_tasks = [
        t for t in all_tasks
        if not t.is_completed and t.deadline >= datetime.utcnow()
    ]
    upcoming_tasks.sort(key=lambda t: t.deadline)

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": total - completed,
        "completion_rate": completion_rate,
        "streak_days": streak,
        "upcoming_tasks_count": len(upcoming_tasks),
        "next_deadline": upcoming_tasks[0].deadline.isoformat() if upcoming_tasks else None,
    }


@router.get("/performance-prediction")
def performance_prediction(
    age: int = Query(default=20),
    gender: str = Query(default="Male"),
    study_hours_per_day: float = Query(default=4.0),
    social_media_hours: float = Query(default=2.0),
    netflix_hours: float = Query(default=1.0),
    part_time_job: str = Query(default="No"),
    attendance_percentage: float = Query(default=80.0),
    sleep_hours: float = Query(default=7.0),
    diet_quality: str = Query(default="Good"),
    exercise_frequency: int = Query(default=3),
    parental_education_level: str = Query(default="Bachelor"),
    internet_quality: str = Query(default="Good"),
    mental_health_rating: int = Query(default=7),
    extracurricular_participation: str = Query(default="Yes"),
    current_user: models.User = Depends(get_current_user),
):
    input_data = {
        "age": age,
        "gender": gender,
        "study_hours_per_day": study_hours_per_day,
        "social_media_hours": social_media_hours,
        "netflix_hours": netflix_hours,
        "part_time_job": part_time_job,
        "attendance_percentage": attendance_percentage,
        "sleep_hours": sleep_hours,
        "diet_quality": diet_quality,
        "exercise_frequency": exercise_frequency,
        "parental_education_level": parental_education_level,
        "internet_quality": internet_quality,
        "mental_health_rating": mental_health_rating,
        "extracurricular_participation": extracurricular_participation,
    }
    return predict_performance(input_data)


@router.get("/progress")
def get_progress(
    period: str = Query(default="weekly", description="weekly or monthly"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    days = 7 if period == "weekly" else 30

    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()

    progress = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        created = sum(
            1 for t in tasks
            if t.created_at and day_start <= t.created_at.replace(tzinfo=None) <= day_end
        )
        completed = sum(
            1 for t in tasks
            if t.is_completed and t.updated_at
            and day_start <= t.updated_at.replace(tzinfo=None) <= day_end
        )
        progress.append({"date": day.isoformat(), "created": created, "completed": completed})

    return {"period": period, "data": progress}
