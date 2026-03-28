from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=schemas.SettingsResponse)
def get_settings(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("", response_model=schemas.SettingsResponse)
def update_settings(
    settings_update: schemas.SettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if settings_update.is_namaz_breaks_enabled is not None:
        current_user.is_namaz_breaks_enabled = settings_update.is_namaz_breaks_enabled
    if settings_update.namaz_times is not None:
        current_user.namaz_times = settings_update.namaz_times
    if settings_update.study_mode_enabled is not None:
        current_user.study_mode_enabled = settings_update.study_mode_enabled
    db.commit()
    db.refresh(current_user)
    return current_user
