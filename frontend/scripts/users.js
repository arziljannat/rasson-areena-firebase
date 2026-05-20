import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("USERS FIREBASE FINAL LOADED");

// ==========================
const role = localStorage.getItem("role");
const branch = localStorage.getItem("branch");

let users = [];
let selectedId = null;

// ==========================
// ACCESS CONTROL
// ==========================
if (role !== "admin" && role !== "super_admin") {
    alert("Access Denied");
    window.location.href = "dashboard.html";
}

// ==========================
// LOAD USERS REALTIME
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    loadUsers();
});

function loadUsers() {

    onSnapshot(collection(window.db, "users"), (snap) => {

        users = [];

        snap.forEach(docSnap => {

            const u = docSnap.data();

            if (u.branch !== branch) return;

            users.push({
                id: docSnap.id,
                ...u
            });
        });

        renderUsers();
    });
}

// ==========================
// RENDER
// ==========================
function renderUsers() {

    const body = document.getElementById("usersBody");
    body.innerHTML = "";

    users.forEach(u => {

        body.innerHTML += `
        <tr>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>${u.status}</td>
            <td>
${u.created_at 
    ? new Date(u.created_at).toLocaleString() 
    : "—"}
</td>
            <td class="admin-only">
                <button class="popup-btn" onclick="openEditUser('${u.id}')">Edit</button>
<button class="popup-btn delete" onclick="openDeleteUser('${u.id}')">Delete</button>
            </td>
        </tr>
        `;
    });
}

// ==========================
// ADD USER
// ==========================
window.openAddUser = () => {
    document.getElementById("addUserPopup").style.display = "flex";
};

window.closeAddUser = () => {
    document.getElementById("addUserPopup").style.display = "none";
};

window.saveNewUser = async () => {

    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value.trim();
    const roleVal = document.getElementById("newRole").value;
    const status = document.getElementById("newStatus").value;

    if (!username || !password) {
        alert("Fill all fields");
        return;
    }

    await addDoc(collection(window.db, "users"), {
        username,
        password,
        role: roleVal,
        status,
        branch,
        created_at: Date.now()
    });

    closeAddUser();
};

// ==========================
// EDIT USER
// ==========================
window.openEditUser = (id) => {

    selectedId = id;

    const u = users.find(x => x.id === id);

    document.getElementById("editUsername").value = u.username;
    document.getElementById("editRole").value = u.role;
    document.getElementById("editStatus").value = u.status;

    document.getElementById("editUserPopup").style.display = "flex";
};

window.closeEditUser = () => {
    document.getElementById("editUserPopup").style.display = "none";
};

window.updateUser = async () => {

    const username = document.getElementById("editUsername").value;
    const password = document.getElementById("editPassword").value;
    const roleVal = document.getElementById("editRole").value;
    const status = document.getElementById("editStatus").value;

    let data = {
        username,
        role: roleVal,
        status
    };

    if (password) data.password = password;

    await updateDoc(doc(window.db, "users", selectedId), data);

    closeEditUser();
};

// ==========================
// DELETE USER
// ==========================
window.openDeleteUser = (id) => {
    selectedId = id;
    document.getElementById("deleteUserPopup").style.display = "flex";
};

window.closeDeleteUser = () => {
    document.getElementById("deleteUserPopup").style.display = "none";
};

window.confirmDeleteUser = async () => {

    await deleteDoc(doc(window.db, "users", selectedId));

    closeDeleteUser();
};