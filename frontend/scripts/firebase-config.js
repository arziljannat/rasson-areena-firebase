// FIREBASE CONFIG
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REAL_KEY",
  authDomain: "habib-software.firebaseapp.com",
  projectId: "habib-software",
  storageBucket: "habib-software.appspot.com",
  messagingSenderId: "196023641561",
  appId: "1:196023641561:web:xxxxx"
};

const app = initializeApp(firebaseConfig);

// 🔥 GLOBAL DB
window.db = getFirestore(app);