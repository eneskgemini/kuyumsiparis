import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/* global __firebase_config */
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBU8dWUrlVu2PUiysZ44r0USHn-TtfT6R0",
  authDomain: "sahra-c9ba6.firebaseapp.com",
  projectId: "sahra-c9ba6",
  storageBucket: "sahra-c9ba6.firebasestorage.app",
  messagingSenderId: "330661296496",
  appId: "1:330661296496:web:f8c18c1d391d0980bbb7b5",
  measurementId: "G-LGM6Y1WCK6"
};

let app, auth, db, storage;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase Başlatma Hatası:", error);
}

export { app, auth, db, storage };