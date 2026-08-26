import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// PLAYER HISTORY - CURRENT DAY
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
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("en-PK", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function formatDuration(seconds) {
    let total = Math.max(0, Number(seconds || 0));

    if (!Number.isFinite(total)) total = 0;

    total = Math.floor(total);

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

function getShift(session) {
    const shift = Number(session?.shift_number);
    return shift === 2 ? 2 : 1;
}

function isBooking(session) {
    return Boolean(
        session?.booking_id ||
        session?.bookingId ||
        session?.is_booking === true ||
        session?.isBooking === true ||
        session?.booking === true ||
        session?.source === "booking" ||
        session?.source === "online_booking"
    );
}

// --------------------------------------------------
// CURRENT DAY ID
// --------------------------------------------------
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

        // PLAYER HISTORY = CURRENT DAY ONLY
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

// --------------------------------------------------
// MAKE PLAYER HISTORY LOOK LIKE TABLE HISTORY
// --------------------------------------------------
function ensurePlayerHistoryLayout() {
    const popup = getPopup();
    if (!popup) return null;

    const box = popup.querySelector(".popup-box");
    if (!box) return null;

    // Create the same summary-card area used by Table History.
    let summary = document.getElementById("playerHistorySummary");

    if (!summary) {
        summary = document.createElement("div");
        summary.id = "playerHistorySummary";
        summary.className = "history-summary-counters";

        summary.innerHTML = `
            <div class="history-summary-box green">
                <div class="history-card-title">🎮 TOTAL GAME</div>
                <div class="history-card-head"><span>Shift 1</span><span>Shift 2</span></div>
                <div class="history-card-values">
                    <strong id="playerHistoryS1Game">0</strong>
                    <strong id="playerHistoryS2Game">0</strong>
                </div>
            </div>

            <div class="history-summary-box green">
                <div class="history-card-title">👤 GUEST PLAY</div>
                <div class="history-card-head"><span>Shift 1</span><span>Shift 2</span></div>
                <div class="history-card-values">
                    <strong id="playerHistoryS1Guest">0</strong>
                    <strong id="playerHistoryS2Guest">0</strong>
                </div>
            </div>

            <div class="history-summary-box gold">
                <div class="history-card-title">📅 BOOKING PLAY</div>
                <div class="history-card-head"><span>Shift 1</span><span>Shift 2</span></div>
                <div class="history-card-values">
                    <strong id="playerHistoryS1Booking">0</strong>
                    <strong id="playerHistoryS2Booking">0</strong>
                </div>
            </div>

            <div class="history-summary-box green">
                <div class="history-card-title">💰 PAID</div>
                <div class="history-card-head"><span>Shift 1</span><span>Shift 2</span></div>
                <div class="history-card-values">
                    <strong id="playerHistoryS1Paid">0</strong>
                    <strong id="playerHistoryS2Paid">0</strong>
                </div>
                <div class="history-card-amount">
                    <span id="playerHistoryS1PaidAmount">Rs. 0</span>
                    <span id="playerHistoryS2PaidAmount">Rs. 0</span>
                </div>
            </div>

            <div class="history-summary-box red">
                <div class="history-card-title">⚠️ UNPAID</div>
                <div class="history-card-head"><span>Shift 1</span><span>Shift 2</span></div>
                <div class="history-card-values">
                    <strong id="playerHistoryS1Unpaid">0</strong>
                    <strong id="playerHistoryS2Unpaid">0</strong>
                </div>
                <div class="history-card-amount">
                    <span id="playerHistoryS1UnpaidAmount">Rs. 0</span>
                    <span id="playerHistoryS2UnpaidAmount">Rs. 0</span>
                </div>
            </div>
        `;

        const tableWrapper = box.querySelector(".table-mobile-wrapper");
        if (tableWrapper) {
            box.insertBefore(summary, tableWrapper);
        } else {
            box.appendChild(summary);
        }
    }

    // Replace the simple Player History columns with the same detailed
    // information shown in Table History.
    const table = box.querySelector("table.history-table");
    const thead = table?.querySelector("thead");

    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>PLAYERS</th>
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

    return summary;
}

function updatePlayerSummary(records) {
    ensurePlayerHistoryLayout();

    const stats = {
        1: { game: 0, guest: 0, booking: 0, paid: 0, paidAmount: 0, unpaid: 0, unpaidAmount: 0 },
        2: { game: 0, guest: 0, booking: 0, paid: 0, paidAmount: 0, unpaid: 0, unpaidAmount: 0 }
    };

    records.forEach(item => {
        const s = item.session;
        const shift = getShift(s);
        const st = stats[shift];
        const total = getTotalAmount(s);

        st.game += 1;

        if (isBooking(s)) st.booking += 1;
        else st.guest += 1;

        if (s.paid === true) {
            st.paid += 1;
            st.paidAmount += total;
        } else {
            st.unpaid += 1;
            st.unpaidAmount += total;
        }
    });

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText("playerHistoryS1Game", stats[1].game);
    setText("playerHistoryS2Game", stats[2].game);

    setText("playerHistoryS1Guest", stats[1].guest);
    setText("playerHistoryS2Guest", stats[2].guest);

    setText("playerHistoryS1Booking", stats[1].booking);
    setText("playerHistoryS2Booking", stats[2].booking);

    setText("playerHistoryS1Paid", stats[1].paid);
    setText("playerHistoryS2Paid", stats[2].paid);
    setText("playerHistoryS1PaidAmount", `Rs. ${stats[1].paidAmount}`);
    setText("playerHistoryS2PaidAmount", `Rs. ${stats[2].paidAmount}`);

    setText("playerHistoryS1Unpaid", stats[1].unpaid);
    setText("playerHistoryS2Unpaid", stats[2].unpaid);
    setText("playerHistoryS1UnpaidAmount", `Rs. ${stats[1].unpaidAmount}`);
    setText("playerHistoryS2UnpaidAmount", `Rs. ${stats[2].unpaidAmount}`);
}

async function searchPlayerHistory() {
    const body = document.getElementById("playerHistoryBody");
    const input = document.getElementById("playerSearchInput");

    if (!body || !input) return;

    ensurePlayerHistoryLayout();

    const search = input.value.trim().toLowerCase();

    body.innerHTML = `
        <tr>
            <td colspan="11">Loading...</td>
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

        // Summary always follows the currently searched player.
        updatePlayerSummary(filtered);

        if (!filtered.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="11">No player history found</td>
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
            const status = s.paid === true ? "PAID" : "UNPAID";

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(`${item.player1 || "-"} VS ${item.player2 || "-"}`)}</td>
                    <td>${escapeHtml(formatTime(s.start_time))}</td>
                    <td>${escapeHtml(formatTime(s.end_time))}</td>
                    <td>${escapeHtml(formatDuration(s.final_seconds))}</td>
                    <td>${escapeHtml(getRate(s))}</td>
                    <td>Rs ${gameAmount}</td>
                    <td>Rs ${discount}</td>
                    <td>Rs ${canteen}</td>
                    <td>Rs ${total}</td>
                    <td>${escapeHtml(status)}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("PLAYER HISTORY ERROR:", error);

        updatePlayerSummary([]);

        body.innerHTML = `
            <tr>
                <td colspan="11">Error loading player history</td>
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

    ensurePlayerHistoryLayout();

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

console.log("PLAYER HISTORY MODULE LOADED - TABLE HISTORY STYLE");
