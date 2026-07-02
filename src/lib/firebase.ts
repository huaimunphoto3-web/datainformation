import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider setup with drive & spreadsheet scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/drive");
googleProvider.addScope("https://www.googleapis.com/auth/spreadsheets");

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) {
      throw new Error("ไม่สามารถดึง Access Token จากการลงชื่อเข้าใช้ Google");
    }
    return {
      user: result.user,
      accessToken: credential.accessToken,
    };
  } catch (error) {
    console.error("Google login failed:", error);
    throw error;
  }
};

export const logoutGoogle = async () => {
  await signOut(auth);
};
