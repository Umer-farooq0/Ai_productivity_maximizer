# AI Productivity Maximizer — Backend

FastAPI backend for the AI Productivity Maximizer for Students application.

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| Database | SQLite via SQLAlchemy 2.0 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| ML | scikit-learn RandomForest |
| Server | Uvicorn |

## Quick Start

```bash
cd backend
pip install -r requirements.txt

# Train the ML model (one-time)
python ml/train_model.py

# Start the development server
uvicorn main:app --reload --port 8000
```

API docs available at **http://localhost:8000/docs**

## Project Structure

```
backend/
├── main.py              # FastAPI app, CORS, router registration
├── database.py          # SQLAlchemy engine & session factory
├── models.py            # ORM models (User, Task, StudySession, StudySchedule)
├── schemas.py           # Pydantic request/response schemas
├── auth.py              # JWT helpers, password hashing, current-user dependency
├── requirements.txt
├── routers/
│   ├── auth_routes.py   # POST /auth/register, /auth/login, GET/PUT /auth/me
│   ├── tasks.py         # CRUD for tasks + /complete + /upcoming
│   ├── schedule.py      # AI schedule generation & retrieval
│   ├── analytics.py     # Dashboard, performance prediction, progress
│   └── settings.py      # Namaz breaks, study mode
└── ml/
    ├── train_model.py   # RandomForest training + predict_performance()
    ├── scheduler.py     # Pomodoro + Namaz-aware schedule generator
    └── artifacts/       # Saved model, encoders, feature names (after training)
```

## API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Create account |
| POST | `/login` | ❌ | Login → JWT token |
| GET | `/me` | ✅ | Get own profile |
| PUT | `/me` | ✅ | Update name / email |

### Tasks — `/api/v1/tasks`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List tasks (filters: completed, task_type, upcoming) |
| POST | `/` | Create task |
| GET | `/upcoming` | Tasks due in next 7 days |
| GET | `/{id}` | Get single task |
| PUT | `/{id}` | Update task |
| DELETE | `/{id}` | Delete task |
| POST | `/{id}/complete` | Mark task complete |

### Schedule — `/api/v1/schedule`
| Method | Path | Description |
|---|---|---|
| POST | `/generate` | Generate AI schedule |
| GET | `/latest` | Latest generated schedule |
| GET | `/today` | Today's time slots |
| GET | `/week` | This week's time slots |

### Analytics — `/api/v1/analytics`
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Summary stats & streak |
| GET | `/performance-prediction` | ML performance prediction |
| GET | `/progress` | Weekly/monthly progress |

### Settings — `/api/v1/settings`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Get user settings |
| PUT | `/` | Update Namaz/study mode settings |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./productivity.db` | Database connection string |
| `SECRET_KEY` | `ai_productivity_secret_key_2024` | JWT signing key |

## ML Model

The Random Forest classifier is trained on `student_habits_performance.csv` and predicts whether a student will achieve a high exam score (≥ 70).  
Features: age, gender, study hours, social media hours, Netflix hours, part-time job, attendance, sleep hours, diet quality, exercise frequency, parental education level, internet quality, mental health rating, extracurricular participation.
