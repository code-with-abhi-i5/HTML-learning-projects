import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCzHjmZ8ajWBvG7fEjg5fZ0FYENdZjTe64",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "om-hostel-admin.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "om-hostel-admin",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "om-hostel-admin.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "712848951754",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:712848951754:web:3905cce9dc8c8f8ccc6733",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8J25K62E76"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize analytics conditionally when supported
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this environment
  });
}

export default app;
