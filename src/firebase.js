import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_Mp2hmjFNXQ9UTpWwItm2X3sKf95N9aA",
  authDomain: "candidates-notes.firebaseapp.com",
  projectId: "candidates-notes",
  storageBucket: "candidates-notes.firebasestorage.app",
  messagingSenderId: "882096371372",
  appId: "1:882096371372:web:2260a09d245e371cf81109",
  measurementId: "G-G1PF6BDFFS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 