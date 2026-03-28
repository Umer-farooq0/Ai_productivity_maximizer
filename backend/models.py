from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


class TaskTypeEnum(str, enum.Enum):
    assignment = "assignment"
    quiz = "quiz"
    midterm = "midterm"
    final = "final"
    personal = "personal"


class SessionTypeEnum(str, enum.Enum):
    study = "study"
    break_ = "break"
    namaz = "namaz"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=True)
    is_namaz_breaks_enabled = Column(Boolean, default=False, nullable=False)
    namaz_times = Column(Text, nullable=True)  # JSON string
    study_mode_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("StudySchedule", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(SAEnum(TaskTypeEnum), nullable=False, default=TaskTypeEnum.assignment)
    deadline = Column(DateTime, nullable=False)
    difficulty = Column(Integer, nullable=False, default=3)  # 1-5
    estimated_hours = Column(Float, nullable=False, default=1.0)
    is_completed = Column(Boolean, default=False, nullable=False)
    priority_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="tasks")
    study_sessions = relationship("StudySession", back_populates="task")


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    session_type = Column(SAEnum(SessionTypeEnum), nullable=False, default=SessionTypeEnum.study)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="study_sessions")
    task = relationship("Task", back_populates="study_sessions")


class StudySchedule(Base):
    __tablename__ = "study_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    generated_date = Column(Date, nullable=False)
    schedule_data = Column(Text, nullable=False)  # JSON text
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="schedules")
