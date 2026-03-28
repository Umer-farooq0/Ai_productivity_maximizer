"""
ML model training for student academic performance prediction.
Run directly to train and save the model:
    python ml/train_model.py
"""
import os
import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

# Paths
_HERE = Path(__file__).resolve().parent
ARTIFACTS_DIR = _HERE / "artifacts"
# CSV can be overridden via env var; default resolves relative to the repo root
_DEFAULT_CSV = _HERE.parent.parent / "student_habits_performance.csv"
CSV_PATH = Path(os.getenv("STUDENT_CSV_PATH", str(_DEFAULT_CSV)))

MODEL_PATH = ARTIFACTS_DIR / "performance_model.pkl"
ENCODERS_PATH = ARTIFACTS_DIR / "label_encoders.pkl"
FEATURES_PATH = ARTIFACTS_DIR / "feature_names.pkl"

CATEGORICAL_COLS = [
    "gender", "part_time_job", "diet_quality",
    "parental_education_level", "internet_quality",
    "extracurricular_participation",
]

FEATURE_COLS = [
    "age", "gender", "study_hours_per_day", "social_media_hours",
    "netflix_hours", "part_time_job", "attendance_percentage",
    "sleep_hours", "diet_quality", "exercise_frequency",
    "parental_education_level", "internet_quality",
    "mental_health_rating", "extracurricular_participation",
]


def _load_artifacts():
    """Load saved model artifacts; raise FileNotFoundError if missing."""
    model = joblib.load(MODEL_PATH)
    label_encoders = joblib.load(ENCODERS_PATH)
    feature_names = joblib.load(FEATURES_PATH)
    return model, label_encoders, feature_names


def train():
    """Train the Random Forest model and persist artifacts."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(CSV_PATH)

    # Drop student_id if present
    df = df.drop(columns=["student_id"], errors="ignore")

    # Binary target: 1 if exam_score >= 70, else 0
    df["target"] = (df["exam_score"] >= 70).astype(int)

    # Label-encode categoricals
    label_encoders = {}
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    X = df[FEATURE_COLS]
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    clf = RandomForestClassifier(n_estimators=300, max_depth=10, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, clf.predict(X_test))
    print(f"Model accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")

    joblib.dump(clf, MODEL_PATH)
    joblib.dump(label_encoders, ENCODERS_PATH)
    joblib.dump(list(X.columns), FEATURES_PATH)
    print(f"Artifacts saved to {ARTIFACTS_DIR}")


def predict_performance(input_data: dict) -> dict:
    """
    Predict academic performance from student habit data.

    Parameters
    ----------
    input_data : dict
        Keys: age, gender, study_hours_per_day, social_media_hours,
              netflix_hours, part_time_job, attendance_percentage,
              sleep_hours, diet_quality, exercise_frequency,
              parental_education_level, internet_quality,
              mental_health_rating, extracurricular_participation

    Returns
    -------
    dict
        {"prediction": "High"|"Low", "probability": float, "tips": [...]}
    """
    try:
        model, label_encoders, feature_names = _load_artifacts()
    except FileNotFoundError:
        # Fallback: train on-the-fly if artifacts are missing
        train()
        model, label_encoders, feature_names = _load_artifacts()

    row = {}
    for col in feature_names:
        val = input_data.get(col)
        if col in label_encoders:
            le: LabelEncoder = label_encoders[col]
            val_str = str(val)
            if val_str in le.classes_:
                val = int(le.transform([val_str])[0])
            else:
                val = 0  # unknown category → default
        row[col] = val if val is not None else 0

    X = pd.DataFrame([row], columns=feature_names)
    prob = float(model.predict_proba(X)[0][1])
    prediction = "High" if prob >= 0.5 else "Low"

    tips = _generate_tips(input_data, prediction)

    return {"prediction": prediction, "probability": round(prob, 4), "tips": tips}


def _generate_tips(data: dict, prediction: str) -> list:
    tips = []

    study_hours = float(data.get("study_hours_per_day", 0))
    social_hours = float(data.get("social_media_hours", 0))
    sleep_hours = float(data.get("sleep_hours", 0))
    attendance = float(data.get("attendance_percentage", 100))
    mental_health = int(data.get("mental_health_rating", 10))
    exercise = int(data.get("exercise_frequency", 0))
    netflix = float(data.get("netflix_hours", 0))

    if study_hours < 4:
        tips.append("📚 Increase your daily study hours to at least 4–6 hours for better academic results.")
    if social_hours > 3:
        tips.append("📱 Reduce social media usage to under 2 hours per day to improve focus.")
    if sleep_hours < 7:
        tips.append("😴 Aim for 7–8 hours of sleep nightly; poor sleep significantly hurts memory and concentration.")
    if attendance < 80:
        tips.append("🏫 Improve your class attendance — attending >80% of classes correlates strongly with higher scores.")
    if mental_health < 6:
        tips.append("🧘 Prioritize mental health: consider mindfulness, exercise, or speaking with a counselor.")
    if exercise < 2:
        tips.append("🏃 Exercise at least 3 times per week to boost cognitive performance and reduce stress.")
    if netflix > 2:
        tips.append("🎬 Limit streaming to 1–2 hours per day and replace that time with focused study sessions.")

    if not tips:
        if prediction == "High":
            tips.append("🌟 Great habits! Maintain your current routine and stay consistent.")
        else:
            tips.append("💡 Try to build more structured study habits and minimize distractions.")

    return tips


if __name__ == "__main__":
    train()
