const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeSuperAdmin() {

  const email = "arziljannat2015@gmail.com"; // 🔴 apna email dalna

  const user = await admin.auth().getUserByEmail(email);

  await db.collection("users").doc(user.uid).set({
    role: "super_admin",
    email: user.email
  }, { merge: true });

  console.log("✅ Super Admin Set:", user.email);
}

makeSuperAdmin();