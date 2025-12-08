import { Platform } from 'react-native'; // 1. Import Platform
import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence, 
  browserLocalPersistence // 2. Import Browser Persistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

// --- 3. INITIALIZE AUTH (PLATFORM AWARE) ---
let auth;

if (Platform.OS === 'web') {
  // If running on Web, use standard browser storage
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  // If running on Android/iOS, use React Native Async Storage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Export auth specifically
export { auth };

// --- 4. INITIALIZE OTHER SERVICES ---
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// --- 5. CONDITIONAL SERVICES (Analytics & Messaging) ---
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

// --- 6. HELPER EXPORTS ---
export { collection, addDoc, setDoc, doc, updateDoc, deleteDoc, query, orderBy, limit, getDocs, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

export default app;