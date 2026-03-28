"""
AI Study Scheduler — generates a prioritised daily study timetable.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
import math


NAMAZ_DEFAULT_TIMES = {
    "Fajr":   "05:30",
    "Dhuhr":  "13:00",
    "Asr":    "16:00",
    "Maghrib":"18:30",
    "Isha":   "20:00",
}

STUDY_START_HOUR = 9   # 09:00
STUDY_END_HOUR   = 21  # 21:00
POMODORO_STUDY   = 50  # minutes of study
POMODORO_BREAK   = 10  # minutes of break
MAX_STUDY_HOURS  = 8   # per day


def _priority_score(task: dict, ref_date: date) -> float:
    try:
        deadline = datetime.fromisoformat(task["deadline"]).date()
    except (ValueError, TypeError):
        deadline = ref_date + timedelta(days=7)

    days_left = max((deadline - ref_date).days, 0.1)
    urgency   = 1 / days_left
    diff      = min(max(int(task.get("difficulty", 3)), 1), 5) / 5
    hours     = min(float(task.get("estimated_hours", 1)), 6) / 6
    return urgency * 0.5 + diff * 0.3 + hours * 0.2


def _parse_namaz_times(namaz_times_json: str | None) -> Dict[str, str]:
    """Return a dict of {name: HH:MM} from stored JSON string."""
    if not namaz_times_json:
        return NAMAZ_DEFAULT_TIMES.copy()
    import json
    try:
        parsed = json.loads(namaz_times_json)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    return NAMAZ_DEFAULT_TIMES.copy()


def _hm(time_str: str):
    """Parse 'HH:MM' → (hour, minute)."""
    h, m = time_str.split(":")
    return int(h), int(m)


def generate_schedule(
    tasks: List[Dict[str, Any]],
    user_settings: Dict[str, Any],
    days: int = 7,
) -> Dict[str, Any]:
    """
    Generate a Pomodoro-style study schedule.

    Parameters
    ----------
    tasks : list of task dicts (title, deadline, difficulty, estimated_hours, is_completed)
    user_settings : dict with keys: is_namaz_breaks_enabled, namaz_times, study_mode_enabled
    days : number of days to schedule

    Returns
    -------
    JSON-serialisable dict  { "generated_at": ..., "days": [ {date, time_slots: [...]}, ... ] }
    """
    today = date.today()
    namaz_enabled = bool(user_settings.get("is_namaz_breaks_enabled", False))
    namaz_times   = _parse_namaz_times(user_settings.get("namaz_times"))

    # Filter pending tasks and compute priority
    pending = [t for t in tasks if not t.get("is_completed", False)]
    for t in pending:
        t["_priority"] = _priority_score(t, today)
    pending.sort(key=lambda t: t["_priority"], reverse=True)

    # Build per-task remaining hours queue
    task_queue = [
        {"title": t["title"], "remaining_min": int(float(t.get("estimated_hours", 1)) * 60)}
        for t in pending
        if float(t.get("estimated_hours", 1)) > 0
    ]

    schedule_days = []

    for day_offset in range(days):
        current_date = today + timedelta(days=day_offset)
        slots: List[Dict[str, Any]] = []

        # Build minute-level timeline for the day (9:00 → 21:00)
        day_start_min = STUDY_START_HOUR * 60
        day_end_min   = STUDY_END_HOUR   * 60
        current_min   = day_start_min
        studied_min   = 0

        # Pre-compute namaz blocks as (start_min, end_min, label)
        namaz_blocks = []
        if namaz_enabled:
            for name, tstr in namaz_times.items():
                h, m = _hm(tstr)
                blk_start = h * 60 + m
                blk_end   = blk_start + 15
                if day_start_min <= blk_start < day_end_min:
                    namaz_blocks.append((blk_start, blk_end, name))
            namaz_blocks.sort()

        pomodoro_study_remaining = POMODORO_STUDY  # minutes left in current pomodoro

        while current_min < day_end_min and studied_min < MAX_STUDY_HOURS * 60:
            # Check if a namaz break starts now or would overlap next slot
            namaz_hit = None
            for (nb_start, nb_end, nb_name) in namaz_blocks:
                if nb_start <= current_min < nb_end:
                    namaz_hit = (nb_start, nb_end, nb_name)
                    break
                if current_min < nb_start <= current_min + pomodoro_study_remaining:
                    # Namaz falls inside our next study block → study up to namaz
                    pomodoro_study_remaining = nb_start - current_min

            if namaz_hit:
                nb_start, nb_end, nb_name = namaz_hit
                slots.append({
                    "start": _fmt(current_date, current_min),
                    "end":   _fmt(current_date, nb_end),
                    "type":  "namaz",
                    "label": f"🕌 {nb_name} Prayer",
                })
                current_min = nb_end
                # Remove processed namaz block
                namaz_blocks = [(s, e, n) for (s, e, n) in namaz_blocks if n != nb_name]
                pomodoro_study_remaining = POMODORO_STUDY
                continue

            if not task_queue:
                # No tasks left — mark remaining as free time
                slots.append({
                    "start": _fmt(current_date, current_min),
                    "end":   _fmt(current_date, day_end_min),
                    "type":  "free",
                    "label": "✅ Free Time / Rest",
                })
                break

            # Study slot
            task = task_queue[0]
            study_chunk = min(pomodoro_study_remaining, task["remaining_min"], day_end_min - current_min)
            if study_chunk <= 0:
                break

            slots.append({
                "start": _fmt(current_date, current_min),
                "end":   _fmt(current_date, current_min + study_chunk),
                "type":  "study",
                "label": f"📖 {task['title']}",
            })
            current_min   += study_chunk
            studied_min   += study_chunk
            task["remaining_min"] -= study_chunk
            pomodoro_study_remaining -= study_chunk

            if task["remaining_min"] <= 0:
                task_queue.pop(0)

            if pomodoro_study_remaining <= 0:
                # Pomodoro break
                break_end = min(current_min + POMODORO_BREAK, day_end_min)
                slots.append({
                    "start": _fmt(current_date, current_min),
                    "end":   _fmt(current_date, break_end),
                    "type":  "break",
                    "label": "☕ Short Break",
                })
                current_min = break_end
                pomodoro_study_remaining = POMODORO_STUDY

        schedule_days.append({
            "date":       current_date.isoformat(),
            "day_name":   current_date.strftime("%A"),
            "time_slots": slots,
            "total_study_hours": round(studied_min / 60, 2),
        })

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "days":         schedule_days,
        "total_days":   days,
    }


def _fmt(d: date, minutes: int) -> str:
    """Convert a date + minute-offset into an ISO datetime string."""
    h, m = divmod(int(minutes), 60)
    return datetime(d.year, d.month, d.day, h, m).isoformat()
