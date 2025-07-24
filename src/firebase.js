// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFIrsU54TWKOXZCLAn5eUyAib3McHhBeY",
  authDomain: "cotizadorccs-38398.firebaseapp.com",
  projectId: "cotizadorccs-38398",
  storageBucket: "cotizadorccs-38398.firebasestorage.app",
  messagingSenderId: "635864265146",
  appId: "1:635864265146:web:81160bb537d67792f06d83",
  measurementId: "G-LSJQ1Q47ZV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
