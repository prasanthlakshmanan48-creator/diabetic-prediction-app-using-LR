import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";

// Firebase client configuration
// Public credentials safe to include in frontend (Firebase security is enforced by backend Firebase Admin SDK + Security Rules)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment12345678",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "diabetes-predict-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "diabetes-predict-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "diabetes-predict-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
export type { User };
