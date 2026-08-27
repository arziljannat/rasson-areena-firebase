import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// PLAYER HISTORY - CURRENT DAY ONLY
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

function formatTime(value) {
    if (!value) return "-";

    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("en-PK", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDuration(seconds) {
    let total = Number(seconds || 0);
    if (!Number.isFinite(total)) total = 0;

    total = Math.max(0, Math.floor(total));

    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

function getRate(session) {
    return Number(
        session?.selected_rate ??
        session?.selectedRate ??
        (getPlay(session) === "century"
            ? session?.century_rate
            : session?.frame_rate) ??
        0
    );
}

function getGameAmount(session) {
    return Number(
        session?.final_game_amount ??
        session?.final_amount ??
        session?.original_game_amount ??
        0
    );
}

function getCanteenAmount(session) {
    return Number(session?.canteen_total || 0);
}

function getTotalAmount(session) {
    return getGameAmount(session) + getCanteenAmount(session);
}

function getDiscount(session) {
    return Number(session?.discount || 0);
}

// --------------------------------------------------
// CURRENT DAY ID
// --------------------------------------------------
async function getCurrentDayId() {
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
    let latestTime = -Infinity;

    snap.forEach(docSnap => {
        const data = docSnap.data();
        const created = data?.created_at;
        const createdTime = created?.toDate
            ? created.toDate().getTime()
            : new Date(created || 0).getTime();

        if (!latest || createdTime > latestTime) {
            latest = data;
            latestTime = createdTime;
        }
    });

    if (latest?.day_id === undefined || latest?.day_id === null) {
        throw new Error("Current day ID is missing.");
    }

    // Keep the global value in sync with the current-day record.
    window.currentDayId = latest.day_id;

    return latest.day_id;
}

// --------------------------------------------------
// LOAD CURRENT DAY ONLY
// --------------------------------------------------
async function fetchPlayerHistory() {
    if (!window.db) {
        throw new Error("Firebase database is not ready yet.");
    }

    const currentDayId = await getCurrentDayId();

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", getBranch())
    );

    const snap = await getDocs(q);
    const records = [];

    snap.forEach(docSnap => {
        const session = docSnap.data();

        // IMPORTANT: Player History is CURRENT DAY only.
        if (String(session?.day_id) !== String(currentDayId)) return;
        if (session?.is_deleted === true) return;
        if (!session?.end_time) return;

        const players = getPlayers(session);

records.push({
    id: docSnap.id,
    session,
    player1: players.player1,
    player2: players.player2,

    // 🔥 ACTUAL TABLE NAME
    tableName:
        session?.table_id ||
        session?.table_name ||
        session?.tableName ||
        "-"
});
    });

    records.sort((a, b) => {
        const aDate = a.session?.end_time;
        const bDate = b.session?.end_time;

        const ta = aDate?.toDate
            ? aDate.toDate().getTime()
            : new Date(aDate || a.session?.start_time || 0).getTime();

        const tb = bDate?.toDate
            ? bDate.toDate().getTime()
            : new Date(bDate || b.session?.start_time || 0).getTime();

        return tb - ta;
    });

    console.log("PLAYER HISTORY CURRENT DAY:", currentDayId);
    console.log("PLAYER HISTORY RESULTS:", records.length);

    return records;
}

// --------------------------------------------------
// PLAYER HISTORY LAYOUT
// --------------------------------------------------
function ensurePlayerHistoryLayout() {
    const popup = getPopup();
    if (!popup) return null;

    const box = popup.querySelector(".popup-box");
    if (!box) return null;

    // Remove the old dynamically-created summary cards.
    const oldSummary = box.querySelector("#playerHistorySummary");
    if (oldSummary) oldSummary.remove();

    const table = box.querySelector("table.history-table");
    const thead = table?.querySelector("thead");

    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>PLAYERS</th>
                <th>TABLE</th>
                <th>Check-in</th>
                <th>Checkout</th>
                <th>Play</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Discount</th>
                <th>Canteen</th>
                <th>Total</th>
                <th>Paid</th>
            </tr>
        `;
    }

    return table;
}

function makeStatusBadge(paid) {
    if (paid === true) {
        return `
            <span style="
                display:inline-block;
                padding:5px 12px;
                border-radius:6px;
                background:#00ff88;
                color:#001a0d;
                font-weight:800;
                box-shadow:0 0 10px rgba(0,255,136,.65);
            ">PAID</span>
        `;
    }

    return `
        <span style="
            display:inline-block;
            padding:5px 12px;
            border-radius:6px;
            background:#ff3b3b;
            color:#fff;
            font-weight:800;
            box-shadow:0 0 10px rgba(255,59,59,.65);
        ">UNPAID</span>
    `;
}

// --------------------------------------------------
// SEARCH CURRENT-DAY PLAYER HISTORY
// --------------------------------------------------
async function searchPlayerHistory() {
    const body = document.getElementById("playerHistoryBody");
    const input = document.getElementById("playerSearchInput");

    if (!body || !input) {
        console.error("PLAYER HISTORY: search elements not found.");
        return;
    }

    ensurePlayerHistoryLayout();

    const search = input.value.trim().toLowerCase();

    body.innerHTML = `
        <tr>
            <td colspan="12">Loading...</td>
        </tr>
    `;

    try {
        const records = await fetchPlayerHistory();

        const filtered = search
            ? records.filter(item => {
                const p1 = String(item.player1 || "").toLowerCase();
                const p2 = String(item.player2 || "").toLowerCase();
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
                    <td colspan="12">No player history found</td>
                </tr>
            `;
            return;
        }

        body.innerHTML = filtered.map((item, index) => {
            const s = item.session;
            const gameAmount = getGameAmount(s);
            const discount = getDiscount(s);
            const canteen = getCanteenAmount(s);
            const total = getTotalAmount(s);
            const paid = s?.paid === true;

return `
    <tr>
        <td>${index + 1}</td>

        <td>
            ${escapeHtml(`${item.player1 || "-"} VS ${item.player2 || "-"}`)}
        </td>

        <td>
            ${escapeHtml(item.tableName || "-")}
        </td>

        <td>
            ${escapeHtml(formatTime(s?.start_time))}
        </td>
                    <td>${escapeHtml(formatTime(s?.end_time))}</td>
                    <td>${escapeHtml(formatDuration(s?.final_seconds))}</td>
                    <td>${escapeHtml(getRate(s))}</td>
                    <td>Rs ${gameAmount}</td>
                    <td>Rs ${discount}</td>
                    <td>Rs ${canteen}</td>
                    <td>Rs ${total}</td>
                    <td>${makeStatusBadge(paid)}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("PLAYER HISTORY ERROR:", error);

        body.innerHTML = `
            <tr>
                <td colspan="12">Error loading player history</td>
            </tr>
        `;
    }
}

// --------------------------------------------------
// OPEN / CLOSE
// --------------------------------------------------
function openPlayerHistory() {
    const popup = getPopup();

    if (!popup) {
        console.error("PLAYER HISTORY: playerHistoryPopup not found.");
        return;
    }

    ensurePlayerHistoryLayout();
    popup.classList.remove("hidden");

    const input = document.getElementById("playerSearchInput");
    if (input) input.focus();

    searchPlayerHistory();
}

function closePlayerHistory() {
    const popup = getPopup();

    if (popup) {
        popup.classList.add("hidden");
    }
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
        searchBtn.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            searchPlayerHistory();
        };
    }

    if (closeBtn) {
        closeBtn.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            closePlayerHistory();
        };
    }

    if (input && !input.dataset.playerHistoryBound) {
        input.dataset.playerHistoryBound = "1";
        input.addEventListener("keydown", function (event) {
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

console.log("PLAYER HISTORY MODULE LOADED - CURRENT DAY TABLE STYLE");
