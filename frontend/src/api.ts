import { auth, signOut } from "./firebase";

const PROD_API_URL = "https://diabeticpredictapp-1b.onrender.com";

// Dynamically determine candidate API URLs
const getCandidateUrls = (): string[] => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return [import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")];
  }
  const isLocal =
    typeof window !== "undefined" &&
    window.location.hostname &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (isLocal) {
    // When developing locally, prefer local backend (port 8000), fallback to Render cloud
    return ["http://localhost:8000", PROD_API_URL];
  }
  return [PROD_API_URL];
};

let activeBaseUrl = getCandidateUrls()[0];

export const getActiveApiUrl = () => activeBaseUrl;
export const API_BASE_URL = activeBaseUrl;

/**
 * Helper to perform authenticated requests with the Firebase ID Token
 */
async function authFetch(endpoint: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error("User is not authenticated. Please log in.");
  }

  // Get fresh Firebase ID Token
  const idToken = await currentUser.getIdToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${idToken}`,
    ...options.headers,
  };

  const candidates = getCandidateUrls();
  let lastError: any = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidateUrl = candidates[i];
    try {
      const response = await fetch(`${candidateUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // If successful or semantic response (like 401, 403, 422), mark candidate as active
      activeBaseUrl = candidateUrl;

      if (response.status === 401) {
        // Token expired or invalid
        await signOut();
        throw new Error("Session expired. Please log in again.");
      }

      if (response.status === 403) {
        throw new Error("Access forbidden: You do not have permission to access another user's patient report.");
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(
          "Backend server is waking up on Render (free tier cold start can take ~30-50s). Please wait a moment and click Retry."
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP Error ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      lastError = err;
      // If it's a network connection refusal and we have another candidate (e.g. cloud fallback), try it
      if ((err.name === "TypeError" || err.message?.includes("fetch")) && i < candidates.length - 1) {
        console.warn(`Could not connect to ${candidateUrl}. Attempting fallback to ${candidates[i + 1]}...`);
        continue;
      }
      break;
    }
  }

  if (lastError?.name === "TypeError" || lastError?.message?.includes("fetch")) {
    throw new Error(
      `Cannot connect to backend server at ${activeBaseUrl}. Please ensure the backend is running ('run_app.bat' locally or check Render deployment at ${PROD_API_URL}).`
    );
  }

  throw lastError;
}

export interface PatientPredictionInput {
  patient_name: string;
  pregnancies: number;
  glucose: number;
  blood_pressure: number;
  skin_thickness: number;
  insulin: number;
  bmi: number;
  diabetes_pedigree: number;
  age: number;
}

export const api = {
  // 1. Submit prediction (saved strictly to authenticated user's UID)
  predictDiabetes: (data: PatientPredictionInput) => {
    return authFetch("/api/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 2. Load private prediction history for current user only
  getUserHistory: () => {
    return authFetch("/api/history", {
      method: "GET",
    });
  },

  // 3. Load personal dashboard metrics (own data only)
  getUserDashboard: () => {
    return authFetch("/api/dashboard", {
      method: "GET",
    });
  },

  // 4. View individual report (strictly authorizes user ownership)
  getUserReport: (reportId: number) => {
    return authFetch(`/api/reports/${reportId}`, {
      method: "GET",
    });
  },

  // 5. Delete individual prediction
  deletePrediction: (reportId: number) => {
    return authFetch(`/api/history/${reportId}`, {
      method: "DELETE",
    });
  },

  // 6. Download clinical assessment PDF
  downloadReportPdf: async (reportId: number, patientName: string = "Patient") => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Please log in first.");
    const idToken = await currentUser.getIdToken();
    const res = await fetch(`${getActiveApiUrl()}/api/reports/${reportId}/pdf`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to download report PDF (HTTP ${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diabetes_report_${patientName.replace(/[^a-zA-Z0-9]/g, "_")}_${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // 7. User profile
  getUserProfile: () => {
    return authFetch("/api/user/me", {
      method: "GET",
    });
  },

  // 8. Native Authentication: Register
  register: async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed. Please try again.");
      }
      return res.json();
    } catch (netErr: any) {
      if (netErr.name === "TypeError" || netErr.message?.includes("fetch")) {
        throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Ensure 'python main.py' is running.`);
      }
      throw netErr;
    }
  },

  // 7. Native Authentication: Login
  login: async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Invalid email or password.");
      }
      return res.json();
    } catch (netErr: any) {
      if (netErr.name === "TypeError" || netErr.message?.includes("fetch")) {
        throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Ensure 'python main.py' is running.`);
      }
      throw netErr;
    }
  }
};

