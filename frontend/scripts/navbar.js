
console.log("NAVBAR JS LOADED");

// 🔒 PAGE PROTECTION (ADD HERE)
const username = localStorage.getItem("username");

if (!username) {
    alert("Session expired, login again");
    window.location.href = "../index.html";
}
// ✅ DEFAULT BRANCH FIX (SAFE ADD)
let savedBranch = localStorage.getItem("branch");

if (!savedBranch) {
    console.warn("No branch found → redirecting to login");
    window.location.href = "../index.html";
}
document.addEventListener("DOMContentLoaded", () => {

    let role = (localStorage.getItem("role") || "").trim().toLowerCase();
    let branch = localStorage.getItem("branch");

    // ✅ FIRST define, then use
    if (!branch) {
        console.error("Branch missing — redirecting to login");
        window.location.href = "../index.html";
        return;
    }

    console.log("CURRENT BRANCH:", branch);

    const branchSelect = document.getElementById("branchSelect");

    // =========================
    // STAFF RESTRICTIONS (FIXED)
    // =========================
    if (role === "staff") {

        // delay taake navbar load ho jaye
        setTimeout(() => {
            document.querySelectorAll(".admin-only").forEach(el => {
                el.style.display = "none";
            });
        }, 300);

    }

    // =========================
    // SET SELECTED BRANCH
    // =========================
if (branch && branchSelect) {
    // DB → UI format convert
    let displayBranch = branch.replace(/(\D+)(\d+)/, "$1 $2");
    branchSelect.value = displayBranch;
}

    // =========================
    // BRANCH CHANGE (ADMIN ONLY)
    // =========================
if (branchSelect) {
    branchSelect.addEventListener("change", () => {
        if (role === "admin" || role === "super_admin") {

            const selected = branchSelect.value.replace(/\s+/g, "").trim();

            console.log("NEW SELECTED BRANCH:", selected);

            if (!selected) {
                alert("Invalid branch");
                return;
            }

            // ✅ SAVE + RELOAD (FINAL FIX)
            localStorage.setItem("branch", selected);
            window.location.reload();
        }
    });
}

    // =========================
    // ACTIVE NAV HIGHLIGHT
    // =========================
    let currentPage = window.location.pathname.split("/").pop().replace(".html", "");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.dataset.page === currentPage) btn.classList.add("active-nav");
    });

});

// =========================
// NAVIGATION
// =========================
function goTo(page) {
    window.location.href = `../html/${page}.html`;
}

// ⏰ AUTO LOGOUT (12 hours)
const loginTime = localStorage.getItem("loginTime");

if (!loginTime) {
    localStorage.setItem("loginTime", Date.now());
} else {
    let diff = Date.now() - Number(loginTime);

    if (diff > 12 * 60 * 60 * 1000) {
        localStorage.clear();
        alert("Session expired");
        window.location.href = "../index.html";
    }
}


// =========================
// DIGITAL CLOCK (12 HOURS)
// =========================
function updateClock() {

    const clock = document.getElementById("digitalClock");

    if (!clock) return;

    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    let ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    hours = String(hours).padStart(2, "0");
    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    clock.innerHTML = `${hours}:${minutes}:${seconds}<span>${ampm}</span>`;
}

// =========================
// START CLOCK AFTER PAGE LOAD
// =========================
window.addEventListener("load", () => {

    updateClock();

    setInterval(updateClock, 1000);

});
