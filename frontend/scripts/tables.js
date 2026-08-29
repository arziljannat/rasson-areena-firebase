import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
let warningAudio = null;
let audioUnlocked = false;


/******************************************************
 * GLOBAL MONEY FORMATTER
 ******************************************************/
function formatMoney(value) {
    return Number(value || 0).toLocaleString();
}

// 🔥 CENTRAL DAY SYSTEM (FIREBASE)
async function initCurrentDay() {

    const q = query(
        collection(window.db, "system"),
        where("branch", "==", BRANCH),
        where("type", "==", "current_day"),
        orderBy("created_at", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {

        const docSnap = snap.docs[0];

        if (docSnap) {
            const d = docSnap.data();
            window.currentDayId = d.day_id;
        }

        // 🔥 SAFE CHECK ANDAR HI
        if (!window.currentDayId) {
            console.error("❌ DAY ID NOT SET - CRITICAL");
        }

    } else {

        const newDayId = Date.now();

        await addDoc(collection(window.db, "system"), {
            type: "current_day",
            branch: BRANCH,
            day_id: newDayId,
            created_at: new Date().toISOString()
        });

        window.currentDayId = newDayId;
    }

    console.log("🔥 CENTRAL DAY:", window.currentDayId);
}
