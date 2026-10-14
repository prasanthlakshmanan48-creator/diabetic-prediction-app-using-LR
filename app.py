import os
import io
import base64
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend for web servers
import matplotlib.pyplot as plt

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


app = Flask(__name__)

# =========================================================
# CONFIGURATION
# =========================================================

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "diabetes-biomedical-secret-key-2026"
)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)

database_url = os.environ.get("DATABASE_URL")
if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'diabetes.db')}"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# =========================================================
# DATABASE MODELS
# =========================================================

class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(128), unique=True, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(128), nullable=True)
    password = db.Column(db.String(255), nullable=False)


class Prediction(db.Model):
    __tablename__ = "prediction"
    id = db.Column(db.Integer, primary_key=True)
    user_uid = db.Column(db.String(128), index=True, nullable=False)
    username = db.Column(db.String(100), nullable=True)
    patient_name = db.Column(db.String(100), default="Patient #1")
    created_at = db.Column(db.String(50), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    pregnancies = db.Column(db.Float)
    glucose = db.Column(db.Float)
    blood_pressure = db.Column(db.Float)
    skin_thickness = db.Column(db.Float)
    insulin = db.Column(db.Float)
    bmi = db.Column(db.Float)
    diabetes_pedigree = db.Column(db.Float)
    age = db.Column(db.Float)
    prediction = db.Column(db.String(100))
    probability = db.Column(db.Float)
    algorithm_used = db.Column(db.String(100), default="Random Forest Classifier (Scikit-Learn)")
    report_details = db.Column(db.Text, nullable=True)


import uuid

with app.app_context():
    db.create_all()
    # Ensure all user columns exist
    with db.engine.connect() as conn:
        for col_def in [
            "ALTER TABLE user ADD COLUMN uid VARCHAR(128)",
            "ALTER TABLE user ADD COLUMN email VARCHAR(128)",
            "ALTER TABLE prediction ADD COLUMN user_uid VARCHAR(128)",
            "ALTER TABLE prediction ADD COLUMN patient_name VARCHAR(100) DEFAULT 'Patient #1'",
            "ALTER TABLE prediction ADD COLUMN created_at VARCHAR(50)",
            "ALTER TABLE prediction ADD COLUMN algorithm_used VARCHAR(100)",
            "ALTER TABLE prediction ADD COLUMN report_details TEXT"
        ]:
            try:
                conn.execute(db.text(col_def))
                conn.commit()
            except Exception:
                pass

    # Ensure demo user exists with unique UID
    demo_user = User.query.filter(db.func.lower(User.username) == "prasanth").first()
    if not demo_user:
        hashed = generate_password_hash("1234567")
        demo_user = User(
            uid="usr_3eae90c204744ab9",
            username="prasanth",
            email="prasanth@diabetesapp.local",
            password=hashed
        )
        db.session.add(demo_user)
        db.session.commit()
    elif not demo_user.uid:
        demo_user.uid = "usr_3eae90c204744ab9"
        demo_user.email = "prasanth@diabetesapp.local"
        db.session.commit()



# =========================================================
# DATASET BENCHMARKS & MODEL LOADING
# =========================================================

FEATURES = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age"
]

HEALTHY_BENCHMARKS = {
    "Pregnancies": 3.3,
    "Glucose": 110.0,
    "BloodPressure": 68.2,
    "SkinThickness": 19.7,
    "Insulin": 68.8,
    "BMI": 30.3,
    "DiabetesPedigreeFunction": 0.43,
    "Age": 31.2
}

DIABETIC_BENCHMARKS = {
    "Pregnancies": 4.87,
    "Glucose": 141.3,
    "BloodPressure": 70.8,
    "SkinThickness": 22.2,
    "Insulin": 100.3,
    "BMI": 35.1,
    "DiabetesPedigreeFunction": 0.55,
    "Age": 37.1
}

