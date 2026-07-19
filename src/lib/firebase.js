import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAufe-LwJKjCIJo2EGa-IK-3IxE8sKR_4g",
  authDomain: "i-think-5e76d.firebaseapp.com",
  projectId: "i-think-5e76d",
  storageBucket: "i-think-5e76d.firebasestorage.app",
  messagingSenderId: "93208755975",
  appId: "1:93208755975:web:bfce758e18b5d1117d0fa2"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
