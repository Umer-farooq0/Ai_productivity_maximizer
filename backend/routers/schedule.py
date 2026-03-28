from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
import json

from database import get_db
from auth import get_current_user
import models
import schemas
from ml.scheduler import generate_schedule

router = APIRouter(prefix="/schedule", tags=["schedule"])


def _tasks_to_dicts(tasks):
    result = []
    for t in tasks:
        result.append({
            "id": t.id,
            "title": t.title,
            "deadline": t.deadline.isoformat(),
            "difficulty": t.difficulty,
            "estimated_hours": t.estimated_hours,
            "is_completed": t.is_completed,
            "task_type": t.task_type.value if hasattr(t.task_type, "value") else t.task_type,
        })
    return result


@router.post("/generate", response_model=schemas.StudyScheduleResponse)
def generate_ai_schedule(
    request: schemas.ScheduleGenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(models.Task)
        .filter(models.Task.user_id == current_user.id, ~models.Task.is_completed)
        .all()
    )
    user_settings = {
        "is_namaz_breaks_enabled": current_user.is_namaz_breaks_enabled,
        "namaz_times": current_user.namaz_times,
        "study_mode_enabled": current_user.study_mode_enabled,
    }
    schedule = generate_schedule(_tasks_to_dicts(tasks), user_settings, days=request.days)

    db_schedule = models.StudySchedule(
        user_id=current_user.id,
        generated_date=date.today(),
        schedule_data=json.dumps(schedule),
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.get("/latest", response_model=schemas.StudyScheduleResponse)
def get_latest_schedule(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = (
        db.query(models.StudySchedule)
        .filter(models.StudySchedule.user_id == current_user.id)
        .order_by(models.StudySchedule.created_at.desc())
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule generated yet")
    return schedule


@router.get("/today")
def get_today_schedule(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = (
        db.query(models.StudySchedule)
        .filter(models.StudySchedule.user_id == current_user.id)
        .order_by(models.StudySchedule.created_at.desc())
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found")

    data = json.loads(schedule.schedule_data)
    today_str = date.today().isoformat()
    today_slots = [d for d in data.get("days", []) if d.get("date") == today_str]
    return {"date": today_str, "schedule": today_slots}


@router.get("/week")
def get_week_schedule(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    schedule = (
        db.query(models.StudySchedule)
        .filter(models.StudySchedule.user_id == current_user.id)
        .order_by(models.StudySchedule.created_at.desc())
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No schedule found")

    data = json.loads(schedule.schedule_data)
    today = date.today()
    week_dates = {(today + timedelta(days=i)).isoformat() for i in range(7)}
    week_slots = [d for d in data.get("days", []) if d.get("date") in week_dates]
    return {"week_start": today.isoformat(), "schedule": week_slots}
