# Deployment Guide: Diabetes Risk Prediction System on Render

This guide outlines the complete step-by-step process for deploying the **FastAPI Backend** and **React Frontend** on [Render](https://render.com), with secure Firebase Authentication and user-isolated prediction history.

---

## 1. Architecture Overview

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

---

## 2. Prerequisites & Firebase Setup

1. **Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `diabetes-risk-system`).
   - Enable **Authentication** -> **Sign-in method** -> enable **Email/Password**.
   - Under **Project Settings** -> **General** -> Register a Web App to get your Client Web Config:
     - `apiKey`
     - `authDomain`
     - `projectId`
     - `storageBucket`
     - `messagingSenderId`
     - `appId`
   - Under **Project Settings** -> **Service Accounts** -> Click **Generate new private key** (downloads a `.json` file). Keep this file secret.

> [!TIP]
> **No Firebase setup? No problem!**
> The system now includes **Instant Clinical Demo Mode**. If you do not have a Firebase project or omit Firebase credentials, the portal automatically allows instant evaluation access with user-specific data isolation (each user email gets their own private history and analytics records in SQLite/Postgres without triggering `auth/api-key-not-valid`).

---

## 2.1 Troubleshooting: `Firebase: Error (auth/api-key-not-valid)`
If you see the error:
`Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`
This means the frontend was accessed with a placeholder or invalid API key.
- **Immediate Fix**: Click **"🩺 Continue as (Email) (Clinical Demo Mode)"** or the **"⚡ Enter Demo Session"** button on the login screen to enter the portal instantly.
- **To use real Firebase Accounts**: Create a project in [Firebase Console](https://console.firebase.google.com/), obtain your Web API Key (`AIzaSy...`), and set `VITE_FIREBASE_API_KEY` in Render (under Environment Variables) or in your `.env` file.


## 3. Deploy Service 1: Python FastAPI Backend on Render

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub / GitLab repository containing this project.
4. Fill in the service configuration:
   - **Name**: `diabetes-risk-backend`
   - **Region**: Choose closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).
   - **Environment**: `Python 3`
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repo root).
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free`

5. Add **Environment Variables** under **Advanced / Environment Variables**:
   | Variable Name | Example / Recommended Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.8` | Supported Python version on Render |
   | `DATABASE_URL` | `sqlite:///instance/diabetes.db` | Persistent SQLite (or link Render PostgreSQL) |
   | `CORS_ORIGINS` | `https://diabetes-risk-frontend.onrender.com,http://localhost:3000` | Allowed origins for cross-site requests |
   | `FIREBASE_PROJECT_ID` | `diabetes-risk-system` | Your Firebase Project ID |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | `{"type": "service_account", ...}` | Paste contents of the Firebase Service Account JSON |

6. Click **Create Web Service**.
7. Once deployed, note down your backend URL: e.g. `https://diabetes-risk-backend.onrender.com`.

---

## 4. Deploy Service 2: React Frontend on Render

1. Go to Render Dashboard -> Click **New +** -> **Static Site**.
2. Connect the same repository.
3. Fill in the configuration:
   - **Name**: `diabetes-risk-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   | Variable Name | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://diabetes-risk-backend.onrender.com` | Deployed backend URL from Step 3 |
   | `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Web API Key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `diabetes-risk-system.firebaseapp.com` | Firebase Auth Domain |
   | `VITE_FIREBASE_PROJECT_ID` | `diabetes-risk-system` | Firebase Project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET`| `diabetes-risk-system.appspot.com` | Firebase Storage Bucket |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID`| `1234567890` | Firebase Messaging Sender ID |
   | `VITE_FIREBASE_APP_ID` | `1:1234567890:web:...` | Firebase Web App ID |

5. Under **Redirects/Rewrites**:
   - Add a rewrite rule for Single Page Application routing:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## 5. Blueprint Deployment (Alternative Option)

You can also deploy both services simultaneously using the included `render.yaml` file:
1. In the Render Dashboard, click **Blueprints**.
2. Connect this repository. Render will automatically parse `render.yaml` and prompt you to input the `FIREBASE_SERVICE_ACCOUNT_JSON` and API credentials.
3. Click **Apply** to deploy both the backend and frontend at once.

---

## 6. Verification and Validation Checklist

After deployment finishes, verify the 7 security criteria:
1. Open the frontend static site URL. Confirm you are presented with the **Sign In / Register** authentication gate.
2. Register **User A** (`userA@test.com`) and run a prediction. Confirm the results and visualizations render.
3. Check the **Dashboard** and **History** tabs; confirm the newly created prediction is visible.
4. Sign out. Notice all local data and tokens are completely cleared.
5. Register **User B** (`userB@test.com`).
6. Confirm User B's dashboard shows **"No prediction history available"** and 0 total predictions. User A's data is completely invisible.
7. Attempting to directly fetch User A's report ID (e.g. `GET /api/reports/1`) with User B's Bearer token returns `HTTP 403 Forbidden`.
8. Requests without an `Authorization: Bearer <token>` header return `HTTP 401 Unauthorized`.
