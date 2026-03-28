from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _calc_priority(task: models.Task) -> float:
    now = datetime.utcnow()
    days_left = max((task.deadline - now).total_seconds() / 86400, 0.1)
    urgency = 1 / days_left
    difficulty_score = task.difficulty / 5
    hours_score = min(task.estimated_hours, 6) / 6
    return round(urgency * 0.5 + difficulty_score * 0.3 + hours_score * 0.2, 4)


@router.get("", response_model=List[schemas.TaskResponse])
def list_tasks(
    completed: Optional[bool] = Query(None),
    task_type: Optional[schemas.TaskTypeEnum] = Query(None),
    upcoming: Optional[bool] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)
    if completed is not None:
        query = query.filter(models.Task.is_completed == completed)
    if task_type is not None:
        query = query.filter(models.Task.task_type == task_type)
    if upcoming:
        cutoff = datetime.utcnow() + timedelta(days=7)
        query = query.filter(
            models.Task.deadline <= cutoff,
            ~models.Task.is_completed,
        )
    return query.order_by(models.Task.deadline).all()


@router.post("", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = models.Task(user_id=current_user.id, **task_in.model_dump())
    task.priority_score = _calc_priority(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/upcoming", response_model=List[schemas.TaskResponse])
def get_upcoming_tasks(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = datetime.utcnow() + timedelta(days=7)
    return (
        db.query(models.Task)
        .filter(
            models.Task.user_id == current_user.id,
            models.Task.deadline <= cutoff,
            ~models.Task.is_completed,
        )
        .order_by(models.Task.deadline)
        .all()
    )


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in task_update.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    task.priority_score = _calc_priority(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/complete", response_model=schemas.TaskResponse)
def complete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_completed = True
    db.commit()
    db.refresh(task)
    return task
