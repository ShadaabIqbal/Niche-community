import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCkur85DXrW9hO5Uol7mOMc4NTQhOiRGG4",
  authDomain: "niche-community-platform.firebaseapp.com",
  projectId: "niche-community-platform",
  storageBucket: "niche-community-platform.firebasestorage.app",
  messagingSenderId: "315689744933",
  appId: "1:315689744933:web:15636d4bf1af78a2e49dcc",
  measurementId: "G-4TQ6M8TPD8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
