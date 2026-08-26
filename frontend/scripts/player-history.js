import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// PLAYER HISTORY - STANDALONE MODULE
// ==========================================

function getBranch() {
    return (localStorage.getItem("branch") || "rasson1").toLowerCase();
}

function getPopup() {
    return document.getElementById("playerHistoryPopup");
}

function getPlayerValue(session, keys) {
    for (const key of keys) {
        const value = session?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            if (typeof value === "object" && value.name) return String(value.name);
            return String(value);
        }
    }
    return "";
}

function getPlayers(session) {
    let player1 = getPlayerValue(session, [
        "player1_name",
        "player1Name",
        "player1"
    ]);

    let player2 = getPlayerValue(session, [
        "player2_name",
        "player2Name",
        "player2"
    ]);

    const players = Array.isArray(session?.players) ? session.players : [];

    if (!player1 && players[0]) {
        player1 = typeof players[0] === "object"
            ? (players[0].name || players[0].player_name || "")
            : String(players[0]);
    }

    if (!player2 && players[1]) {
        player2 = typeof players[1] === "object"
            ? (players[1].name || players[1].player_name || "")
            : String(players[1]);
    }

    return {
        player1: String(player1 || ""),
        player2: String(player2 || "")
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-PK", {
        timeZone: "Asia/Karachi"
    });
}

function getAmount(session) {
    return Number(
        session?.final_amount ??
        session?.final_game_amount ??
        session?.original_game_amount ??
        0
    );
}

function getPlay(session) {
    return (
        session?.selected_play_type ||
        session?.selectedPlayType ||
        session?.play_type ||
        session?.playType ||
        "-"
    );
}

// --------------------------------------------------
// CURRENT DAY ID
// --------------------------------------------------
// Prefer tables.js value. If it is not ready yet, read
// the latest current_day record for this branch without
// requiring a Firestore composite index.
async function getCurrentDayId() {
    if (window.currentDayId !== undefined && window.currentDayId !== null) {
        return window.currentDayId;
    }

    if (!window.db) {
        throw new Error("Firebase database is not ready yet.");
    }

    const q = query(
        collection(window.db, "system"),
        where("branch", "==", getBranch()),
        where("type", "==", "current_day")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
        throw new Error("Current day not found.");
    }

    let latest = null;

    snap.forEach(docSnap => {
        const data = docSnap.data();

        if (!latest) {
            latest = data;
            return;
        }

        const a = new Date(latest.created_at || 0).getTime();
        const b = new Date(data.created_at || 0).getTime();

        if (b > a) latest = data;
    });

    if (latest?.day_id === undefined || latest?.day_id === null) {
        throw new Error("Current day ID is missing.");
    }

    window.currentDayId = latest.day_id;
    return latest.day_id;
}

// --------------------------------------------------
// LOAD ONLY CURRENT DAY PLAYER HISTORY
// --------------------------------------------------
async function fetchPlayerHistory() {
    if (!window.db) {
        throw new Error("Firebase database is not ready yet.");
    }

    const currentDayId = await getCurrentDayId();

    // Keep the Firebase query simple so no new composite
    // index is required. Current-day filtering is done below.
    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", getBranch())
    );

    const snap = await getDocs(q);
    const records = [];

    snap.forEach(docSnap => {
        const session = docSnap.data();

        // IMPORTANT: Player History = CURRENT DAY ONLY.
        if (String(session?.day_id) !== String(currentDayId)) return;
        if (session?.is_deleted === true) return;
        if (!session?.end_time) return;

        const players = getPlayers(session);

        records.push({
            id: docSnap.id,
            session,
            player1: players.player1,
            player2: players.player2
        });
    });

    records.sort((a, b) => {
        const ta = new Date(a.session?.end_time || a.session?.start_time || 0).getTime();
        const tb = new Date(b.session?.end_time || b.session?.start_time || 0).getTime();
        return tb - ta;
    });

    console.log("PLAYER HISTORY CURRENT DAY:", currentDayId);
    console.log("PLAYER HISTORY RESULTS:", records.length);

    return records;
}

async function searchPlayerHistory() {
    const body = document.getElementById("playerHistoryBody");
    const input = document.getElementById("playerSearchInput");

    if (!body || !input) return;

    const search = input.value.trim().toLowerCase();

    body.innerHTML = `
        <tr>
            <td colspan="8">Loading...</td>
        </tr>
    `;

    try {
        const records = await fetchPlayerHistory();

        const filtered = search
            ? records.filter(item => {
                const p1 = item.player1.toLowerCase();
                const p2 = item.player2.toLowerCase();
                const checkout = String(item.session?.checkout_player || "").toLowerCase();

                return (
                    p1.includes(search) ||
                    p2.includes(search) ||
                    checkout.includes(search)
                );
            })
            : records;

        if (!filtered.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="8">No player history found</td>
                </tr>
            `;
            return;
        }

        body.innerHTML = filtered.map((item, index) => {
            const s = item.session;
            const amount = getAmount(s);
            const status = s.paid === true ? "Paid" : "Unpaid";

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(formatDate(s.end_time || s.start_time))}</td>
                    <td>${escapeHtml(item.player1 || "-")}</td>
                    <td>${escapeHtml(item.player2 || "-")}</td>
                    <td>${escapeHtml(s.table_id || "-")}</td>
                    <td>${escapeHtml(getPlay(s))}</td>
                    <td>Rs ${amount}</td>
                    <td>${escapeHtml(status)}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("PLAYER HISTORY ERROR:", error);

        body.innerHTML = `
            <tr>
                <td colspan="8">Error loading player history</td>
            </tr>
        `;
    }
}

function openPlayerHistory() {
    const popup = getPopup();
    if (!popup) {
        console.error("playerHistoryPopup not found");
        return;
    }

    popup.classList.remove("hidden");

    const input = document.getElementById("playerSearchInput");
    if (input) input.focus();

    searchPlayerHistory();
}

function closePlayerHistory() {
    const popup = getPopup();
    if (popup) popup.classList.add("hidden");
}

// --------------------------------------------------
// GLOBAL FUNCTIONS
// --------------------------------------------------
window.openPlayerHistory = openPlayerHistory;
window.searchPlayerHistory = searchPlayerHistory;
window.closePlayerHistory = closePlayerHistory;

// --------------------------------------------------
// BUTTONS + ENTER KEY
// --------------------------------------------------
function bindPlayerHistoryButtons() {
    const searchBtn = document.getElementById("searchPlayerBtn");
    const closeBtn = document.getElementById("closePlayerHistoryBtn");
    const input = document.getElementById("playerSearchInput");

    if (searchBtn) {
        searchBtn.onclick = event => {
            event.preventDefault();
            searchPlayerHistory();
        };
    }

    if (closeBtn) {
        closeBtn.onclick = event => {
            event.preventDefault();
            closePlayerHistory();
        };
    }

    if (input) {
        input.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchPlayerHistory();
            }
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPlayerHistoryButtons, { once: true });
} else {
    bindPlayerHistoryButtons();
}

console.log("PLAYER HISTORY MODULE LOADED - FIXED");
