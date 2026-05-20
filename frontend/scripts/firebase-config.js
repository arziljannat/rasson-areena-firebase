// FIREBASE CONFIG
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxWHQhtQx-iOT2mkYzaOz0AimS32mTHdU",
  authDomain: "rasson-areena.firebaseapp.com",
  projectId: "rasson-areena",
  storageBucket: "rasson-areena.firebasestorage.app",
  messagingSenderId: "151625048085",
  appId: "1:151625048085:web:b3839580a3660f7327ee1c"
};

const app = initializeApp(firebaseConfig);

// GLOBAL DB
window.db = getFirestore(app);