import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  type Auth,
} from "firebase/auth";

import { firebaseConfig } from "../firebase.config";

if (!firebaseConfig?.apiKey) {
  throw new Error("Firebase config missing. Create firebase.config.ts from firebase.config.example.ts.");
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export {
  auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
};
