import { auth, signOut } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    await signOut();
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Access forbidden: You do not have permission to access another user's patient report.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
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

  // 5. User profile
  getUserProfile: () => {
    return authFetch("/api/user/me", {
      method: "GET",
    });
  },

  // 6. Native Authentication: Register
  register: async (email: string, password: string) => {
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
  },

  // 7. Native Authentication: Login
  login: async (email: string, password: string) => {
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
  }
};

