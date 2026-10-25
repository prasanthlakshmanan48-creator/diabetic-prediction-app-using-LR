import os
import io
import json
import base64
import joblib
import uuid
import time
import hmac
import hashlib
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict, Any
from werkzeug.security import generate_password_hash, check_password_hash

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, func
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Firebase Admin SDK
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# =========================================================
# CONFIGURATION & DATABASE
# =========================================================

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'diabetes.db')}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# =========================================================
# DATABASE MODELS
# =========================================================

class UserAccount(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(128), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, nullable=True)
    email = Column(String(128), unique=True, index=True, nullable=True)
    password = Column(String(255), nullable=False)


class PredictionRecord(Base):
    __tablename__ = "prediction"

    id = Column(Integer, primary_key=True, index=True)
    user_uid = Column(String(128), nullable=False, index=True)  # Authenticated Firebase UID or UserAccount UID
    username = Column(String(100), nullable=True)
    patient_name = Column(String(100), default="Patient #1")
    created_at = Column(String(50), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Biometric inputs
    pregnancies = Column(Float, default=0)
    glucose = Column(Float, nullable=False)
    blood_pressure = Column(Float, nullable=False)
    skin_thickness = Column(Float, default=0)
    insulin = Column(Float, default=0)
    bmi = Column(Float, nullable=False)
    diabetes_pedigree = Column(Float, default=0.5)
    age = Column(Float, nullable=False)

    # ML Output
    prediction = Column(String(50), nullable=False)  # "Low Risk", "Medium Risk", "High Risk"
    probability = Column(Float, nullable=False)      # e.g. 74.5
    algorithm_used = Column(String(100), default="Random Forest Classifier (Scikit-Learn)")
    report_details = Column(Text, nullable=True)     # JSON details & insights


Base.metadata.create_all(bind=engine)

AUTH_SECRET = os.environ.get("SECRET_KEY", "diabetes-clinical-secret-key-2026")

def generate_session_token(uid: str, email: str) -> str:
    timestamp = int(time.time())
    raw = f"{uid}|{email}|{timestamp}"
    sig = hmac.new(AUTH_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    encoded = base64.urlsafe_b64encode(raw.encode()).decode()
    return f"apptok.{encoded}.{sig}"

def verify_session_token(token: str) -> Optional[Dict[str, str]]:
    try:
        parts = token.split(".")
        if len(parts) != 3 or parts[0] != "apptok":
            return None
        encoded, sig = parts[1], parts[2]
        raw = base64.urlsafe_b64decode(encoded.encode()).decode()
        expected_sig = hmac.new(AUTH_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        uid, email, timestamp = raw.split("|")
        # Token valid for 30 days
        if int(time.time()) - int(timestamp) > 30 * 86400:
            return None
        return {
            "uid": uid,
            "email": email,
            "name": email.split("@")[0] if "@" in email else uid
        }
    except Exception:
        return None



# =========================================================
# FIREBASE ADMIN SDK INITIALIZATION
# =========================================================

FIREBASE_INIT = False

try:
    if not firebase_admin._apps:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")

        if cred_json:
            cert_dict = json.loads(cred_json)
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)
            FIREBASE_INIT = True
            print("Firebase Admin initialized using FIREBASE_SERVICE_ACCOUNT_JSON.")
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            FIREBASE_INIT = True
            print("Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS path.")
        else:
            # Default app initialization (Render environment / Google Cloud default)
            try:
                firebase_admin.initialize_app()
                FIREBASE_INIT = True
                print("Firebase Admin initialized with default credentials.")
            except Exception:
                print("Firebase Admin initialized in Development Fallback mode.")
except Exception as e:
    print("Warning during Firebase Admin init:", e)


# =========================================================
# ML MODEL LOADING & BENCHMARKS
# =========================================================

MODEL_PATH = os.path.join(BASE_DIR, "model", "diabetes_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

ml_model = None
ml_scaler = None

try:
    if os.path.exists(MODEL_PATH):
        ml_model = joblib.load(MODEL_PATH)
        print("FastAPI: ML Model loaded successfully.")
    if os.path.exists(SCALER_PATH):
        ml_scaler = joblib.load(SCALER_PATH)
        print("FastAPI: Scaler loaded successfully.")
except Exception as e:
    print("Error loading ML Model in FastAPI:", e)

FEATURES = [
    "Pregnancies", "Glucose", "BloodPressure",
    "SkinThickness", "Insulin", "BMI",
    "DiabetesPedigreeFunction", "Age"
]

HEALTHY_BENCHMARKS = {
    "Glucose": 110.0, "BloodPressure": 68.2,
    "BMI": 30.3, "Insulin": 68.8, "Age": 31.2
}
DIABETIC_BENCHMARKS = {
    "Glucose": 141.3, "BloodPressure": 70.8,
    "BMI": 35.1, "Insulin": 100.3, "Age": 37.1
}


# =========================================================
# FASTAPI APP & CORS
# =========================================================

app = FastAPI(
    title="Diabetes Risk Prediction API - Biomedical Engineering",
    description="Secure, user-isolated patient prediction and clinical history API powered by FastAPI and Firebase Auth.",
    version="2.0.0"
)

cors_env = os.environ.get("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
        "https://diabetes-risk-frontend.onrender.com"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency: Database Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# DEPENDENCY: SECURE FIREBASE TOKEN VERIFICATION
# =========================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Verifies Firebase Authentication ID token from Authorization header.
    Extracts and returns the verified user_uid and email.
    Rejects unauthorized / missing tokens with HTTP 401.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Please log in with Firebase Authentication.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # 1. Native Secure Session Token (Built-in Auth)
    if token.startswith("apptok."):
        verified = verify_session_token(token)
        if verified:
            return verified
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Primary: Verify with Firebase Admin SDK
    if FIREBASE_INIT:
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email", "")
            name = decoded_token.get("name", email.split("@")[0] if "@" in email else uid)
            return {"uid": uid, "email": email, "name": name}
        except Exception as err:
            pass

    # 3. Development & Testing Fallback
    # Allows testing user isolation via custom token format "dev-token-<uid>" or testing tokens
    if token.startswith("dev-token-") or token.startswith("test-uid-"):
        test_uid = token.replace("dev-token-", "").replace("test-uid-", "")
        return {
            "uid": f"uid_{test_uid}",
            "email": f"{test_uid}@diabetesapp.local",
            "name": test_uid
        }

    # If verification failed and not a test token, reject with 401
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials. Please sign in.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# =========================================================
# PYDANTIC SCHEMAS
# =========================================================

class AuthRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    message: str


class PredictionRequest(BaseModel):
    patient_name: Optional[str] = Field("Patient #1", description="Patient identifier")
    pregnancies: float = Field(0, ge=0, le=25)
    glucose: float = Field(..., ge=0, le=400, description="Fasting glucose in mg/dL")
    blood_pressure: float = Field(..., ge=0, le=250, description="Diastolic blood pressure in mmHg")
    skin_thickness: float = Field(0, ge=0, le=100)
    insulin: float = Field(0, ge=0, le=900)
    bmi: float = Field(..., ge=10, le=80, description="Body Mass Index in kg/m²")
    diabetes_pedigree: float = Field(0.45, ge=0, le=3.0)
    age: float = Field(..., ge=1, le=120)


class ReportResponse(BaseModel):
    id: int
    user_uid: str
    patient_name: str
    created_at: str
    risk_category: str
    probability: float
    algorithm_used: str
    glucose: float
    blood_pressure: float
    bmi: float
    insulin: float
    age: float
    insights: List[Dict[str, str]]
    graph_base64: Optional[str] = None


# =========================================================
# CLINICAL GRAPH & INSIGHT HELPERS
# =========================================================

def generate_clinical_chart(user_vals: dict, probability: float, risk_label: str) -> Optional[str]:
    """Generates a Matplotlib dark-biomedical graphic and returns Base64 PNG."""
    try:
        plt.style.use('dark_background')
        fig, (ax1, ax2) = plt.subplots(
            1, 2, figsize=(11.5, 4.5),
            gridspec_kw={"width_ratios": [1, 1.85]},
            facecolor="#0d172b"
        )
        ax1.set_facecolor("#0d172b")
        ax2.set_facecolor("#0d172b")

        # Gauge
        meter_color = "#ef4444" if probability >= 70 else ("#00c49f" if probability >= 40 else "#3b82f6")
        prob_val = max(0.5, min(99.5, probability))
        ax1.pie(
            [prob_val, 100 - prob_val], startangle=90, counterclock=False,
            colors=[meter_color, "#162238"],
            wedgeprops=dict(width=0.32, edgecolor="#0d172b", linewidth=2.5)
        )
        ax1.text(0, 0.08, f"{probability:.1f}%", ha="center", va="center", fontsize=22, fontweight="bold", color="#ffffff")
        ax1.text(0, -0.22, risk_label, ha="center", va="center", fontsize=12, fontweight="bold", color=meter_color)
        ax1.set_title("Estimated Risk Level", fontsize=13, fontweight="bold", color="#ffffff", pad=12)

        # Bar chart
        keys = ["Glucose", "BloodPressure", "BMI", "Insulin", "Age"]
        labels = ["Glucose\n(mg/dL)", "Blood Pres.\n(mmHg)", "BMI\n(kg/m²)", "Insulin\n(μU/mL)", "Age\n(yrs)"]
        p_vals = [float(user_vals.get(k, 0)) for k in keys]
        h_vals = [HEALTHY_BENCHMARKS[k] for k in keys]
        d_vals = [DIABETIC_BENCHMARKS[k] for k in keys]

        x = np.arange(len(keys))
        w = 0.26
        ax2.bar(x - w, p_vals, w, label="Patient Metric", color="#00c49f", edgecolor="#0d172b")
        ax2.bar(x, h_vals, w, label="Healthy Benchmark", color="#3b82f6", edgecolor="#0d172b")
        ax2.bar(x + w, d_vals, w, label="Diabetic Benchmark", color="#ef4444", edgecolor="#0d172b")

        ax2.set_title("Biometric Comparison vs Population Benchmarks", fontsize=13, fontweight="bold", color="#ffffff", pad=12)
        ax2.set_xticks(x)
        ax2.set_xticklabels(labels, fontsize=9, color="#cbd5e1")
        ax2.grid(axis="y", linestyle="--", alpha=0.2, color="#334155")
        ax2.legend(loc="upper right", facecolor="#111c35", edgecolor="#1e293b", fontsize=8.5, labelcolor="#e2e8f0")

        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor="#0d172b")
        buf.seek(0)
        img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        plt.close(fig)
        return img_b64
    except Exception as e:
        print("Chart generation error:", e)
        return None


def calculate_insights(glucose: float, bmi: float, bp: float) -> List[Dict[str, str]]:
    insights = []
    if glucose >= 126:
        insights.append({"title": "Elevated Fasting Glucose", "level": "high", "message": f"Fasting glucose of {glucose:.1f} mg/dL is in the diabetes threshold (>126 mg/dL). HbA1c testing advised."})
    elif glucose >= 100:
        insights.append({"title": "Prediabetes Glucose Margin", "level": "warning", "message": f"Fasting glucose of {glucose:.1f} mg/dL is in the prediabetes margin (100–125 mg/dL)."})
    else:
        insights.append({"title": "Healthy Blood Sugar", "level": "healthy", "message": f"Fasting glucose of {glucose:.1f} mg/dL is within optimal baseline (70–99 mg/dL)."})

    if bmi >= 30:
        insights.append({"title": "Obesity Weight Category", "level": "high", "message": f"BMI of {bmi:.1f} kg/m² significantly increases insulin resistance."})
    elif bmi >= 25:
        insights.append({"title": "Overweight Margin", "level": "warning", "message": f"BMI of {bmi:.1f} kg/m² is moderately elevated."})
    else:
        insights.append({"title": "Optimal BMI", "level": "healthy", "message": f"BMI of {bmi:.1f} kg/m² is in the standard healthy weight category."})

    return insights


# =========================================================
# API ROUTES: SECURE USER ISOLATION
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Diabetes Risk Prediction FastAPI",
        "firebase_auth_active": FIREBASE_INIT,
        "database": "SQLite (diabetes.db)",
        "model_loaded": ml_model is not None
    }


# =========================================================
# NATIVE AUTHENTICATION ENDPOINTS
# =========================================================

@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(req: AuthRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = db.query(UserAccount).filter(
        (func.lower(UserAccount.email) == email_clean) |
        (func.lower(UserAccount.username) == email_clean.split("@")[0])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    user_uid = f"usr_{uuid.uuid4().hex[:12]}"
    username = email_clean.split("@")[0]
    hashed_pwd = generate_password_hash(req.password)

    new_user = UserAccount(
        uid=user_uid,
        username=username,
        email=email_clean,
        password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = generate_session_token(user_uid, email_clean)
    return {
        "token": token,
        "user": {
            "uid": user_uid,
            "email": email_clean,
            "name": username
        },
        "message": "Account created successfully!"
    }


@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(req: AuthRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(UserAccount).filter(
        (func.lower(UserAccount.email) == email_clean) |
        (func.lower(UserAccount.username) == email_clean) |
        (func.lower(UserAccount.username) == email_clean.split("@")[0])
    ).first()

    if not user or not check_password_hash(user.password, req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")

    if not user.uid:
        user.uid = f"usr_{uuid.uuid4().hex[:12]}"
        db.commit()

    token = generate_session_token(user.uid, user.email or email_clean)
    return {
        "token": token,
        "user": {
            "uid": user.uid,
            "email": user.email or email_clean,
            "name": user.username or email_clean.split("@")[0]
        },
        "message": "Logged in successfully!"
    }


@app.get("/api/user/me")
def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns verified user profile based on Firebase Auth UID."""
    return {
        "uid": current_user["uid"],
        "email": current_user.get("email"),
        "name": current_user.get("name")
    }


@app.post("/api/predict")
def create_prediction(
    req: PredictionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes diabetes prediction and saves results strictly associated
    with the authenticated user's unique Firebase UID.
    """
    if ml_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction model is currently unavailable."
        )

    # 1. Run inference
    input_df = pd.DataFrame([[
        req.pregnancies, req.glucose, req.blood_pressure,
        req.skin_thickness, req.insulin, req.bmi,
        req.diabetes_pedigree, req.age
    ]], columns=FEATURES)

    if hasattr(ml_model, "named_steps"):
        pred_val = ml_model.predict(input_df)[0]
        prob_val = float(ml_model.predict_proba(input_df)[0][1] * 100)
    else:
        scaled = ml_scaler.transform(input_df) if ml_scaler is not None else input_df
        pred_val = ml_model.predict(scaled)[0]
        prob_val = float(ml_model.predict_proba(scaled)[0][1] * 100)

    # 2. Risk classification
    if prob_val >= 70.0:
        risk_category = "High Risk"
    elif prob_val >= 40.0:
        risk_category = "Medium Risk"
    else:
        risk_category = "Low Risk"

    algorithm_used = "Random Forest Classifier (Scikit-Learn)"
    insights = calculate_insights(req.glucose, req.bmi, req.blood_pressure)

    # 3. Generate visual chart
    user_vals_dict = {
        "Glucose": req.glucose, "BloodPressure": req.blood_pressure,
        "BMI": req.bmi, "Insulin": req.insulin, "Age": req.age
    }
    graph_b64 = generate_clinical_chart(user_vals_dict, prob_val, risk_category)

    # 4. Save record strictly associated with user_uid
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    new_record = PredictionRecord(
        user_uid=current_user["uid"],  # Verified UID from token!
        username=current_user.get("name") or current_user.get("email"),
        patient_name=req.patient_name or "Patient #1",
        created_at=now_str,
        pregnancies=req.pregnancies,
        glucose=req.glucose,
        blood_pressure=req.blood_pressure,
        skin_thickness=req.skin_thickness,
        insulin=req.insulin,
        bmi=req.bmi,
        diabetes_pedigree=req.diabetes_pedigree,
        age=req.age,
        prediction=risk_category,
        probability=round(prob_val, 1),
        algorithm_used=algorithm_used,
        report_details=json.dumps(insights)
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # Feature importances
    feature_importances = {}
    if hasattr(ml_model, "feature_importances_"):
        for f, imp in zip(FEATURES, ml_model.feature_importances_):
            feature_importances[f] = round(float(imp) * 100, 1)

    return {
        "id": new_record.id,
        "user_uid": new_record.user_uid,
        "patient_name": new_record.patient_name,
        "created_at": new_record.created_at,
        "risk_category": new_record.prediction,
        "probability": new_record.probability,
        "algorithm_used": new_record.algorithm_used,
        "insights": insights,
        "feature_importances": feature_importances,
        "graph_base64": graph_b64,
        "comparison_benchmarks": {
            "labels": ["Glucose", "Blood Pressure", "BMI", "Insulin", "Age"],
            "user_values": [req.glucose, req.blood_pressure, req.bmi, req.insulin, req.age],
            "healthy_mean": [HEALTHY_BENCHMARKS[k] for k in ["Glucose", "BloodPressure", "BMI", "Insulin", "Age"]],
            "diabetic_mean": [DIABETIC_BENCHMARKS[k] for k in ["Glucose", "BloodPressure", "BMI", "Insulin", "Age"]]
        }
    }


@app.get("/api/history")
def get_user_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns prediction history STRICTLY for the authenticated user (user_uid).
    Never returns other users' or global records.
    """
    user_uid = current_user["uid"]

    # Filter strictly by user_uid
    records = db.query(PredictionRecord).filter(
        PredictionRecord.user_uid == user_uid
    ).order_by(PredictionRecord.id.desc()).all()

    # Calculate comparison with user's own previous assessment
    response_items = []
    patient_records_map: Dict[str, List[PredictionRecord]] = {}
    for r in reversed(records):
        pname = r.patient_name or "Patient #1"
        if pname not in patient_records_map:
            patient_records_map[pname] = []
        patient_records_map[pname].append(r)

    for r in records:
        pname = r.patient_name or "Patient #1"
        history = patient_records_map.get(pname, [])
        idx = history.index(r) if r in history else -1
        
        comparison = "Single assessment"
        if idx > 0:
            prev = history[idx - 1]
            diff = r.probability - prev.probability
            arrow = "↗" if diff >= 0 else "↘"
            comparison = f"Prev: {prev.probability:.1f}% → Current: {r.probability:.1f}% {arrow} {diff:+.1f}%"
        elif len(history) > 1 and idx == 0:
            comparison = "Initial baseline assessment"

        response_items.append({
            "id": r.id,
            "patient_name": r.patient_name,
            "date": r.created_at,
            "risk_level": r.prediction,
            "probability": f"{r.probability:.1f}%",
            "probability_value": r.probability,
            "historical_comparison": comparison,
            "glucose": r.glucose,
            "blood_pressure": r.blood_pressure,
            "bmi": r.bmi,
            "insulin": r.insulin,
            "age": r.age,
            "algorithm_used": r.algorithm_used
        })

    return {
        "user_uid": user_uid,
        "count": len(response_items),
        "history": response_items
    }


@app.get("/api/reports/{report_id}")
def get_user_report(
    report_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves individual assessment report.
    Enforces strict authorization: returns HTTP 403 Forbidden
    if the report belongs to another user.
    """
    record = db.query(PredictionRecord).filter(PredictionRecord.id == report_id).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment report not found."
        )

    # Strict ownership verification
    if record.user_uid != current_user["uid"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to view another user's patient report."
        )

    insights = []
    if record.report_details:
        try:
            insights = json.loads(record.report_details)
        except Exception:
            pass
    if not insights:
        insights = calculate_insights(record.glucose, record.bmi, record.blood_pressure)

    user_vals = {
        "Glucose": record.glucose, "BloodPressure": record.blood_pressure,
        "BMI": record.bmi, "Insulin": record.insulin, "Age": record.age
    }
    graph_b64 = generate_clinical_chart(user_vals, record.probability, record.prediction)

    return {
        "id": record.id,
        "user_uid": record.user_uid,
        "patient_name": record.patient_name,
        "created_at": record.created_at,
        "risk_category": record.prediction,
        "probability": record.probability,
        "algorithm_used": record.algorithm_used,
        "biometrics": {
            "glucose": record.glucose,
            "blood_pressure": record.blood_pressure,
            "bmi": record.bmi,
            "insulin": record.insulin,
            "skin_thickness": record.skin_thickness,
            "pregnancies": record.pregnancies,
            "diabetes_pedigree": record.diabetes_pedigree,
            "age": record.age
        },
        "insights": insights,
        "graph_base64": graph_b64
    }


@app.get("/api/dashboard")
def get_user_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns personal dashboard metrics and latest prediction
    strictly for the authenticated user.
    """
    user_uid = current_user["uid"]

    records = db.query(PredictionRecord).filter(
        PredictionRecord.user_uid == user_uid
    ).order_by(PredictionRecord.id.desc()).all()

    total_checks = len(records)
    if total_checks == 0:
        return {
            "user": {
                "uid": user_uid,
                "email": current_user.get("email"),
                "name": current_user.get("name")
            },
            "total_assessments": 0,
            "average_risk": 0.0,
            "average_glucose": 0.0,
            "latest_prediction": None,
            "trend": {"labels": [], "probabilities": [], "glucoses": []},
            "message": "No prediction history available. Perform a prediction to see your analytics."
        }

    latest = records[0]
    avg_risk = round(sum(r.probability for r in records) / total_checks, 1)
    avg_glucose = round(sum(r.glucose for r in records) / total_checks, 1)

    chronological = list(reversed(records))
    trend_labels = [r.created_at[11:16] if r.created_at and len(r.created_at) >= 16 else f"#{i+1}" for i, r in enumerate(chronological)]
    trend_probs = [round(r.probability, 1) for r in chronological]
    trend_glucoses = [round(r.glucose, 1) for r in chronological]

    return {
        "user": {
            "uid": user_uid,
            "email": current_user.get("email"),
            "name": current_user.get("name")
        },
        "total_assessments": total_checks,
        "average_risk": avg_risk,
        "average_glucose": avg_glucose,
        "latest_prediction": {
            "id": latest.id,
            "patient_name": latest.patient_name,
            "risk_category": latest.prediction,
            "probability": latest.probability,
            "date": latest.created_at
        },
        "trend": {
            "labels": trend_labels,
            "probabilities": trend_probs,
            "glucoses": trend_glucoses
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Diabetes Risk Prediction FastAPI on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