MODEL_PATH = os.path.join(BASE_DIR, "model", "diabetes_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

model = None
scaler = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully from:", MODEL_PATH)
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print("Scaler loaded successfully from:", SCALER_PATH)
except Exception as e:
    print("Error loading ML model or scaler:", e)


# =========================================================
# GRAPH GENERATION HELPER (Matplotlib Publication Graphic)
# =========================================================

def generate_matplotlib_graph(user_data, probability, risk_label):
    """
    Generates a dual-panel dark-themed biomedical clinical graphic:
    1. Donut Risk Gauge indicating predicted probability
    2. Grouped Bar Chart comparing Patient vs Healthy Avg vs Diabetic Avg
    Returns base64 encoded PNG string.
    """
    try:
        # Dark biomedical theme styling
        plt.style.use('dark_background')
        fig, (ax1, ax2) = plt.subplots(
            1, 2,
            figsize=(11.5, 4.6),
            gridspec_kw={"width_ratios": [1, 1.85]},
            facecolor="#0d172b"
        )
        ax1.set_facecolor("#0d172b")
        ax2.set_facecolor("#0d172b")

        # -----------------------------
        # Panel 1: Donut Risk Meter
        # -----------------------------
        if probability >= 70:
            meter_color = "#ef4444"  # Red / High
            status_text = "High Risk"
        elif probability >= 40:
            meter_color = "#10b981"  # Mint Teal / Medium
            status_text = "Medium Risk"
        else:
            meter_color = "#3b82f6"  # Blue / Low
            status_text = "Low Risk"

        prob_val = max(0.5, min(99.5, probability))
        remainder = 100 - prob_val

        wedges, _ = ax1.pie(
            [prob_val, remainder],
            startangle=90,
            counterclock=False,
            colors=[meter_color, "#162238"],
            wedgeprops=dict(width=0.32, edgecolor="#0d172b", linewidth=2.5)
        )

        ax1.text(
            0, 0.08,
            f"{probability:.1f}%",
            ha="center", va="center",
            fontsize=22, fontweight="bold",
            color="#ffffff"
        )
        ax1.text(
            0, -0.22,
            status_text,
            ha="center", va="center",
            fontsize=12, fontweight="bold",
            color=meter_color
        )
        ax1.set_title(
            "Estimated Diabetes Risk",
            fontsize=13, fontweight="bold",
            pad=14, color="#ffffff"
        )

        # -----------------------------
        # Panel 2: Comparative Bar Chart
        # -----------------------------
        keys = ["Glucose", "BloodPressure", "BMI", "Insulin", "Age"]
        labels = ["Glucose\n(mg/dL)", "Blood Pres.\n(mmHg)", "BMI\n(kg/m²)", "Insulin\n(μU/mL)", "Age\n(yrs)"]

        user_vals = [float(user_data.get(k, 0)) for k in keys]
        healthy_vals = [HEALTHY_BENCHMARKS[k] for k in keys]
        diabetic_vals = [DIABETIC_BENCHMARKS[k] for k in keys]

        x = np.arange(len(keys))
        bar_width = 0.26

        rects1 = ax2.bar(x - bar_width, user_vals, bar_width, label="Patient Metric", color="#00c49f", edgecolor="#0d172b", linewidth=1.2)
        rects2 = ax2.bar(x, healthy_vals, bar_width, label="Healthy Benchmark", color="#3b82f6", edgecolor="#0d172b", linewidth=1.2)
        rects3 = ax2.bar(x + bar_width, diabetic_vals, bar_width, label="Diabetic Benchmark", color="#ef4444", edgecolor="#0d172b", linewidth=1.2)

        ax2.set_title(
            "Biometric Comparison vs Population Benchmarks",
            fontsize=13, fontweight="bold",
            pad=14, color="#ffffff"
        )
        ax2.set_xticks(x)
        ax2.set_xticklabels(labels, fontsize=9.5, color="#cbd5e1", fontweight="normal")
        ax2.set_ylabel("Measured Value", fontsize=10, color="#94a3b8")
        ax2.grid(axis="y", linestyle="--", alpha=0.2, color="#334155")
        ax2.set_axisbelow(True)

        for spine in ax2.spines.values():
            spine.set_color("#1e293b")

        ax2.legend(
            loc="upper right",
            frameon=True,
            facecolor="#111c35",
            edgecolor="#1e293b",
            fontsize=8.5,
            labelcolor="#e2e8f0"
        )

        for rects in [rects1, rects2, rects3]:
            for r in rects:
                height = r.get_height()
                if height > 0:
                    ax2.annotate(
                        f"{height:.0f}",
                        xy=(r.get_x() + r.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha="center", va="bottom",
                        fontsize=7.5, color="#cbd5e1"
                    )

        plt.tight_layout()

        buffer = io.BytesIO()
        plt.savefig(buffer, format="png", dpi=160, bbox_inches="tight", facecolor="#0d172b")
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        plt.close(fig)
        return img_base64

    except Exception as e:
        print("Error generating Matplotlib graph:", e)
        return None


def get_clinical_insights(user_data):
    """Personalized clinical insights based on biometric inputs."""
    insights = []
    glucose = user_data.get("Glucose", 0)
    if glucose >= 126:
        insights.append({
            "title": "Elevated Glucose Level",
            "level": "high",
            "message": f"Fasting glucose of {glucose:.1f} mg/dL exceeds normal clinical threshold. Clinical evaluation recommended."
        })
    elif glucose >= 100:
        insights.append({
            "title": "Prediabetes Range Glucose",
            "level": "warning",
            "message": f"Glucose level of {glucose:.1f} mg/dL is in the prediabetes margin (100–125 mg/dL)."
        })
    else:
        insights.append({
            "title": "Optimal Glucose Level",
            "level": "healthy",
            "message": f"Fasting glucose of {glucose:.1f} mg/dL is within the target healthy baseline (70–99 mg/dL)."
        })

    bmi = user_data.get("BMI", 0)
    if bmi >= 30:
        insights.append({
            "title": "High BMI Category",
            "level": "high",
            "message": f"BMI is {bmi:.1f} kg/m² (normal: 18.5–24.9). Elevated BMI strongly correlates with insulin resistance."
        })
    elif bmi >= 25:
        insights.append({
            "title": "Overweight BMI Margin",
            "level": "warning",
            "message": f"BMI of {bmi:.1f} kg/m² indicates moderate elevation."
        })
    else:
        insights.append({
            "title": "Normal Body Mass Index",
            "level": "healthy",
            "message": f"BMI of {bmi:.1f} kg/m² is in the optimal standard category."
        })

    return insights


# =========================================================
# AUTHENTICATION ENFORCEMENT (Login Before App Page)
# =========================================================

@app.before_request
def require_login():
    """
    Enforces authentication:
    All users must sign in or register BEFORE accessing any application page.
    """
    public_endpoints = {"login", "register", "static"}
    if request.endpoint and request.endpoint not in public_endpoints:
        if "username" not in session:
            return redirect(url_for("login"))


# =========================================================
# ROUTES: AUTHENTICATION
# =========================================================

@app.route("/")
def home():
    if "username" not in session:
        return redirect(url_for("login"))
    return redirect(url_for("prediction_page"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if "username" in session:
        return redirect(url_for("prediction_page"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if not username or not password:
            flash("Please provide both username and password.", "error")
            return redirect(url_for("login"))

        user = User.query.filter(db.func.lower(User.username) == username.lower()).first()

        if user and check_password_hash(user.password, password):
            if not user.uid:
                user.uid = f"usr_{uuid.uuid4().hex[:16]}"
                db.session.commit()
            session["username"] = user.username
            session["uid"] = user.uid
            session["email"] = user.email or f"{user.username}@diabetesapp.local"
            flash(f"Welcome back, {user.username}!", "success")
            return redirect(url_for("prediction_page"))

        flash("Invalid username or password. Please verify your credentials.", "error")

    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if "username" in session:
        return redirect(url_for("prediction_page"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if not username or not password:
            flash("Please enter both username and password.", "error")
            return redirect(url_for("register"))

        existing_user = User.query.filter(db.func.lower(User.username) == username.lower()).first()
        if existing_user:
            flash(f"Username '{username}' already exists. Please choose another username or log in.", "error")
            return redirect(url_for("register"))

        new_uid = f"usr_{uuid.uuid4().hex[:16]}"
        user_email = f"{username}@diabetesapp.local"
        hashed_password = generate_password_hash(password)
        new_user = User(
            uid=new_uid,
            username=username,
            email=user_email,
            password=hashed_password
        )
        db.session.add(new_user)
        db.session.commit()

        # Automatic login upon registration
        session["username"] = new_user.username
        session["uid"] = new_user.uid
        session["email"] = new_user.email
        flash(f"Account created successfully! Welcome to DiabPredict AI, {new_user.username}!", "success")
        return redirect(url_for("prediction_page"))

    return render_template("register.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been signed out.", "info")
    return redirect(url_for("login"))


# =========================================================
# ROUTES: PREDICTION & GRAPHS
# =========================================================

@app.route("/prediction", methods=["GET", "POST"])
@app.route("/predict", methods=["GET", "POST"])
def prediction_page():
    result = None
    risk_class = None
    probability = None
    graph_base64 = None
    comparison_keys = ["Glucose", "BloodPressure", "BMI", "Insulin", "Age"]
    comparison_labels = ["Glucose", "Blood Pressure", "BMI", "Insulin", "Age"]
    chart_user_vals = []
    chart_healthy_vals = [HEALTHY_BENCHMARKS[k] for k in comparison_keys]
    chart_diabetic_vals = [DIABETIC_BENCHMARKS[k] for k in comparison_keys]
    feature_importances = {}
    insights = []
    user_inputs = {}
    patient_name = "Patient #1"

    if request.method == "POST":
        if model is None:
            flash("Machine Learning model is not available. Please ensure model files are present.", "error")
            return redirect(url_for("prediction_page"))

        try:
            patient_name = request.form.get("patient_name", "").strip() or "Patient #1"
            pregnancies = float(request.form.get("pregnancies", 0))
            glucose = float(request.form.get("glucose", 0))
            blood_pressure = float(request.form.get("blood_pressure", 0))
            skin_thickness = float(request.form.get("skin_thickness", 0))
            insulin = float(request.form.get("insulin", 0))
            bmi = float(request.form.get("bmi", 0))
            diabetes_pedigree = float(request.form.get("diabetes_pedigree", 0))
            age = float(request.form.get("age", 0))

            user_inputs = {
                "patient_name": patient_name,
                "Pregnancies": pregnancies,
                "Glucose": glucose,
                "BloodPressure": blood_pressure,
                "SkinThickness": skin_thickness,
                "Insulin": insulin,
                "BMI": bmi,
                "DiabetesPedigreeFunction": diabetes_pedigree,
                "Age": age
            }

            input_df = pd.DataFrame([[
                pregnancies,
                glucose,
                blood_pressure,
                skin_thickness,
                insulin,
                bmi,
                diabetes_pedigree,
                age
            ]], columns=FEATURES)

            if hasattr(model, "named_steps"):
                prediction_value = model.predict(input_df)[0]
                probabilities = model.predict_proba(input_df)[0]
            else:
                scaled_data = scaler.transform(input_df) if scaler is not None else input_df
                prediction_value = model.predict(scaled_data)[0]
                probabilities = model.predict_proba(scaled_data)[0]

            probability = float(probabilities[1] * 100)

            # Classify risk level
            if probability >= 70.0:
                result = "High Risk"
                risk_class = "danger"
            elif probability >= 40.0:
                result = "Medium Risk"
                risk_class = "warning"
            else:
                result = "Low Risk"
                risk_class = "success"

            # Save prediction strictly associated with current user's UID
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            user_uid = session.get("uid") or "usr_unknown"
            new_pred = Prediction(
                user_uid=user_uid,
                username=session.get("username", "anonymous"),
                patient_name=patient_name,
                created_at=now_str,
                pregnancies=pregnancies,
                glucose=glucose,
                blood_pressure=blood_pressure,
                skin_thickness=skin_thickness,
                insulin=insulin,
                bmi=bmi,
                diabetes_pedigree=diabetes_pedigree,
                age=age,
                prediction=result,
                probability=probability,
                algorithm_used="Random Forest Classifier (Scikit-Learn)",
                report_details=json.dumps(insights)
            )
            db.session.add(new_pred)
            db.session.commit()

            # Generate Matplotlib Graphic
            graph_base64 = generate_matplotlib_graph(user_inputs, probability, result)

            # Feature importances
            if hasattr(model, "feature_importances_"):
                for feat, imp in zip(FEATURES, model.feature_importances_):
                    feature_importances[feat] = round(float(imp) * 100, 1)

            chart_user_vals = [glucose, blood_pressure, bmi, insulin, age]
            insights = get_clinical_insights(user_inputs)

        except Exception as error:
            print("Prediction error:", error)
            flash(f"Error executing prediction: {str(error)}", "error")

    return render_template(
        "prediction.html",
        active_page="prediction",
        username=session.get("username"),
        result=result,
        risk_class=risk_class,
        probability=round(probability, 1) if probability is not None else None,
        user_inputs=user_inputs,
        patient_name=patient_name,
        graph_base64=graph_base64,
        comparison_labels=comparison_labels,
        chart_user_vals=chart_user_vals,
        chart_healthy_vals=chart_healthy_vals,
        chart_diabetic_vals=chart_diabetic_vals,
        feature_importances=feature_importances,
        insights=insights
    )


# =========================================================
# ROUTES: PREDICTION HISTORY (MATCHES USER SCREENSHOT)
# =========================================================

@app.route("/history")
def history_page():
    user_uid = session.get("uid")
    # Strict isolation: Only load records created by the authenticated user!
    all_preds = Prediction.query.filter_by(user_uid=user_uid).order_by(Prediction.id.desc()).all()

    # Calculate historical progression comparison
    # e.g., "Prev: 45.2% -> Current: 45.2% ↗ 0.0%" or "Single assessment"
    records_with_comparison = []
    
    # Map patient history
    patient_history_map = {}
    for p in reversed(all_preds):
        p_name = p.patient_name or "Patient #1"
        if p_name not in patient_history_map:
            patient_history_map[p_name] = []
        patient_history_map[p_name].append(p)

    for p in all_preds:
        p_name = p.patient_name or "Patient #1"
        history_list = patient_history_map.get(p_name, [])
        idx = history_list.index(p) if p in history_list else -1
        
        comparison_str = "Single assessment"
        if idx > 0:
            prev_pred = history_list[idx - 1]
            diff = p.probability - prev_pred.probability
            arrow = "↗" if diff >= 0 else "↘"
            comparison_str = f"Prev: {prev_pred.probability:.1f}% → Current: {p.probability:.1f}% {arrow} {diff:+.1f}%"
        elif len(history_list) > 1 and idx == 0:
            comparison_str = "Initial baseline assessment"

        records_with_comparison.append({
            "id": p.id,
            "patient_name": p.patient_name or "Patient #1",
            "date": p.created_at or "2026-10-14 04:00:00",
            "risk_level": p.prediction,
            "probability": f"{p.probability:.1f}%",
            "probability_val": p.probability,
            "comparison": comparison_str,
            "glucose": p.glucose,
            "blood_pressure": p.blood_pressure,
            "bmi": p.bmi,
            "insulin": p.insulin,
            "age": p.age
        })

    return render_template(
        "history.html",
        active_page="history",
        username=session.get("username"),
        records=records_with_comparison,
        total_records=len(records_with_comparison)
    )


# =========================================================
# ROUTES: DASHBOARD & ANALYTICS
# =========================================================

@app.route("/dashboard")
def dashboard_page():
    user_uid = session.get("uid")
    # Strict isolation: Only load records created by the authenticated user!
    all_preds = Prediction.query.filter_by(user_uid=user_uid).order_by(Prediction.id.desc()).all()
    chronological = list(reversed(all_preds))

    total_checks = len(all_preds)
    avg_prob = round(sum(p.probability for p in all_preds) / total_checks, 1) if total_checks else 0
    avg_glucose = round(sum(p.glucose for p in all_preds) / total_checks, 1) if total_checks else 0
    high_risk_count = sum(1 for p in all_preds if p.probability >= 70 or "High" in (p.prediction or ""))

    trend_labels = [p.created_at[11:16] if p.created_at and len(p.created_at) >= 16 else f"#{i+1}" for i, p in enumerate(chronological)]
    trend_probabilities = [round(p.probability, 1) for p in chronological]
    trend_glucoses = [round(p.glucose, 1) for p in chronological]

    return render_template(
        "dashboard.html",
        active_page="dashboard",
        username=session.get("username"),
        total_checks=total_checks,
        avg_prob=avg_prob,
        avg_glucose=avg_glucose,
        high_risk_count=high_risk_count,
        trend_labels=trend_labels,
        trend_probabilities=trend_probabilities,
        trend_glucoses=trend_glucoses,
        recent_records=all_preds[:6]
    )


# =========================================================
# ROUTES: REPORTS & SETTINGS
# =========================================================

@app.route("/reports")
def reports_page():
    user_uid = session.get("uid")
    # Strict isolation: Only load reports created by the authenticated user!
    all_preds = Prediction.query.filter_by(user_uid=user_uid).order_by(Prediction.id.desc()).all()
    return render_template(
        "reports.html",
        active_page="reports",
        username=session.get("username"),
        user_email=session.get("email"),
        records=all_preds
    )


@app.route("/reports/<int:report_id>")
def view_single_report(report_id):
    """
    Secure report endpoint with strict authorization check.
    Returns 403 Forbidden if the report belongs to another user.
    """
    record = Prediction.query.filter_by(id=report_id).first_or_404()
    if record.user_uid != session.get("uid"):
        flash("Access Forbidden: You do not have permission to view another user's patient report.", "error")
        return redirect(url_for("reports_page")), 403

    return render_template(
        "reports.html",
        active_page="reports",
        username=session.get("username"),
        records=[record]
    )


@app.route("/settings")
def settings_page():
    return render_template(
        "settings.html",
        active_page="settings",
        username=session.get("username")
    )


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Biomedical Diabetes Risk System on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
