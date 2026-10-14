# 🩺 Diabetes Risk Prediction System
### *Biomedical Engineering Project & Clinical Analytics Platform*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776AB.svg?style=flat&logo=python)](https://www.python.org)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Authentication-Firebase%20Auth-FFCA28.svg?style=flat&logo=firebase)](https://firebase.google.com)
[![Scikit-Learn](https://img.shields.io/badge/ML%20Model-Random%20Forest%20%2F%20LR-F7931E.svg?style=flat&logo=scikitlearn)](https://scikit-learn.org)
[![Deployment](https://img.shields.io/badge/Deployment-Render-46E3B7.svg?style=flat&logo=render)](https://render.com)

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features & What Was Implemented](#-key-features--what-was-implemented)
3. [Technology Stack](#-technology-stack)
4. [Security & User-Specific Data Isolation](#-security--user-specific-data-isolation)
5. [Repository Structure](#-repository-structure)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Local Development Setup](#-local-development-setup)
8. [Deployment on Render](#-deployment-on-render)
9. [Machine Learning Pipeline](#-machine-learning-pipeline)

---

## 🌟 Project Overview

The **Diabetes Risk Prediction System** is a biomedical web application designed to evaluate patient biometric parameters and predict the probability and clinical category of diabetes risk (Low, Medium, or High Risk) in real time.

The system features **complete user-specific data isolation**: every authenticated clinician or patient has an isolated, private workspace. A user can only see, search, and analyze their own patient predictions and clinical reports.

---

## 🚀 Key Features & What Was Implemented

### 1. 🔒 User-Specific Data Isolation
- **Cryptographic UID Binding**: Every prediction record is permanently linked to the user's verified Firebase Authentication UID (`user_uid`).
- **No Shared Records**: New users see an empty history state (*"No prediction history available"*). No sample data, global records, or other users' patients are ever leaked.
- **Strict Authorization Guards**: Backend endpoints strictly verify ownership before serving reports. Accessing another user's patient ID returns `HTTP 403 Forbidden`.

### 2. 📊 Comprehensive Prediction Results Storage
Whenever a prediction is generated, the system stores:
- Authenticated user's `user_uid` and username/email
- Patient demographics: Name, Age, Pregnancies
- Clinical Biometrics: Glucose, Blood Pressure, Skin Thickness, Serum Insulin, BMI, Diabetes Pedigree Function
- Prediction Outcome: Predicted risk category (**Low Risk**, **Medium Risk**, **High Risk**)
- Displayed Risk Probability Percentage (e.g. `74.5%`)
- Algorithm Details: Model name and parameters
- Timestamp of assessment
- Complete Clinical Assessment Report JSON (biomarker comparison vs. healthy benchmarks, clinical insights, and recommendations)

### 3. 📈 Clinical Analytics & Graphical Outputs
- **Interactive Risk Gauge**: Visual speedometer displaying calculated probability and risk category.
- **Biomarker Comparative Bar Chart**: Real-time side-by-side comparison of patient metrics against standard clinical benchmarks (Normal vs. Elevated).
- **Feature Importance Breakdown**: Visual weights illustrating how much Glucose, BMI, Age, and Insulin contributed to the diagnosis.
- **Downloadable Matplotlib Clinical Chart**: High-resolution PNG generated server-side for inclusion in patient health records.

### 4. 📱 Personal Analytics Dashboard
- Summary KPI Cards: Total Patient Assessments, High Risk Cases, Medium Risk Cases, Low Risk Cases.
- Latest Patient Prediction card with direct access to full clinical insights.
- Patient history table with instant search by patient name and risk level filtering.

### 5. 🔄 Dual Full-Stack Architecture
- **Modern Microservices Architecture**: FastAPI Python backend (`main.py`) paired with a React TypeScript frontend (`frontend/`).
- **Monolithic Web App**: Fully functional Flask application (`app.py`) with server-rendered Jinja2 templates and clinical dark theme.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend API** | Python 3, FastAPI, Uvicorn | High-performance asynchronous REST API |
| **Monolith Backend** | Python 3, Flask, Flask-SQLAlchemy | Alternative all-in-one web application |
| **Machine Learning** | Scikit-Learn, NumPy, Pandas | Pretrained Random Forest & Logistic Regression models + StandardScaler |
| **Database** | SQLite / PostgreSQL (SQLAlchemy) | Persistent relational storage with `user_uid` foreign key indexing |
| **Authentication** | Firebase Authentication & Firebase Admin SDK | Client-side email/password login + server-side JWT verification |
| **Frontend** | React 18, Vite, TypeScript | Fast Single Page Application (SPA) |
| **Styling & Charts** | Vanilla CSS, Chart.js, Matplotlib | Custom biomedical dark theme (`#080e1e`, `#00c49f`) |
| **Cloud Hosting** | Render | Automated web service and static site deployments via `render.yaml` |

---

## 🔐 Security & User-Specific Data Isolation

```
                                  +-----------------------------+
                                  |     Firebase Auth Portal    |
                                  | (Email/Password & Tokens)   |
                                  +--------------+--------------+
                                                 |
                       1. Authenticate & Obtain  | 3. Verify Bearer Token
                          Client ID Token        |    (Firebase Admin SDK)
                                                 v
+-------------------------------+       +--------+--------------------+
|  Render Static Site           |       |   Render Web Service        |
|  React (Vite) Frontend        +------>+   FastAPI Backend           |
|  - Auth Gate (Login/Register) |  2.   |   - Bearer Token Auth Guard |
|  - Personal Dashboard         |  API  |   - Model Inference Engine  |
|  - Isolated Prediction Form   | Req   |   - User UID SQLite/Postgres|
|  - Historical Charts          |       |   - Chart Generation (PNG)  |
+-------------------------------+       +-----------------------------+
```

### Authorization Flow:
1. The user logs in via Firebase Authentication and receives a signed Firebase ID token (JWT).
2. For every protected backend request, the frontend sends the token in the `Authorization: Bearer <token>` header.
3. The FastAPI dependency `get_current_user` validates the token using `firebase_admin.auth.verify_id_token`.
4. The verified `uid` is used in all database queries:
   ```python
   records = db.query(PredictionRecord).filter(
       PredictionRecord.user_uid == current_user["uid"]
   ).order_by(PredictionRecord.id.desc()).all()
   ```
5. If an unauthenticated request arrives $\rightarrow$ returns `HTTP 401 Unauthorized`.
6. If a user tries to access a report belonging to another user $\rightarrow$ returns `HTTP 403 Forbidden`.
7. Client-supplied UIDs are ignored; only the cryptographically verified token UID is trusted.

---

## 📁 Repository Structure

```
diabetic-prediction-app-using-LR/
├── app.py                     # Flask monolithic web application
├── main.py                    # FastAPI backend service with Firebase Admin SDK
├── requirements.txt           # Python dependencies (FastAPI, Flask, Scikit-learn, Firebase)
├── render.yaml                # Render Blueprint infrastructure-as-code
├── DEPLOYMENT.md              # Detailed cloud deployment instructions
├── diabetes.csv               # Dataset used for model training and benchmark analysis
├── train_model.py             # Model training script for Random Forest & Scaler
│
├── model/                     # Pretrained Machine Learning models
│   ├── diabetes_model.pkl     # Serialized classifier model
│   └── scaler.pkl             # StandardScaler for feature normalization
│
├── instance/                  # Local application database
│   └── diabetes.db            # SQLite database with user_uid schema
│
├── frontend/                  # React + Vite TypeScript SPA
│   ├── index.html             # React entry HTML
│   ├── package.json           # Frontend dependencies & scripts
│   ├── tsconfig.json          # TypeScript compiler configuration
│   ├── vite.config.ts         # Vite build configuration
│   └── src/
│       ├── App.tsx            # Main application shell with navigation
│       ├── api.ts             # Authenticated API client with token injection
│       ├── firebase.ts        # Firebase Authentication client setup
│       ├── index.css          # Biomedical dark theme CSS
│       ├── main.tsx           # React root mount
│       └── components/
│           ├── Auth.tsx              # Sign In & Registration form
│           ├── Dashboard.tsx         # User-specific analytics dashboard
│           ├── PredictionForm.tsx    # Patient prediction form with presets
│           └── PredictionHistory.tsx # Isolated prediction history & reports
│
├── templates/                 # Jinja2 HTML templates (Flask app)
│   ├── base.html              # Base layout with sidebar navigation
│   ├── dashboard.html         # Personal dashboard
│   ├── prediction.html        # Prediction form with interactive charts
│   ├── history.html           # Historical records table & search
│   ├── reports.html           # Clinical report viewer
│   ├── login.html             # Sign in page
│   ├── register.html          # Registration page
│   └── settings.html          # User session settings
│
└── static/                    # Frontend assets
    ├── style.css              # Biomedical dark theme styles
    └── script.js              # Chart.js initialization & frontend logic
```

---

## 🔌 API Endpoints Reference

All endpoints (except `/health`) require an `Authorization: Bearer <FIREBASE_ID_TOKEN>` header:

| Method | Endpoint | Description | Auth Required | Status Codes |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/api/predict` | Run prediction and save record to user's UID | **Yes** | `200`, `401`, `422` |
| `GET` | `/api/history` | Retrieve prediction history for current user | **Yes** | `200`, `401` |
| `GET` | `/api/dashboard` | Get personal dashboard KPI metrics | **Yes** | `200`, `401` |
| `GET` | `/api/reports/{id}` | View detailed report (strictly checks ownership) | **Yes** | `200`, `401`, `403`, `404` |
| `GET` | `/api/user/me` | Fetch verified user profile & UID | **Yes** | `200`, `401` |
| `GET` | `/health` | Service health status | No | `200` |

---

## 💻 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/prasanthlakshmanan48-creator/diabetic-prediction-app-using-LR.git
cd diabetic-prediction-app-using-LR
```

### 2. Set Up Python Environment
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Run FastAPI Backend
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Interactive Swagger API documentation will be available at: `http://localhost:8000/docs`.

### 4. Run React Frontend
```bash
cd frontend
npm install
npm run dev
```
The React frontend will be available at: `http://localhost:3000`.

### 5. (Alternative) Run Flask Monolithic App
```bash
python app.py
```
The Flask application will be available at: `http://localhost:5000`.

---

## ☁️ Deployment on Render

This repository is pre-configured for **Render** using [render.yaml](render.yaml).

### Option 1: Automatic Blueprint Deploy
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
2. Connect this repository.
3. Render automatically provisions:
   - **`diabetes-risk-backend`**: FastAPI Python Web Service (`main:app`).
   - **`diabetes-risk-frontend`**: React Vite Static Site (`frontend/dist`).

### Option 2: Manual Deploy
See the complete step-by-step instructions in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🧠 Machine Learning Pipeline

- **Algorithm**: Random Forest Classifier ensemble with 100 estimators calibrated for clinical sensitivity.
- **Biomarkers Evaluated**:
  1. `Glucose`: Fasting blood glucose concentration (mg/dL)
  2. `BloodPressure`: Diastolic blood pressure (mm Hg)
  3. `SkinThickness`: Triceps skin fold thickness (mm)
  4. `Insulin`: 2-Hour serum insulin ($\mu$U/mL)
  5. `BMI`: Body mass index ($\text{weight in kg} / (\text{height in m})^2$)
  6. `DiabetesPedigreeFunction`: Diabetes genetic score
  7. `Age`: Patient age (years)
  8. `Pregnancies`: Number of pregnancies
- **Feature Scaling**: Fitted with `StandardScaler` to ensure normalized distributions.
- **Risk Thresholds**:
  - **Low Risk**: $< 40\%$ probability
  - **Medium Risk**: $40\% - 65\%$ probability
  - **High Risk**: $> 65\%$ probability

---

## 📄 License
This project is developed for educational and clinical research purposes under the Biomedical Engineering curriculum.