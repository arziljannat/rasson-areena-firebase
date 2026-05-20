import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("LOGIN FIREBASE LOADED");

// ==========================
// LOGIN FUNCTION
// ==========================
window.loginUser = async function () {

    const username = document.getElementById("loginUserId").value.trim();
const password = document.getElementById("loginPassword").value.trim();
const branchInput = document.getElementById("branchCode").value.trim().toLowerCase();

    if (!username || !password || !branchInput) {
        alert("Please fill all fields");
        return;
    }

    try {

        // 🔥 query user
        const q = query(
    collection(window.db, "users"),
    where("username", "==", username.toLowerCase().trim())
);

        const snap = await getDocs(q);

        if (snap.empty) {
            alert("User not found ❌");
            return;
        }

        let userData = null;

        snap.forEach(doc => {
            userData = doc.data();
        });

        // ==========================
        // CHECK PASSWORD
        // ==========================
        if ((userData.password || "").trim() !== password.trim()){
            alert("Wrong password ❌");
            return;
        }

        // ==========================
        // CHECK STATUS
        // ==========================
        if (userData.status !== "active") {
            alert("User is inactive ❌");
            return;
        }

        // ==========================
        // CHECK BRANCH
        // ==========================
        if ((userData.branch || "").toLowerCase().trim() !== branchInput) {
            alert("Wrong branch ❌");
            return
        }

        // ==========================
        // SAVE SESSION
        // ==========================
        localStorage.setItem("username", userData.username);
        localStorage.setItem("role", userData.role);
        localStorage.setItem("branch", "areena");
        localStorage.setItem(
    "branch",
    String(userData.branch || "")
        .toLowerCase()
        .replace(/\s+/g, "")
);
        localStorage.setItem("loginTime", Date.now());

        console.log("LOGIN SUCCESS:", userData);

        // ==========================
        // REDIRECT
        // ==========================
        window.location.href = "html/dashboard.html";

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        alert("Login failed");
    }
};
