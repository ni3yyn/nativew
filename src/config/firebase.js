import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";

// --- 1. WATHIQ CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCOfYdRtv4Qxd270-Y0SaGa3I6uxTSKhsM",
  authDomain: "whatheeq.firebaseapp.com",
  projectId: "whatheeq",
  storageBucket: "whatheeq.firebasestorage.app",
  messagingSenderId: "964917104358",
  appId: "1:964917104358:web:736b30f5cf90985fa07527",
  measurementId: "G-GLHSW4YPZM"
};

// --- 2. INITIALIZE APP ---
const app = initializeApp(firebaseConfig);

// --- 3. INITIALIZE CORE SERVICES ---
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// --- 4. CONDITIONAL SERVICES (Analytics & Messaging) ---
// These are initialized asynchronously to prevent crashes in unsupported environments
export let analytics = null;
export let messaging = null;

isAnalyticsSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

isMessagingSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

// --- 5. HELPER EXPORTS (For Backward Compatibility with Oily Code) ---
// This ensures components like AdminPortal or WathiqAdmin don't break
export { collection, addDoc, setDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, getDocs, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

export default app;