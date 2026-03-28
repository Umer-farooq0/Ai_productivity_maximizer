from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class TaskTypeEnum(str, Enum):
    assignment = "assignment"
    quiz = "quiz"
    midterm = "midterm"
    final = "final"
    personal = "personal"


class SessionTypeEnum(str, Enum):
    study = "study"
    break_ = "break"
    namaz = "namaz"


# ── User schemas ──────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_namaz_breaks_enabled: bool
    namaz_times: Optional[str]
    study_mode_enabled: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Auth schemas ──────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ── Task schemas ──────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: TaskTypeEnum = TaskTypeEnum.assignment
    deadline: datetime
    difficulty: int = Field(default=3, ge=1, le=5)
    estimated_hours: float = Field(default=1.0, gt=0)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type: Optional[TaskTypeEnum] = None
    deadline: Optional[datetime] = None
    difficulty: Optional[int] = Field(None, ge=1, le=5)
    estimated_hours: Optional[float] = Field(None, gt=0)
    is_completed: Optional[bool] = None


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    task_type: TaskTypeEnum
    deadline: datetime
    difficulty: int
    estimated_hours: float
    is_completed: bool
    priority_score: Optional[float]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── StudySession schemas ──────────────────────────────────────────────────────

class StudySessionCreate(BaseModel):
    task_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    session_type: SessionTypeEnum = SessionTypeEnum.study
    notes: Optional[str] = None


class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int]
    start_time: datetime
    end_time: Optional[datetime]
    session_type: SessionTypeEnum
    notes: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── StudySchedule schemas ─────────────────────────────────────────────────────

class StudyScheduleResponse(BaseModel):
    id: int
    user_id: int
    generated_date: date
    schedule_data: str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Settings schemas ──────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    is_namaz_breaks_enabled: Optional[bool] = None
    namaz_times: Optional[str] = None  # JSON string
    study_mode_enabled: Optional[bool] = None


class SettingsResponse(BaseModel):
    is_namaz_breaks_enabled: bool
    namaz_times: Optional[str]
    study_mode_enabled: bool

    model_config = {"from_attributes": True}


# ── Analytics schemas ─────────────────────────────────────────────────────────

class PerformancePredictionInput(BaseModel):
    age: int = Field(default=20, ge=15, le=30)
    gender: str = Field(default="Male")
    study_hours_per_day: float = Field(default=4.0, ge=0, le=24)
    social_media_hours: float = Field(default=2.0, ge=0, le=24)
    netflix_hours: float = Field(default=1.0, ge=0, le=24)
    part_time_job: str = Field(default="No")
    attendance_percentage: float = Field(default=80.0, ge=0, le=100)
    sleep_hours: float = Field(default=7.0, ge=0, le=24)
    diet_quality: str = Field(default="Good")
    exercise_frequency: int = Field(default=3, ge=0, le=7)
    parental_education_level: str = Field(default="Bachelor")
    internet_quality: str = Field(default="Good")
    mental_health_rating: int = Field(default=7, ge=1, le=10)
    extracurricular_participation: str = Field(default="Yes")


class ScheduleGenerateRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=30)
