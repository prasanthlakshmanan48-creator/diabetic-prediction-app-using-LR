# Deployment Guide: Diabetes Risk Prediction System on Render

This guide outlines the complete step-by-step process for deploying the **Diabetes Risk Prediction Application** on [Render](https://render.com).

---

## 🌟 Recommended Deployment: Full-Stack Flask Web Service (Original UI/UX)

This option deploys the complete, self-contained application with:
- The **original biomedical UI/UX** (`templates/base.html`, `dashboard.html`, `prediction.html`, `history.html`, `reports.html`, `static/style.css`).
- Built-in user authentication (register, login, password security, session isolation).
- Embedded Machine Learning inference (Random Forest / Logistic Regression) & Matplotlib visual generation.
- **Single Web Service**: No separate frontend build, no Firebase configuration required.

### Step-by-Step Instructions:

#### Option 1: One-Click Blueprint Deployment (Easiest)
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **Blueprints** $\rightarrow$ **New Blueprint Instance**.
3. Connect your repository: `prasanthlakshmanan48-creator/diabetic-prediction-app-using-LR`.
4. Render will read `render.yaml` and configure the service automatically.
5. Click **Apply**.
6. When deployment finishes, open your web app URL (e.g. `https://diabetes-risk-prediction.onrender.com`).

#### Option 2: Manual Dashboard Deployment
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name**: `diabetes-risk-prediction`
   - **Runtime**: `Python 3`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     gunicorn app:app
     ```
   - **Instance Type**: `Free`
5. Under **Environment Variables**:
   | Variable Name | Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.8` | Python version |
   | `DATABASE_URL` | `sqlite:///instance/diabetes.db` | Persistent SQLite (or link Render PostgreSQL) |
   | `SECRET_KEY` | *(Click 'Generate' or enter a random string)* | Flask Session Secret |
6. Click **Create Web Service**.

---

## 💻 Running the Previous UI/UX Locally

To run the original UI/UX on your local machine:
```bash
python app.py
```
Open your browser at:
`http://localhost:5000`

Default Demo Credentials (already in the database):
- **Username**: `prasanth`
- **Password**: `1234567`
Or click **"Register Here"** to create a new user account with your own email and password.

---

## ⚡ Alternative Architecture: Decoupled FastAPI + React Frontend

If you wish to run the decoupled React SPA instead:
1. **Backend**:
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
2. **Frontend**:
   - `cd frontend && npm install && npm run dev`
