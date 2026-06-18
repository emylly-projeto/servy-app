import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "memoriza-app.firebaseapp.com",
  projectId: "memoriza-app",
  storageBucket: "memoriza-app.firebasestorage.app",
  messagingSenderId: "484686687123",
  appId: "1:484686687123:web:984595cee0aa5eef3e1666",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;