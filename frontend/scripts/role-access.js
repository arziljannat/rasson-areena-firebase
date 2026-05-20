// ===========================================
// GLOBAL ROLE ACCESS SYSTEM
// ===========================================

let ROLE = localStorage.getItem("role") || "";

// ===============================
// APPLY UI ACCESS
// ===============================
function applyRoleAccess() {

    if (!ROLE) return;

    // USERS PAGE (ADMIN ONLY)
    if (ROLE !== "admin" && ROLE !== "super_admin") {
        hideClass("users-page-only");
    }

    // REPORTS
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideClass("reports-only");
    }

    // ADMIN CONTROLS
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideClass("admin-only");
    }

    // INVENTORY SPECIAL
    if (ROLE === "frontdesk") {
        hideClass("inv-editor");
    }

    // EXPENSE EDIT
    if (ROLE !== "admin" && ROLE !== "manager") {
        hideClass("expense-edit-only");
    }
}

// ===============================
// HELPERS
// ===============================
function hideClass(cls) {
    document.querySelectorAll("." + cls)
        .forEach(el => el.style.display = "none");
}

// ===============================
// FUNCTION SECURITY (ANTI HACK)
// ===============================
const adminFunctions = [
    "updateUser",
    "saveNewUser",
    "confirmDeleteUser"
];

function secureFunctions() {

    adminFunctions.forEach(fn => {

        if (typeof window[fn] === "function") {

            const original = window[fn];

            window[fn] = function () {

                if (ROLE === "admin" || ROLE === "super_admin") {
                    return original();
                }

                alert("Access Denied ❌");
            };
        }
    });
}

// ===============================
// AUTO LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    applyRoleAccess();
    setTimeout(secureFunctions, 500);
});