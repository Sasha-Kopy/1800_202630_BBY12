import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values identify the project; they are not secrets.
// Access is protected by firestore.rules, not by hiding this config.
const firebaseConfig = {
  apiKey: "AIzaSyB7Nf-XBAeKKVeTvolJS7tMKz20qN56j6w",
  authDomain: "money-saving-project-2026.firebaseapp.com",
  projectId: "money-saving-project-2026",
  storageBucket: "money-saving-project-2026.firebasestorage.app",
  messagingSenderId: "124053304280",
  appId: "1:124053304280:web:a586857565c7570137b8ad",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
