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

    # Tasks completed today
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    completed_today = sum(
        1 for t in all_tasks
        if t.is_completed and t.updated_at
        and today_start <= t.updated_at.replace(tzinfo=None) <= today_end
    )

    # Simple streak: count consecutive days with at least one completed task
    streak = 0
    for offset in range(30):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        has_completion = any(
            t.is_completed and t.updated_at and day_start <= t.updated_at.replace(tzinfo=None) <= day_end
            for t in all_tasks
        )
        if has_completion:
            streak += 1
        else:
            break

    # Tasks completed in the last 7 days
    week_start = datetime.combine(today - timedelta(days=6), datetime.min.time())
    completed_this_week = sum(
        1 for t in all_tasks
        if t.is_completed and t.updated_at
        and t.updated_at.replace(tzinfo=None) >= week_start
    )

    # Total study hours from completed study sessions
    study_sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user.id,
        models.StudySession.session_type == models.SessionTypeEnum.study,
        models.StudySession.end_time.isnot(None),
    ).all()
    total_study_hours = round(
        sum(
            (s.end_time - s.start_time).total_seconds() / 3600
            for s in study_sessions
            if s.end_time and s.start_time
        ),
        1,
    )

    # Weekly completions: tasks completed per day for the last 7 days
    weekly_completions = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = sum(
            1 for t in all_tasks
            if t.is_completed and t.updated_at
            and day_start <= t.updated_at.replace(tzinfo=None) <= day_end
        )
        weekly_completions.append({"day": day.strftime("%a"), "count": count})

    upcoming_tasks = [
        t for t in all_tasks
        if not t.is_completed and t.deadline is not None and t.deadline >= datetime.utcnow()
    ]
    upcoming_tasks.sort(key=lambda t: t.deadline)

    upcoming_tasks_list = [
        {
            "id": t.id,
            "title": t.title,
            "task_type": t.task_type.value if hasattr(t.task_type, "value") else t.task_type,
            "deadline": t.deadline.isoformat(),
            "priority_score": t.priority_score,
        }
        for t in upcoming_tasks[:5]
    ]

    return {
        "stats": {
            "total_tasks": total,
            "completed_tasks": completed,
            "completed_today": completed_today,
            "completed_this_week": completed_this_week,
            "total_study_hours": total_study_hours,
            "pending_tasks": total - completed,
            "completion_rate": completion_rate,
            "current_streak": streak,
        },
        "weekly_completions": weekly_completions,
        # Web frontend uses "upcoming_tasks"; mobile app uses "upcoming_deadlines"
        "upcoming_tasks": upcoming_tasks_list,
        "upcoming_deadlines": upcoming_tasks_list,
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
