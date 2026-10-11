// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "nexora-ai-a5d0a.firebaseapp.com",
  projectId: "nexora-ai-a5d0a",
  storageBucket: "nexora-ai-a5d0a.firebasestorage.app",
  messagingSenderId: "1048469649748",
  appId: "1:1048469649748:web:8059ea6fff0ebc539230c1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth=getAuth(app)
export const googleProvider=new GoogleAuthProvider()