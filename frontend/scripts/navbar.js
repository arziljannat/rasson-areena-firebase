console.log("NAVBAR JS LOADED");

// 🔒 PAGE PROTECTION
const username = localStorage.getItem("username");

if (!username) {
    alert("Session expired, login again");
    window.location.href = "../index.html";
}

// ✅ FORCE SINGLE BRANCH
localStorage.setItem("branch", "areena");

document.addEventListener("DOMContentLoaded", () => {

    let role = (localStorage.getItem("role") || "").trim().toLowerCase();
    let branch = "areena";

    console.log("CURRENT BRANCH:", branch);

    const branchSelect = document.getElementById("branchSelect");

    // =========================
    // STAFF RESTRICTIONS
    // =========================
    if (role === "staff") {

        setTimeout(() => {
            document.querySelectorAll(".admin-only").forEach(el => {
                el.style.display = "none";
            });
        }, 300);

    }

    // =========================
    // ONLY AREENA BRANCH
    // =========================
    if (branchSelect) {

        branchSelect.innerHTML = `
            <option value="areena">Areena</option>
        `;

        branchSelect.value = "areena";

        // disable changing
        branchSelect.disabled = true;
    }

    // =========================
    // ACTIVE NAV HIGHLIGHT
    // =========================
    let currentPage = window.location.pathname
        .split("/")
        .pop()
        .replace(".html", "");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.dataset.page === currentPage) {
            btn.classList.add("active-nav");
        }
    });

});

// =========================
// NAVIGATION
// =========================
function goTo(page) {
    window.location.href = `../html/${page}.html`;
}

// =========================
// AUTO LOGOUT (12 HOURS)
// =========================
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
// DIGITAL CLOCK
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

    clock.innerHTML =
        `${hours}:${minutes}:${seconds}<span>${ampm}</span>`;
}

// =========================
// START CLOCK
// =========================
window.addEventListener("load", () => {

    updateClock();

    setInterval(updateClock, 1000);

});