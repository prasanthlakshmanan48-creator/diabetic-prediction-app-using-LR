import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";

// Public credentials safe to include in frontend
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment12345678",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "diabetes-predict-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "diabetes-predict-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "diabetes-predict-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const fbApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

export type User = AppUser;

// Listeners for auth state changes
const authListeners = new Set<(user: AppUser | null) => void>();

export function getDemoUser(): AppUser | null {
  try {
    const raw = localStorage.getItem("diabetes_demo_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = parsed.email || "demo@diabetesapp.local";
    const name = parsed.name || email.split("@")[0] || "Clinician";
    const cleanId = email.replace(/[^a-zA-Z0-9]/g, "_");
    return {
      uid: parsed.uid || `demo_${cleanId}`,
      email: email,
      displayName: name,
      getIdToken: async () => `dev-token-${cleanId}`,
    };
  } catch {
    return null;
  }
}

export function loginWithDemo(email: string): AppUser {
  const cleanEmail = email.trim();
  const cleanId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  const userRecord = {
    uid: `demo_${cleanId}`,
    email: cleanEmail,
    name: cleanEmail.split("@")[0] || "Clinician",
  };
  localStorage.setItem("diabetes_demo_user", JSON.stringify(userRecord));
  const fullUser: AppUser = {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.name,
    getIdToken: async () => `dev-token-${cleanId}`,
  };
  authListeners.forEach((cb) => cb(fullUser));
  return fullUser;
}

export function getCurrentUser(): AppUser | null {
  if (fbAuth.currentUser) {
    return fbAuth.currentUser as unknown as AppUser;
  }
  return getDemoUser();
}

// Proxied auth object so auth.currentUser works seamlessly
export const auth: any = new Proxy(fbAuth, {
  get(target: any, prop: string | symbol, receiver: any) {
    if (prop === "currentUser") {
      return target.currentUser || getDemoUser();
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === "function") {
      return val.bind(target);
    }
    return val;
  }
});

export const signInWithEmailAndPassword = fbSignIn;
export const createUserWithEmailAndPassword = fbCreateUser;

export async function signOut(_authInstance?: any): Promise<void> {
  localStorage.removeItem("diabetes_demo_user");
  try {
    await fbSignOut(fbAuth);
  } catch {
    // Ignore signOut errors if not using Firebase
  }
  authListeners.forEach((cb) => cb(null));
}

export function onAuthStateChanged(
  _authInstance: any,
  callback: (user: AppUser | null) => void
): () => void {
  authListeners.add(callback);

  const unsubscribeFb = fbOnAuthStateChanged(fbAuth, (fbUser) => {
    if (fbUser) {
      callback(fbUser as unknown as AppUser);
    } else {
      callback(getDemoUser());
    }
  });

  // Emit current state immediately
  const initial = fbAuth.currentUser ? (fbAuth.currentUser as unknown as AppUser) : getDemoUser();
  callback(initial);

  return () => {
    authListeners.delete(callback);
    unsubscribeFb();
  };
}

export function isFirebaseConfigured(): boolean {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(key && !key.includes("DummyKey") && key.startsWith("AIzaSy") && key.length > 25);
}
