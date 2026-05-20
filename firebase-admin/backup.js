const admin = require("firebase-admin");
const fs = require("fs");

// 🔥 SERVICE ACCOUNT FILE
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔥 COLLECTIONS LIST
const collections = [
  "users",
  "tables",
  "sessions",
  "canteen_logs",
  "expenses",
  "days"
];

// 🔥 BACKUP FUNCTION
async function backup() {
  let backupData = {};

  for (let col of collections) {
    const snapshot = await db.collection(col).get();

    backupData[col] = [];

    snapshot.forEach(doc => {
      backupData[col].push(doc.data());
    });
  }

  // 🔥 FILE SAVE
  const fileName = `backup-${Date.now()}.json`;

  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2));

  console.log("✅ Backup created:", fileName);
}

backup();