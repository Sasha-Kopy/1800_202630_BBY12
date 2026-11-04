import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebaseConfig.js";

export async function signUp(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export const logIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logOut = () => signOut(auth);

// Calls cb(user) now and whenever login state changes (user is null when logged out)
export const onUser = (cb) => onAuthStateChanged(auth, cb);

// For pages that need a logged-in user: sends logged-out visitors to login.html,
// otherwise calls cb(user).
export const requireUser = (cb) =>
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }
    cb(user);
  });

const MESSAGES = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a moment, then try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "Email/Password sign-in isn't enabled in the Firebase console.",
};

export function showError(err) {
  const box = document.getElementById("authAlert");
  box.textContent = MESSAGES[err.code] || `Something went wrong (${err.code || err.message}).`;
  box.classList.remove("d-none");
}

export function hideError() {
  document.getElementById("authAlert").classList.add("d-none");
}