import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
let warningAudio = null;
let audioUnlocked = false;


// ======================================================
// 🔥 PENDING DAY CLOSE
// Shift Close ke baad old day ka ID yahan rahega
// jab tak actual Day Close nahi hota.
// ======================================================

window.pendingDayCloseId =
    Number(localStorage.getItem("pendingDayCloseId")) || null;

window.pendingDayCloseStartMs =
    Number(localStorage.getItem("pendingDayCloseStartMs")) || null;

window.pendingShiftCloseMs =
    Number(localStorage.getItem("pendingShiftCloseMs")) || null;


/******************************************************
 * GLOBAL MONEY FORMATTER
 ******************************************************/
function formatMoney(value) {
    return Number(value || 0).toLocaleString();
}

// 🔥 CENTRAL DAY SYSTEM (FIREBASE)
async function initCurrentDay() {

    const q = query(
        collection(window.db, "system"),
        where("branch", "==", BRANCH),
        where("type", "==", "current_day"),
        orderBy("created_at", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {

        const docSnap = snap.docs[0];

        if (docSnap) {
            const d = docSnap.data();
            window.currentDayId = d.day_id;
        }

        // 🔥 SAFE CHECK ANDAR HI
        if (!window.currentDayId) {
            console.error("❌ DAY ID NOT SET - CRITICAL");
        }

    } else {

        const newDayId = Date.now();

        await addDoc(collection(window.db, "system"), {
            type: "current_day",
            branch: BRANCH,
            day_id: newDayId,
            created_at: new Date().toISOString()
        });

        window.currentDayId = newDayId;
    }

    console.log("🔥 CENTRAL DAY:", window.currentDayId);
}


let firebaseExpenses = [];
let firebaseEasy = [];
// 🔥 AUTO REFRESH FUNCTION
async function autoRefreshUI() {
    loadShiftsFromFirebase();
    renderTables();
}

const BRANCH =
(localStorage.getItem("branch") || "rasson1")
.toLowerCase();

console.log("🔥 ACTIVE BRANCH:", BRANCH);const ROLE = localStorage.getItem("role"); // admin / staff
let inventoryItems = [];

// 🔥 HELPER FUNCTIONS (ADD AT TOP)
function getItemName(item) {
    return item.item_name || item.name || "Unknown Item";
}

function getItemStock(item) {
    return item.stock || 0;
}






/******************************************************
 * GLOBAL DATA + LOCALSTORAGE SETUP
 ******************************************************/
let tables = [];

let shift1 = null;

function loadShiftsFromFirebase() {

    const displayDayId =
        window.pendingDayCloseId ||
        window.currentDayId;

    if (!displayDayId) {
        console.warn("⚠️ SHIFT LOAD: day id missing");
        return;
    }

    const q = query(
        collection(window.db, "shifts"),
        where("branch", "==", BRANCH),
        where("day_id", "==", displayDayId)
    );

    onSnapshot(q, (snapshot) => {

        shift1 = null;

        snapshot.forEach(docSnap => {

            const d = docSnap.data();

            if (
                d.shift_number === 1 &&
                !shift1
            ) {

                shift1 = {

                    openTime:
                        d.open_time,

                    closeTime:
                        d.close_time,

                    startMs:
                        Number(d.start_ms) || 0,

                    endMs:
                        Number(d.end_ms) || 0,

                    gameTotal:
                        d.game_total,

                    canteenTotal:
                        d.canteen_total,

                    gameCollection:
                        d.game_collection,

                    canteenCollection:
                        d.canteen_collection,

                    expenses:
                        d.expenses,

                    easypaisa:
                        d.easypaisa || 0,

                    discount:
                        d.discount || 0,

                    closingCash:
                        d.closing_cash,

                    gameBalance:
                        d.game_balance || 0,

                    canteenBalance:
                        d.canteen_balance || 0

                };

            }

        });


        const btn =
            document.getElementById(
                "shiftCloseBtn"
            );

        if (!btn) return;


        // =========================================
        // 🔥 SHIFT CLOSE KE BAAD
        // =========================================

        if (
            window.pendingDayCloseId
        ) {

            btn.innerText =
                "Day Close";

        }

        // =========================================
        // 🔥 NORMAL NEW DAY
        // =========================================

        else if (!shift1) {

            btn.innerText =
                "Shift 1 Close";

        }

        // =========================================
        // 🔥 SHIFT 1 CLOSED
        // =========================================

        else {

            btn.innerText =
                "Day Close";

        }


        console.log(
            "🔥 REALTIME SHIFT:",
            shift1,
            "DISPLAY DAY:",
            displayDayId
        );

    });

}

let editTargetId = null;
let deleteTargetId = null;

/******************************************************
 * PAGE LOAD INITIALIZER
 ******************************************************/

document.addEventListener("DOMContentLoaded", async () => {

    await initCurrentDay();

    // 🔥 HARD CHECK
    if (!window.currentDayId) {
        alert("Day system failed ❌");
        return;
    }

    console.log("✅ DAY READY:", window.currentDayId);

    loadShiftsFromFirebase();
    listenExpensesRealtime();
    listenEasyRealtime();
    listenInventoryRealtime();
    listenTablesRealtime();
    listenRunningSessionsRealtime();
    listenHistoryRealtime();

    bindAddTablePopup();
    bindShiftButtons();
    bindHistoryButtons();

    setTimeout(() => {
        restoreTimers();
    }, 500);

});

  function listenInventoryRealtime() {

    const q = query(
        collection(window.db, "inventory"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, (snapshot) => {

        inventoryItems = [];

        snapshot.forEach(docSnap => {
            inventoryItems.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        console.log("🔥 REALTIME INVENTORY:", inventoryItems);
    });
}

function listenTablesRealtime() {

    const q = query(
        collection(window.db, "tables"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, (snapshot) => {
        

        let newTables = [];

        snapshot.forEach(docSnap => {

    const t = docSnap.data();

    console.log("🔥 FIREBASE DATA:", t); // ✅ ADD KIYA

    newTables.push({
        id: docSnap.id,
        name: t.table_id || "Table 1",

                frameRate: Number(t.frame_rate || 8),
                centuryRate: Number(t.century_rate || 10),

            playType: t.play_type || "frame",

tableType: t.table_type || "table",


selectedPlayType: t.play_type || "frame",

selectedRate:
    t.selected_rate ||
    (t.play_type === "century"
        ? Number(t.century_rate || 10)
        : Number(t.frame_rate || 8)),
                isRunning: false,
                checkinTime: null,
                checkoutTime: null,

                playSeconds: 0,
                liveAmount: 0,

canteenTotal: 0,
canteenItems: {},

// 🔥 PLAYERS
player1Name:
    t.player1_name || "",

player2Name:
    t.player2_name || "",

checkoutPlayer:
    t.checkout_player || "",

checkoutPlayerNumber:
    t.checkout_player_number || null,

history: []
            });
        });

        // 🔥 overwrite tables

    tables = newTables.map(nt => {

    let old = tables.find(o => String(o.id) === String(nt.id));

    return {
        ...nt,

        isRunning: old?.isRunning || false,
        afterCheckout: old?.afterCheckout || false,

        checkinTime: old?.checkinTime || null,
        checkoutTime: old?.checkoutTime || null,

        playSeconds: old?.playSeconds || 0,
        liveAmount: old?.liveAmount || 0,

        finalAmount: old?.finalAmount || 0,
        finalSeconds: old?.finalSeconds || 0,

        discount: old?.discount || 0,

canteenTotal: old?.canteenTotal || 0,
canteenItems: old?.canteenItems || {},

// 🔥 PLAYERS PRESERVE - FIREBASE VALUE MUST WIN
player1Name:
    nt.player1Name ||
    old?.player1Name ||
    "",

player2Name:
    nt.player2Name ||
    old?.player2Name ||
    "",

checkoutPlayer:
    nt.checkoutPlayer ||
    old?.checkoutPlayer ||
    "",

checkoutPlayerNumber:
    nt.checkoutPlayerNumber ??
    old?.checkoutPlayerNumber ??
    null,

history: []
    };
});

setTimeout(async () => {

    // 🔥 IMPORTANT
    if (!tables || tables.length === 0) {
        console.log("⛔ Tables not ready yet");
        return;
    }

    console.log("✅ TABLES READY:", tables.length);

    await rebuildHistoryFromSessions();

    // 🔥 DEBUG
    console.log(
        "✅ HISTORY COUNTS:",
        tables.map(t => ({
            table: t.name,
            history: t.history.length
        }))
    );

    renderTables();

}, 800);
});
}


// inventory load function
async function loadInventory() {

    const q = query(
        collection(window.db, "inventory"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    inventoryItems = [];

    snap.forEach(docSnap => {
        inventoryItems.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    console.log("🔥 INVENTORY LOADED:", inventoryItems);
}

/// Expenses from firebase

function listenExpensesRealtime() {

const q = query(
    collection(window.db, "expenses"),
    where("branch", "==", BRANCH)
);

    onSnapshot(q, (snapshot) => {

        firebaseExpenses = [];

        snapshot.forEach(doc => {
            firebaseExpenses.push(doc.data());
        });

        console.log("🔥 FIREBASE EXPENSES:", firebaseExpenses);
      // 🔥 AUTO REFRESH DAY HISTORY
refreshCurrentDayHistory();
    });
}

/// easypaisa from firebase

function listenEasyRealtime() {

const q = query(
    collection(window.db, "easypaisa"),
    where("branch", "==", BRANCH)
);

    onSnapshot(q, (snapshot) => {

        firebaseEasy = [];

        snapshot.forEach(doc => {
            firebaseEasy.push(doc.data());
        });

        console.log("🔥 FIREBASE EASYPAISA:", firebaseEasy);
      // 🔥 AUTO REFRESH DAY HISTORY
refreshCurrentDayHistory();
    });
}

/******************************************************
 * ADD TABLE POPUP BINDING (FIX)
 ******************************************************/
function bindAddTablePopup() {

    const addBtn = document.getElementById("addTableBtn");

if (ROLE !== "admin" && ROLE !== "superadmin") {
    addBtn.disabled = true;
    addBtn.style.opacity = "0.4";
    addBtn.style.cursor = "not-allowed";
} else {
    addBtn.onclick = () => {
        document.getElementById("addTablePopup").classList.remove("hidden");
    };
}

    document.getElementById("cancelAddBtn").onclick = () => {
        document.getElementById("addTablePopup").classList.add("hidden");
    };

    const tableTypeInput =
document.getElementById("tableTypeInput");

if (tableTypeInput) {

    tableTypeInput.addEventListener(
        "change",
        () => {

            const type =
            tableTypeInput.value;

            const frameInput =
            document.getElementById(
                "frameRateInput"
            );

if (type === "table") {

    frameInput.value = 100;
}

else if (type === "room") {

    frameInput.value = 10;
}

        }
    );
}


// 🔥 CREATE TABLE (INSIDE FUNCTION)
document.getElementById("createTableBtn").onclick = async () => {

    console.log("ADD TABLE CLICKED");

    try {

        let name = document.getElementById("tableNameInput").value.trim();
        let frame = document.getElementById("frameRateInput").value;
        let cen = document.getElementById("centuryRateInput").value;

        console.log("TABLE NAME:", name);
        console.log("FRAME:", frame);
        console.log("CENTURY:", cen);
        console.log("BRANCH:", BRANCH);

        if (!name) {
            alert("Enter table name");
            return;
        }

        console.log("SAVING TO FIREBASE...");

try {

    const tableData = {
    table_id: name,

    table_type:
    document.getElementById("tableTypeInput").value,

    frame_rate: Number(frame) || 8,

    century_rate: Number(cen) || 10,

    branch: BRANCH,
        created_at: new Date().toISOString()
    };

    console.log("🔥 SENDING DATA:", tableData);

    const result = await addDoc(
        collection(window.db, "tables"),
        tableData
    );

    console.log("✅ FIREBASE SAVE SUCCESS");
    console.log("✅ DOC ID:", result.id);

    alert("Table saved successfully ✅");

} catch (firebaseError) {

    console.error("❌ FIREBASE FULL ERROR:", firebaseError);

    alert(
        firebaseError.message ||
        "Firebase save failed ❌"
    );
}

    } catch (err) {

        console.error("ADD TABLE ERROR:", err);
        alert(err.message);

    }
};
}

/******************************************************
 * CREATE DEFAULT TABLES (FIRST TIME ONLY)
 ******************************************************/
function loadDefaultTables() {

    let names = ["Table 1", "Table 2", "Table 3", "Table 4", "Table 5", "Table 6"];

    names.forEach(name => {
tables.push({
    id: Date.now() + Math.random(),
    name,
    frameRate: 7,
    centuryRate: 10,
    selectedRate: 7,

    isRunning: false,
    checkinTime: null,
    checkoutTime: null,
    playSeconds: 0,
    liveAmount: 0,
    canteenTotal: 0,

canteenItems: {}, // ✅ FIX

// 🔥 PLAYERS
player1Name: "",
player2Name: "",
checkoutPlayer: "",
checkoutPlayerNumber: null,

history: []
});
    });

     
}

/******************************************************
 * RENDER ALL TABLE CARDS
 ******************************************************/
function renderTables() {
    const box = document.getElementById("tablesContainer");
    box.innerHTML = "";

    // 🔥 SORT TABLES + ROOMS PROPER ORDER
const sortedTables = [...tables].sort((a, b) => {

    const getType = (name) => {
        if (name.toLowerCase().startsWith("table")) return 1;
if (name.toLowerCase().startsWith("room")) return 2;
        return 3;
    };

    const typeA = getType(a.name);
    const typeB = getType(b.name);

    // 🔹 pehle Table → phir Room
    if (typeA !== typeB) return typeA - typeB;

    // 🔹 number sort (Table 1, Table 2...)
const numA =
Number(((a.name || "").match(/\d+/) || [0])[0]);

const numB =
Number(((b.name || "").match(/\d+/) || [0])[0]);

    return numA - numB;
});


// 🔥 AB LOOP CHANGE KARO
sortedTables.forEach(t => {

        const div = document.createElement("div");
        div.classList.add("table-box");
div.setAttribute("data-table-id", t.id);

        div.innerHTML = `
<div class="table-title">

${t.name}

<div
id="warning-${t.id}"
class="table-warning hidden"
>
<span id="warning-text-${t.id}">
⚠️ GRACE TIME
</span>
</div>

<div class="room-badge">
${t.tableType === "room" ? "ROOM" : ""}
</div>

</div>

<div class="rate-selector">

<select onchange="handleRateChange('${t.id}', this)">

${t.tableType !== "room" ? `

<option value="frame-100"
${(t.selectedPlayType || "frame") === "frame"
&& (t.selectedRate || 100) == 100
? "selected" : ""}>

Frame (Single) - 100 / 30Min

</option>

<option value="frame-200"
${(t.selectedPlayType || "frame") === "frame"
&& (t.selectedRate || 100) == 200
? "selected" : ""}>

Frame (Double) - 200 / 30Min

</option>

<option value="century-8"
${(t.selectedPlayType || "frame") === "century"
? "selected" : ""}>

Century - 8 / Min

</option>

`

:

`

<option value="frame-14"
${(t.selectedPlayType || "frame") === "frame"
&& (t.selectedRate || 10) == 10
? "selected" : ""}>

Frame - 14 / Min

</option>

<option value="century-14"
${(t.selectedPlayType || "frame") === "century"
&& (t.selectedRate || 10) == 10
? "selected" : ""}>

Century - 14 / Min

</option>

`

}

</select>

</div>


<div class="players-section">

    <div class="players-display">

        <span>
            👤 ${t.player1Name || "Player 1"}
        </span>

        <b>VS</b>

        <span>
            👤 ${t.player2Name || "Player 2"}
        </span>

    </div>

    <button
        class="player-btn"
        onclick="openPlayers('${t.id}')"
    >
        👥 PLAYERS
    </button>

</div> 

            <div class="timer-box">
                <div class="timer-line"><span>Check-in:</span><span id="checkin-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Checkout:</span><span id="checkout-${t.id}">--:--:--</span></div>
                <div class="timer-line"><span>Play Time:</span><span id="playtime-${t.id}">00:00:00</span></div>
                <div class="timer-line"><span>Amount:</span><span id="amount-${t.id}">0</span></div>
                <div class="timer-line" style="font-size:12px; color:#0f0;" id="canteen-items-${t.id}"></div>
            </div>

            <div class="table-actions">

                <div class="big-btn-row">
                    <button id="checkinBtn-${t.id}" class="neon-btn big-btn" onclick="checkIn('${t.id}')">CHECK IN</button>
                    <button id="checkoutBtn-${t.id}" class="neon-btn big-btn red hidden" onclick="checkOut('${t.id}')">CHECK OUT</button>
                    <div id="afterRow-${t.id}" class="dual-btn-row hidden">
                        <button class="neon-btn big-btn" onclick="showBill('${t.id}')">VIEW BILL</button>
                        <button class="neon-btn big-btn" onclick="checkIn('${t.id}')">CHECK IN</button>
                    </div>
                </div>

                <div class="second-row">
                    <button id="historyBtn-${t.id}" class="neon-btn small-btn" onclick="openHistory('${t.id}')">HISTORY</button>
                    <button id="editBtn-${t.id}" class="neon-btn small-btn" onclick="editTable('${t.id}')">EDIT</button>
                    <button id="deleteBtn-${t.id}" class="neon-btn small-btn red" onclick="deleteTableOpen('${t.id}')">DELETE</button>

                   <button id="canteenBtn-${t.id}" class="neon-btn small-btn hidden" onclick="openCanteen('${t.id}')">CANTEEN</button>
                    <button id="shiftBtn-${t.id}" class="neon-btn small-btn hidden" onclick="openTableShift('${t.id}')">SHIFT TABLE</button>
                </div>

            </div>
        `;

        box.appendChild(div);

        // 🔥 ROLE CONTROL (IMPORTANT)
if (ROLE !== "admin" && ROLE !== "superadmin") {

    let editBtn = document.getElementById(`editBtn-${t.id}`);
    let delBtn = document.getElementById(`deleteBtn-${t.id}`);

    if (editBtn) {
        editBtn.disabled = true;
        editBtn.style.opacity = "0.4";
        editBtn.style.cursor = "not-allowed";
    }

    if (delBtn) {
        delBtn.disabled = true;
        delBtn.style.opacity = "0.4";
        delBtn.style.cursor = "not-allowed";
    }
}
        // 🔥 AFTER RENDER → APPLY STATE
setTimeout(() => {

    tables.forEach(t => {

        updateDisplay(t.id);

        if (t.afterCheckout) {
            updateButtons(t.id, "afterCheckout");
        }
        else if (t.isRunning) {
            updateButtons(t.id, "running");
        }
        else {
            updateButtons(t.id, "idle");
        }

    });

}, 50);
    });

// ============================================================
// 🔥 FINAL TABLE + ROOM SECTION LAYOUT
// ============================================================

// Existing cards collect karo
const allCards = [...box.querySelectorAll(".table-box")];

box.innerHTML = "";


// ============================================================
// 🎱 TABLES SECTION
// ============================================================

const tablesSection = document.createElement("div");
tablesSection.className = "resource-section";

const tablesHeading = document.createElement("div");
tablesHeading.className = "resource-section-title";
tablesHeading.innerHTML = "🎱 TABLES";

const tablesGrid = document.createElement("div");
tablesGrid.className = "tables-grid section-grid";

tablesSection.appendChild(tablesHeading);
tablesSection.appendChild(tablesGrid);


// ============================================================
// 🚪 ROOMS SECTION
// ============================================================

const roomsSection = document.createElement("div");
roomsSection.className = "resource-section rooms-section";

const roomsHeading = document.createElement("div");
roomsHeading.className = "resource-section-title";
roomsHeading.innerHTML = "🚪 ROOMS";

const roomsGrid = document.createElement("div");
roomsGrid.className = "tables-grid section-grid rooms-grid";

roomsSection.appendChild(roomsHeading);
roomsSection.appendChild(roomsGrid);


// ============================================================
// 🔥 TABLES / ROOMS SEPARATE KARO
// ============================================================

allCards.forEach(card => {

    const id = card.getAttribute("data-table-id");

    const t = tables.find(
        x => String(x.id) === String(id)
    );

    if (!t) return;

    if (t.tableType === "room") {
        roomsGrid.appendChild(card);
    } else {
        tablesGrid.appendChild(card);
    }

});


// ============================================================
// 🔥 FINAL DISPLAY
// ============================================================

if (tablesGrid.children.length > 0) {
    box.appendChild(tablesSection);
}

if (roomsGrid.children.length > 0) {
    box.appendChild(roomsSection);
      }
  
}
/******************************************************
 * CHANGE RATE
 ******************************************************/
async function changeRate(id, rateType, value) {

    let table = tables.find(t => String(t.id) === String(id));
    if (!table) return;

    table.playType = rateType;

    // ✅ ROOM FIX
    if (table.tableType === "room") {

        table.selectedPlayType = rateType;
        table.selectedRate = Number(value);

    } else {

        if (rateType === "century") {
            table.centuryRate = Number(value);
        }

        table.selectedPlayType = rateType;
        table.selectedRate = Number(value);
    }

    updateDisplay(id);

    if (table.isRunning) {
        updateButtons(id, "running");
    }

    // 🔥 FIREBASE SAVE
    await updateDoc(doc(window.db, "tables", id), {

        play_type: table.selectedPlayType,

        selected_rate: table.selectedRate,

        frame_rate: table.frameRate,

        century_rate: table.centuryRate
    });
}
function handleRateChange(id, select) {

    const value = select.value;

    const [type, rate] = value.split("-");

    const table =
    tables.find(t => String(t.id) === String(id));

    if (!table) return;

    // 🔥 SAVE CURRENT SELECTION
    table.selectedPlayType = type;
    table.selectedRate = Number(rate || 0);

    // 🔥 UPDATE UI LIVE
    updateDisplay(id);

    // 🔥 FIREBASE SAVE
    updateDoc(doc(window.db, "tables", id), {

        play_type: type,

        selected_rate: Number(rate || 0),

        frame_rate: table.frameRate,

        century_rate: table.centuryRate

    });

    // OLD FUNCTION
    changeRate(id, type, rate);
}
/******************************************************
 * CHECK-IN FUNCTION
 ******************************************************/
async function checkIn(id) {
    let t = tables.find(x => String(x.id) === String(id));

    if (t.isRunning) return;

// 🔥 ADD THIS LOCK (EXACT YAHAIN)
if (window._creatingSession) {
    console.log("⛔ Session already creating...");
    return;
}
window._creatingSession = true;

    t.isRunning = true;
    t.checkinTime = Date.now();
  // 🔥 FREEZE CURRENT SESSION RATE
const currentSelected =
document.querySelector(
`select[onchange="handleRateChange('${t.id}', this)"]`
);

let selectedValue;

if (t.tableType === "room") {

    selectedValue = currentSelected
    ? currentSelected.value
    : `frame-10`;

}else {

    selectedValue = currentSelected
    ? currentSelected.value
    : `frame-${t.frameRate}`;
}

const [selectedType, selectedRate] =
selectedValue.split("-");

// 🔥 FINAL FREEZE
t.selectedPlayType = selectedType;

t.selectedRate = Number(selectedRate || 0);

  
    

    t.afterCheckout = false;
    // 🔥 AGAR PREVIOUS BILL UNPAID HAI → VIEW BILL HIDE
updateButtons(id, "idle");
    
    

    t.checkoutTime = null;
    t.playSeconds = 0;
    t.liveAmount = 0;

    t.discount = 0;
  
    t.canteenTotal = 0;
    t.canteenItems = {};

    updateButtons(id, "running");
    runTimer(id);
    

// 🔥 STEP 1: check if already running session exists
const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH),
    where("end_time", "==", null),
    where("is_deleted", "==", false)
);

const snap = await getDocs(q);

// 🔥 STEP 2: if exists → DO NOT create new
if (!snap.empty) {
    console.log("⚠️ Session already exists, skipping new check-in");

    // 🔥 FORCE UI FIX
    t.isRunning = true;

    window._creatingSession = false; // 🔥 IMPORTANT
    return;
}

// 🔥 STEP 3: create new session
try {

    await addDoc(collection(window.db, "sessions"), {
    table_id: t.name,
    branch: BRANCH,

    start_time: new Date().toISOString(),
    end_time: null,

play_type: t.selectedPlayType,

selected_rate: t.selectedRate,

frame_rate: t.frameRate,
century_rate: t.centuryRate,
    day_id: window.currentDayId,

    is_deleted: false
});

} catch (err) {
    console.error("❌ Session create error:", err);
} finally {
    // 🔥 LOCK RELEASE (VERY IMPORTANT)
    window._creatingSession = false;
}
}

// ======================================================
// 🔥 EXPOSE TABLE FUNCTIONS TO HTML ONCLICK
// ======================================================
window.checkIn = checkIn;
window.checkOut = checkOut;
window.showBill = showBill;
window.openHistory = openHistory;
window.openPlayers = openPlayers;
window.editTable = editTable;
window.deleteTableOpen = deleteTableOpen;
window.openCanteen = openCanteen;
window.openTableShift = openTableShift;
window.handleRateChange = handleRateChange;


/******************************************************
 * 🔥 SELECT PLAYER AT CHECKOUT
 ******************************************************/
function selectCheckoutPlayer(t) {

    return new Promise(resolve => {

        let popup =
            document.getElementById(
                "checkoutPlayerPopup"
            );

        if (!popup) {

            popup =
                document.createElement("div");

            popup.id =
                "checkoutPlayerPopup";

            popup.style.cssText = `
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.8);
                display:flex;
                align-items:center;
                justify-content:center;
                z-index:100000;
            `;

            popup.innerHTML = `

                <div style="
                    width:380px;
                    max-width:90%;
                    background:#111;
                    border:1px solid #d4af37;
                    border-radius:18px;
                    padding:25px;
                    text-align:center;
                ">

                    <h2 style="
                        color:#d4af37;
                        margin-top:0;
                    ">
                        WHO IS CHECKING OUT?
                    </h2>

                    <div style="
                        display:flex;
                        gap:15px;
                        margin-top:25px;
                    ">

                        <button
                            id="checkoutPlayer1Btn"
                            style="
                                flex:1;
                                padding:20px 10px;
                                border-radius:12px;
                                border:1px solid #d4af37;
                                background:#222;
                                color:white;
                                cursor:pointer;
                                font-size:18px;
                            "
                        >
                            PLAYER 1
                            <br>
                            <b id="checkoutPlayer1Name"></b>
                        </button>

                        <button
                            id="checkoutPlayer2Btn"
                            style="
                                flex:1;
                                padding:20px 10px;
                                border-radius:12px;
                                border:1px solid #d4af37;
                                background:#222;
                                color:white;
                                cursor:pointer;
                                font-size:18px;
                            "
                        >
                            PLAYER 2
                            <br>
                            <b id="checkoutPlayer2Name"></b>
                        </button>

                    </div>

                    <button
                        id="cancelCheckoutPlayerBtn"
                        style="
                            margin-top:20px;
                            width:100%;
                            padding:12px;
                            border:0;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >
                        CANCEL
                    </button>

                </div>
            `;

            document.body.appendChild(popup);
        }

        document.getElementById(
            "checkoutPlayer1Name"
        ).innerText =
            t.player1Name || "Player 1";

        document.getElementById(
            "checkoutPlayer2Name"
        ).innerText =
            t.player2Name || "Player 2";

        popup.style.display =
            "flex";

        document.getElementById(
            "checkoutPlayer1Btn"
        ).onclick = () => {

            popup.style.display =
                "none";

            resolve({
                name:
                    t.player1Name ||
                    "Player 1",

                number: 1
            });
        };

        document.getElementById(
            "checkoutPlayer2Btn"
        ).onclick = () => {

            popup.style.display =
                "none";

            resolve({
                name:
                    t.player2Name ||
                    "Player 2",

                number: 2
            });
        };

        document.getElementById(
            "cancelCheckoutPlayerBtn"
        ).onclick = () => {

            popup.style.display =
                "none";

            resolve(null);
        };

    });
}


/******************************************************
 * CHECK-OUT FUNCTION
 ******************************************************/
async function checkOut(id) {

    let t = tables.find(x => String(x.id) === String(id));


  // 🔥 ASK WHICH PLAYER IS CHECKING OUT
const checkoutPlayer =
    await selectCheckoutPlayer(t);

if (!checkoutPlayer) {
    return;
}

t.checkoutPlayer =
    checkoutPlayer.name;

t.checkoutPlayerNumber =
    checkoutPlayer.number;


// 🔥 FINAL FREEZE (IMPORTANT)
t.afterCheckout = true;
t.isRunning = false; // 🔥 FORCE STOP
t.checkoutTime = Date.now();

t.finalSeconds = t.playSeconds;
t.finalAmount = t.liveAmount;   // ✅ ADD THIS HERE

  // 🔥 DEFAULT DISCOUNT
if (!t.discount) {
    t.discount = 0;
}

  // 🔥 GET CURRENT SELECTED RATE AT CHECKOUT
const currentSelected =
document.querySelector(
`select[onchange="handleRateChange('${t.id}', this)"]`
);

let selectedValue;

if (t.tableType === "room") {

    selectedValue = currentSelected
    ? currentSelected.value
    : `frame-10`;

}else {

    selectedValue = currentSelected
    ? currentSelected.value
    : `frame-${t.frameRate}`;
}

const [selectedType, selectedRate] =
selectedValue.split("-");

// 🔥 FINAL CHECKOUT VALUES
t.selectedPlayType = selectedType;
t.selectedRate = Number(selectedRate || 0);

  
    // 🔥 FIREBASE UPDATE
    const q = query(
        collection(window.db, "sessions"),
        where("table_id", "==", t.name),
        where("branch", "==", BRANCH),
        where("end_time", "==", null)
    );

    const snap = await getDocs(q);

    let latestSession = null;
let latestTime = 0;

snap.forEach(d => {
    const data = d.data();

    let time = new Date(data.start_time).getTime();

    if (time > latestTime) {
        latestTime = time;
        latestSession = d;
    }
});

if (latestSession) {
   await updateDoc(doc(window.db, "sessions", latestSession.id), {
    end_time: new Date().toISOString(),


     // 🔥 PLAYER DATA
player1_name:
    t.player1Name || "",

player2_name:
    t.player2Name || "",

checkout_player:
    t.checkoutPlayer || "",

checkout_player_number:
    t.checkoutPlayerNumber || null,
     

original_game_amount: t.finalAmount,

discount: t.discount || 0,

final_game_amount:
    t.finalAmount - (t.discount || 0),

final_amount:
    t.finalAmount - (t.discount || 0),

final_seconds: t.finalSeconds,

canteen_total: t.canteenTotal,
     selected_rate: t.selectedRate || 0,
selected_play_type: t.selectedPlayType || t.playType,

    canteen_items: t.canteenItems, // 🔥 ADD THIS

    paid: false,
    day_id: window.currentDayId
});
}

    // 🔥 HISTORY SAVE (CORRECT PLACE)
    if (!t.history) t.history = [];

    updateButtons(id, "afterCheckout");
    updateDisplay(id);
}


/******************************************************
 * 🔥 PLAYER NAMES POPUP
 ******************************************************/
async function openPlayers(id) {

    const t =
        tables.find(
            x => String(x.id) === String(id)
        );

    if (!t) return;

    // 🔥 CREATE POPUP IF NOT EXISTS
    let popup =
        document.getElementById(
            "playersPopup"
        );

    if (!popup) {

        popup =
            document.createElement("div");

        popup.id =
            "playersPopup";

        popup.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.75);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:99999;
        `;

        popup.innerHTML = `

            <div style="
                width:360px;
                max-width:90%;
                background:#111;
                border:1px solid #d4af37;
                border-radius:15px;
                padding:25px;
                box-shadow:0 0 30px rgba(212,175,55,.4);
            ">

                <h2 style="
                    text-align:center;
                    color:#d4af37;
                    margin-top:0;
                ">
                    👥 PLAYERS
                </h2>

                <label style="
                    display:block;
                    color:#fff;
                    margin-bottom:6px;
                ">
                    PLAYER 1
                </label>

<div style="
    display:flex;
    gap:8px;
    margin-bottom:18px;
">

    <input
        id="player1Input"
        type="text"
        placeholder="Player 1 name"
        style="
            flex:1;
            min-width:0;
            box-sizing:border-box;
            padding:12px;
            border-radius:8px;
            border:1px solid #555;
        "
    >

    <button
        type="button"
        id="player1VoiceBtn"
        title="Speak Player 1 name"
        style="
            width:52px;
            border:0;
            border-radius:8px;
            background:#00ffcc;
            color:#000;
            font-size:22px;
            cursor:pointer;
            font-weight:bold;
        "
    >
        🎤
    </button>

</div>

                <label style="
                    display:block;
                    color:#fff;
                    margin-bottom:6px;
                ">
                    PLAYER 2
                </label>

<div style="
    display:flex;
    gap:8px;
    margin-bottom:20px;
">

    <input
        id="player2Input"
        type="text"
        placeholder="Player 2 name"
        style="
            flex:1;
            min-width:0;
            box-sizing:border-box;
            padding:12px;
            border-radius:8px;
            border:1px solid #555;
        "
    >

    <button
        type="button"
        id="player2VoiceBtn"
        title="Speak Player 2 name"
        style="
            width:52px;
            border:0;
            border-radius:8px;
            background:#00ffcc;
            color:#000;
            font-size:22px;
            cursor:pointer;
            font-weight:bold;
        "
    >
        🎤
    </button>

</div>

                <div style="
                    display:flex;
                    gap:10px;
                ">

                    <button
                        id="cancelPlayersBtn"
                        style="
                            flex:1;
                            padding:12px;
                            border:0;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >
                        CANCEL
                    </button>

                    <button
                        id="savePlayersBtn"
                        style="
                            flex:1;
                            padding:12px;
                            border:0;
                            border-radius:8px;
                            background:#d4af37;
                            cursor:pointer;
                            font-weight:bold;
                        "
                    >
                        SAVE
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(popup);

      // 🎤 ACTIVATE VOICE AFTER PLAYER POPUP IS CREATED
setupPlayerVoiceInput(
    "player1Input",
    "player1VoiceBtn"
);

setupPlayerVoiceInput(
    "player2Input",
    "player2VoiceBtn"
);
    }

    // 🔥 LOAD CURRENT NAMES
    document.getElementById(
        "player1Input"
    ).value =
        t.player1Name || "";

    document.getElementById(
        "player2Input"
    ).value =
        t.player2Name || "";

    popup.style.display =
        "flex";

    // 🔥 CANCEL
    document.getElementById(
        "cancelPlayersBtn"
    ).onclick = () => {

        popup.style.display =
            "none";
    };

    // 🔥 SAVE
    document.getElementById(
        "savePlayersBtn"
    ).onclick = async () => {

        const player1 =
            document.getElementById(
                "player1Input"
            ).value.trim();

        const player2 =
            document.getElementById(
                "player2Input"
            ).value.trim();

        t.player1Name =
            player1;

        t.player2Name =
            player2;

        try {

            await updateDoc(
                doc(
                    window.db,
                    "tables",
                    String(t.id)
                ),
                {
                    player1_name:
                        player1,

                    player2_name:
                        player2
                }
            );

            popup.style.display =
                "none";

            renderTables();

            console.log(
                "✅ PLAYERS SAVED:",
                t.name,
                player1,
                player2
            );

        } catch (error) {

            console.error(
                "❌ PLAYER SAVE ERROR:",
                error
            );

            alert(
                "Players save failed ❌"
            );
        }
    };
}


// ==========================================
// 🎤 PLAYER NAME VOICE INPUT
// Typing + Voice dono supported
// ==========================================

function setupPlayerVoiceInput(inputId, buttonId) {

    const input =
        document.getElementById(inputId);

    const button =
        document.getElementById(buttonId);

    if (!input || !button) {
        console.warn(
            "🎤 Voice elements not found:",
            inputId,
            buttonId
        );
        return;
    }

    // Browser support check
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        button.onclick = () => {

            alert(
                "Voice input is not supported in this browser. Please use Google Chrome."
            );

        };

        return;
    }

    const recognition =
        new SpeechRecognition();

    // English + Urdu support
    recognition.lang = "en-PK";

    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let listening = false;

    button.onclick = () => {

        if (listening) {
            recognition.stop();
            return;
        }

        try {

            // Input ko focus karo
            input.focus();

            // Naya naam purane naam ko replace karega
            input.select();

            recognition.start();

        } catch (error) {

            console.log(
                "🎤 Voice start error:",
                error
            );

        }
    };

    recognition.onstart = () => {

        listening = true;

        button.innerText = "🔴";

        button.style.background =
            "#ff4444";

        button.style.color =
            "#fff";

        input.placeholder =
            "Listening... speak player name";
    };

    recognition.onresult = (event) => {

        const result =
            event.results[0][0].transcript;

        if (result) {

            input.value =
                result.trim();

            // Cursor end par
            input.focus();

            input.setSelectionRange(
                input.value.length,
                input.value.length
            );
        }
    };

    recognition.onerror = (event) => {

        console.log(
            "🎤 Voice recognition error:",
            event.error
        );

        if (
            event.error === "not-allowed"
        ) {

            alert(
                "Microphone permission denied. Please allow microphone access."
            );

        } else if (
            event.error === "no-speech"
        ) {

            console.log(
                "🎤 No speech detected"
            );

        } else {

            console.log(
                "🎤 Voice error:",
                event.error
            );
        }
    };

    recognition.onend = () => {

        listening = false;

        button.innerText = "🎤";

        button.style.background =
            "#00ffcc";

        button.style.color =
            "#000";

        input.placeholder =
            inputId === "player1Input"
                ? "Player 1 name"
                : "Player 2 name";
    };
}


// ==========================================
// 🎤 ACTIVATE BOTH PLAYER MIC BUTTONS
// ==========================================




/******************************************************
 * 🔔 TABLE 15-MINUTE MINI VOICE ALARM
 * Only for TABLES — Rooms are ignored
 ******************************************************/
function playTable15MinuteAlarm(t) {

    if (!t || t.tableType === "room") return;
    if (!t.isRunning || t.afterCheckout) return;

    const totalMinutes = Math.floor(t.playSeconds / 60);

    if (totalMinutes <= 0) return;

    // 🔔 Only every 15 minutes
    if (totalMinutes % 15 !== 0) return;

    // 🔒 Prevent the same 15-minute alarm from repeating
    const alarmKey =
        `table15Alarm_${t.name}_${t.checkinTime}_${totalMinutes}`;

    if (localStorage.getItem(alarmKey) === "played") {
        return;
    }

    // 🔔 SCREEN ALERT — jis table ka alarm hai usi par show hoga
    showTable15MinuteAlert(t);
    
    // 🔊 Voice
    playTableVoice(
        `Attention! ${t.name}. ${totalMinutes} minutes.`
    );
    // 🔒 Save locally so refresh does not repeat the same alarm
    localStorage.setItem(alarmKey, "played");

    console.log(
        `🔔 15-MINUTE ALARM: ${t.name} - ${totalMinutes} minutes`
    );
}




/******************************************************
 * TIMER — (1 SEC = 1 MIN CHARGE FIX)
 ******************************************************/
function runTimer(id) {

    let t =
    tables.find(x => String(x.id) === String(id));

    if (!t || !t.isRunning || t.afterCheckout)
        return;

    t.playSeconds =
    Math.floor(
        (Date.now() - t.checkinTime) / 1000
    );

  // 🔔 15-MINUTE MINI ALARM
// Existing table/room alarm logic ko touch nahi karta
if (t.tableType !== "room") {
    playTable15MinuteAlarm(t);
}

    const tableBox =
    document.querySelector(
        `button[onclick="checkIn('${t.id}')"]`
    )?.closest(".table-box");

/* =====================================
   ROOM SYSTEM
===================================== */

if (t.tableType === "room") {

    let minutes =
        Math.ceil(t.playSeconds / 60);

    // 🔥 ROOM BILLING
    // First 30 minutes = Rs.400 fixed
    // After 30 minutes = Rs.13.33 per minute
    // Final amount rounded to nearest Rs.10

    if (minutes <= 30) {

        t.liveAmount = 400;

    } else {

        const rawAmount =
            400 + ((minutes - 30) * 13.33);

        t.liveAmount =
            Math.round(rawAmount / 10) * 10;
    }


    // 🔥 ROOM ALARM SYSTEM

    const roomAlertStart = 58 * 60;
    const roomAlertEnd   = 60 * 60;

    if (
        t.playSeconds >= roomAlertStart &&
        t.playSeconds < roomAlertEnd
    ) {

        showTableWarning(t.id);

        if (tableBox) {
            tableBox.classList.add("frame-complete");
        }

        // 🔥 every 30 sec alert
        if (t.playSeconds % 30 === 0) {

            const oldGif =
                tableBox?.querySelector(".alert-gif");

            if (oldGif) {
                oldGif.remove();
            }

            playWarningBeep();

            const gif =
                document.createElement("img");

            gif.src = "/assets/alert.gif";

            gif.className = "alert-gif";

            tableBox?.appendChild(gif);

            setTimeout(() => {
                gif.remove();
            }, 1500);
        }

        // 🔥 voice only once
        if (!t.roomVoicePlayed) {

            playTableVoice(
                `${t.name} room time alert`
            );

            t.roomVoicePlayed = true;
        }

    } else {

        hideTableWarning(t.id);

        if (tableBox) {
            tableBox.classList.remove("frame-complete");
        }

        t.roomVoicePlayed = false;
    }

}



else {

    /* =====================================
       SINGLE / DOUBLE FRAME SYSTEM
    ===================================== */


    // 🔥 CENTURY SYSTEM
    if (t.selectedPlayType === "century") {

        let playedMinutes =
        Math.ceil(t.playSeconds / 60);

        if (playedMinutes < 1) {
            playedMinutes = 1;
        }

        t.liveAmount =
        playedMinutes * (t.selectedRate || 10);
    }

    // 🔥 FRAME SYSTEM
    else {

// 🔥 FRAME SYSTEM (20 MIN PLAY + 10 MIN GRACE)

let playedMinutes =
Math.floor(t.playSeconds / 60);

let frameRate =
t.selectedRate || 100;

// 🔥 1 FRAME = 30 MIN TOTAL
// 20 MIN PLAY
// 10 MIN GRACE

let cycleMinutes = 30;

// 🔥 FRAME COUNT
let frameCount =
Math.floor(playedMinutes / cycleMinutes) + 1;

t.liveAmount =
frameCount * frameRate;

// 🔥 CURRENT CYCLE
let currentCycleMinute =
playedMinutes % cycleMinutes;

// 🔥 GRACE STARTS AFTER 20 MINUTES
let inGraceTime =
currentCycleMinute >= 20;


// 🔥 WARNING SYSTEM
if (inGraceTime) {

    // 🔥 RED BORDER
    if (tableBox) {

        tableBox.classList
        .add("frame-complete");
    }

    // 🔥 WARNING TEXT
    showTableWarning(t.id);
    // 🔥 ALERT GIF SHOW
const tableCard = document.querySelector(
`[data-table-id="${t.id}"]`
);

if (
    tableCard &&
    t.playSeconds > 0 &&
    t.playSeconds % 30 === 0
) {

    const oldGif =
    tableBox.querySelector(".alert-gif");

    if (oldGif) {
        oldGif.remove();
    }

    tableBox.classList.add("crack");

    playWarningBeep();

    const gif =
    document.createElement("img");

    gif.src = "/assets/alert.gif";

    gif.className = "alert-gif";

    tableBox.appendChild(gif);

    setTimeout(() => {

        gif.remove();

        tableBox.classList.remove("crack");

    }, 1500);
}
  
    // 🔥 VOICE ONLY ONCE
    if (!t.voicePlayed) {

        playTableVoice(
            `${t.name} grace time started`
        );

        t.voicePlayed = true;
    }

    // 🔥 FIRE ALARM EVERY 5 SEC


}else {

    // 🔥 REMOVE WARNING
    if (tableBox) {

        tableBox.classList
        .remove("frame-complete");
    }

    hideTableWarning(t.id);
    // 🔥 REMOVE ALERT GIF
const tableCard = document.querySelector(
`[data-table-id="${t.id}"]`
);

if (tableCard) {

    const existingGif =
    tableCard.querySelector(
        ".alert-gif"
    );

    if (existingGif) {

        existingGif.remove();
    }
}

    t.voicePlayed = false;
}
    }
}

    updateDisplay(id);

    setTimeout(() => runTimer(id), 1000);
}

/******************************************************
 * UPDATE DISPLAY
 ******************************************************/
function updateDisplay(id) {

    let t = tables.find(x => String(x.id) === String(id));
    if (!t) return;

    // 🔥 SAFE ELEMENT GET
    let checkinEl = document.getElementById(`checkin-${id}`);
    let checkoutEl = document.getElementById(`checkout-${id}`);
    let playtimeEl = document.getElementById(`playtime-${id}`);
    let amountEl = document.getElementById(`amount-${id}`);
    let canteenEl = document.getElementById(`canteen-items-${id}`);

    // ❌ AGAR DOM READY NA HO → SKIP
    if (!checkinEl || !checkoutEl || !playtimeEl || !amountEl) return;

    checkinEl.innerText = t.checkinTime ? formatTime(t.checkinTime) : "--:--:--";
    checkoutEl.innerText = t.checkoutTime ? formatTime(t.checkoutTime) : "--:--:--";

    playtimeEl.innerText =
        formatSeconds(t.afterCheckout ? t.finalSeconds : t.playSeconds);

let finalGame = t.afterCheckout
? (
    (t.finalAmount || 0)
    -
    (t.discount || 0)
)
: (t.liveAmount || 0);

let amount =
finalGame + (t.canteenTotal || 0);

    amountEl.innerText = amount;

    let itemsHTML = "";
    Object.values(t.canteenItems).forEach(item => {
        itemsHTML += `${item.name} x${item.qty}<br>`;
    });

    if (canteenEl) canteenEl.innerHTML = itemsHTML;
}

/******************************************************
 * FORMAT HELPERS
 ******************************************************/
function formatTime(ms){
    return new Date(ms).toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi',   // ✅ Pakistan time force
        hour: '2-digit',
        minute: '2-digit',
        hour12: true               // ✅ AM/PM
    });
}
function pad(n){ return n<10 ? "0"+n : n; }
function formatSeconds(sec){
    let h = Math.floor(sec/3600);
    let m = Math.floor((sec%3600)/60);
    let s = sec%60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// 🔥 SMART ROUNDING SYSTEM
function smartRoundAmount(amount) {

    let lastDigit = amount % 10;

    // 1 → 5 = DOWN
    if (lastDigit >= 1 && lastDigit <= 5) {
        return amount - lastDigit;
    }

    // 6 → 9 = UP
    if (lastDigit >= 6 && lastDigit <= 9) {
        return amount + (10 - lastDigit);
    }

    return amount;
}

/******************************************************
 * BUTTON STATUS LOGIC (FULL FIX)
 ******************************************************/
function updateButtons(id, mode) {

    let checkInBtn = document.getElementById(`checkinBtn-${id}`);
    let checkOutBtn = document.getElementById(`checkoutBtn-${id}`);
    let afterRow = document.getElementById(`afterRow-${id}`);

    let histBtn = document.getElementById(`historyBtn-${id}`);
    let editBtn = document.getElementById(`editBtn-${id}`);
    let delBtn = document.getElementById(`deleteBtn-${id}`);

    let canteenBtn = document.getElementById(`canteenBtn-${id}`);
    let shiftBtn = document.getElementById(`shiftBtn-${id}`);

    let t = tables.find(x => String(x.id) === String(id));
    let last = t.history[t.history.length - 1];

    // 🔥 RUNNING MODE
    if (mode === "running") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.remove("hidden");
        afterRow.classList.add("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.add("hidden");
        delBtn.classList.add("hidden");

        canteenBtn.classList.remove("hidden");
        shiftBtn.classList.remove("hidden");

        return;
    }

    // 🔥 AFTER CHECKOUT MODE
    if (mode === "afterCheckout") {

        checkInBtn.classList.add("hidden");
        checkOutBtn.classList.add("hidden");

        histBtn.classList.remove("hidden");
        editBtn.classList.remove("hidden");
        delBtn.classList.remove("hidden");

        canteenBtn.classList.add("hidden");
        shiftBtn.classList.add("hidden");

        // 🔥 LOGIC
        if (last && !last.paid) {
            afterRow.classList.remove("hidden"); // VIEW BILL SHOW
        } else {
            afterRow.classList.add("hidden");
            checkInBtn.classList.remove("hidden"); // CHECKIN SHOW
        }

        return;
    }

    // 🔥 IDLE MODE
    checkInBtn.classList.remove("hidden");
    checkOutBtn.classList.add("hidden");
    afterRow.classList.add("hidden");

    histBtn.classList.remove("hidden");
    editBtn.classList.remove("hidden");
    delBtn.classList.remove("hidden");

    canteenBtn.classList.add("hidden");
    shiftBtn.classList.add("hidden");
}
/******************************************************
 * BILL POPUP — SHOW BILL FOR A TABLE
 ******************************************************/
async function showBill(id) {

    let t = tables.find(x => String(x.id) === String(id));

    let academy = localStorage.getItem("academyName") || "Rasson Snooker Academy";
    let branch = BRANCH || "Rasson1";

    let checkin = t.checkinTime ? formatTime(t.checkinTime) : "--";
    let checkout = t.checkoutTime ? formatTime(t.checkoutTime) : "--";
    let playtime = formatSeconds(t.finalSeconds || t.playSeconds);

    let bill = document.getElementById("billDetails");

  const player1 =
    t.player1Name ||
    t.player1 ||
    "Player 1";

const player2 =
    t.player2Name ||
    t.player2 ||
    "Player 2";

    let canteenDetails = "";
    let canteenTotal = 0;

    Object.values(t.canteenItems || {}).forEach(item => {
        let total = item.qty * item.price;
        canteenTotal += total;

        canteenDetails += `<p>${item.name} x${item.qty}</p>`;
    });

    if (!canteenDetails) canteenDetails = `<p>No items</p>`;

    let originalAmount =
t.finalAmount || t.liveAmount;

let discount =
t.discount || 0;

let gameAmount =
originalAmount - discount;

    bill.innerHTML = `
<div style="width:300px; margin:auto; font-family:monospace; color:#000; background:#fff; padding:15px; border-radius:10px;">
<div style="text-align:center; margin:8px 0; font-weight:bold;">
    ${player1 || "Player 1"} VS ${player2 || "Player 2"}
</div>

<hr>

    <center>
    <img src="../assets/bill-logo.png" style="width:120px; margin-bottom:5px;">
    <h3 style="margin:0;">${academy}</h3>
    <small>${branch}</small>
</center>

    <hr>

    <p><b>Table:</b> ${t.name}</p>
    <p>
    <b>Players:</b>

    <span style="
        ${
            Number(t.checkoutPlayerNumber) === 1
            ? "background:#d4af37;color:#000;padding:3px 6px;border-radius:5px;font-weight:bold;"
            : ""
        }
    ">
        ${
            Number(t.checkoutPlayerNumber) === 1
            ? "⭐ "
            : ""
        }
        ${t.player1Name || "Player 1"}
    </span>

    <b> VS </b>

    <span style="
        ${
            Number(t.checkoutPlayerNumber) === 2
            ? "background:#d4af37;color:#000;padding:3px 6px;border-radius:5px;font-weight:bold;"
            : ""
        }
    ">
        ${
            Number(t.checkoutPlayerNumber) === 2
            ? "⭐ "
            : ""
        }
        ${t.player2Name || "Player 2"}
    </span>
</p>
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Checkout:</b> ${checkout}</p>
    <p><b>Play Time:</b> ${playtime}</p>
    <p><b>Play Type:</b> ${t.selectedPlayType || t.playType}</p>

<p><b>Rate:</b> Rs ${t.selectedRate || 0}</p>

    <hr>

<p><b>Game Charges</b></p>

<p>Original: Rs ${originalAmount}</p>

<p>Discount: Rs ${discount}</p>

<p>Final: Rs ${gameAmount}</p>

    <hr>

    <p><b>Canteen</b></p>
    ${Object.values(t.canteenItems || {}).map(item => `
        <div style="display:flex; justify-content:space-between;">
            <span>${item.name} x${item.qty}</span>
            <span>${item.qty * item.price}</span>
        </div>
    `).join("") || "<p>No items</p>"}

    <hr>

    <div style="display:flex; justify-content:space-between;">
        <b>Total</b>
        <b>Rs ${gameAmount + canteenTotal}</b>
    </div>

    <hr>

    <hr>

<center>
    <img src="../assets/QR-bill.png" style="width:100px;">
    <br>
    <small>Scan & Pay</small>
</center>

</div>
`;

    document.getElementById("billPopup").classList.remove("hidden");

    document.getElementById("paidBtn").onclick = () => completePayment(id);

  document.getElementById("applyDiscountBtn").onclick =
() => applyDiscount(id);
  
    document.getElementById("cancelBillBtn").onclick =
        () => document.getElementById("billPopup").classList.add("hidden");
}


function applyDiscount(tableId) {

    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;

    let input = document.getElementById("discountInput");

    let discount = Number(input.value || 0);

    let original =
        t.finalAmount || t.liveAmount || 0;

    // ❌ negative block
    if (discount < 0) {
        discount = 0;
    }

    // ❌ over-discount block
    if (discount > original) {
        alert("Discount too high ❌");
        return;
    }

    // ✅ SAVE
    t.discount = discount;

    // ✅ LIVE BILL REFRESH
    showBill(tableId);

  // 🔥 LIVE HISTORY UPDATE
if (t.history && t.history.length > 0) {

    let last = t.history[t.history.length - 1];

    last.discount = discount;

    last.originalAmount = original;

    last.amount = original - discount;

    last.total =
        (original - discount)
        + (last.canteenAmount || 0);
}

// 🔥 RESET INPUT
input.value = 0;
  
    // ✅ VISUAL MESSAGE
    alert("Discount Applied ✅");
}



async function completePayment(id) {

    let t = tables.find(x => String(x.id) === String(id));
    if (!t || !t.history.length) return;

    let last = t.history[t.history.length - 1];

    last.paid = true;
  last.paidTime = Date.now();

// 🔥 FIREBASE UPDATE (MAIN FIX)
// 🔥 GET ONLY LAST CLOSED SESSION
const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH),
    where("is_deleted", "==", false)
);

// 🔥 ONLY LAST SESSION KO PAID KARO
const snap = await getDocs(q);

let latestSession = null;
let latestTime = 0;

snap.forEach(d => {
    const data = d.data();
   if (!data.end_time) return;

    let time = new Date(data.end_time).getTime();

    if (time > latestTime) {
        latestTime = time;
        latestSession = { id: d.id, ...data };
    }
});

if (latestSession) {
await updateDoc(doc(window.db, "sessions", latestSession.id), {
    paid: true,
    paid_time: new Date().toISOString(),

    // 🔥 IMPORTANT
    discount: t.discount || 0,

    original_game_amount:
        t.finalAmount || 0,

    final_game_amount:
        (t.finalAmount || 0)
        - (t.discount || 0),

    final_amount:
        (t.finalAmount || 0)
        - (t.discount || 0)
});
}

     

    document.getElementById("billPopup").classList.add("hidden");

    // 🔥 UI UPDATE (IMPORTANT)
    updateButtons(id, "afterCheckout");

    printThermalBill(id, last);
  
}




/******************************************************
 * CANTEEN POPUP — FOOD ITEMS
 ******************************************************/
async function openCanteen(id) {

    let t = tables.find(x => String(x.id) === String(id));

    if (!t) return;

let list = document.getElementById("canteenList");
list.innerHTML = "";

inventoryItems.forEach(item => {

    list.innerHTML += `
        <div style="margin-bottom:10px;">
            <b>${getItemName(item)}</b> - Rs ${item.selling_price || item.price || 0}
            <br>
            <small style="color:${getItemStock(item) <= 5 ? 'red' : 'lime'}">
                Stock: ${getItemStock(item)}
                ${getItemStock(item) <= 5 ? '⚠️ LOW' : ''}
            </small>
            <button 
                ${getItemStock(item) <= 0 ? 'disabled style="opacity:0.3"' : ''}
                onclick="addItem('${id}', '${item.id}', ${item.selling_price || item.price || 0}, '${getItemName(item)}')">
                ➕
            </button>
            <button onclick="removeItem('${id}', '${item.id}', ${item.selling_price || item.price || 0}, '${getItemName(item)}')">➖</button>
        </div>
    `;
});

    document.getElementById("canteenPopup").classList.remove("hidden");

    document.getElementById("closeCanteenBtn").onclick =
        () => document.getElementById("canteenPopup").classList.add("hidden");
}

async function addItem(tableId, itemId, price, name) {

    let t = tables.find(x => String(x.id) === String(tableId));
    if (!t) return;

    if (t.afterCheckout) return alert("Bill already closed");

    // 🔥 GET ITEM FROM FIREBASE MEMORY
    const item = inventoryItems.find(i => i.id === itemId);

    // 🔥 STOCK CHECK
    if (!item || getItemStock(item) <= 0) {
        alert("Out of stock ❌");
        return;
    }

    if (!t.canteenItems[itemId]) {
        t.canteenItems[itemId] = { 
    name: getItemName(item), 
    qty: 0, 
    price 
};
    }

    t.canteenItems[itemId].qty += 1;
    t.canteenTotal += price;

    // 🔥 STOCK MINUS
    await updateDoc(doc(window.db, "inventory", itemId), {
        stock: increment(-1)
    });
  // ✅ INVENTORY SALE LOG
await addDoc(
    collection(window.db, "inventory_logs"),
    {
        item_name: getItemName(item),
        qty: 1,
        type: "sale",
        branch: BRANCH,
        created_at: new Date().toISOString()
    }
);

    // 🔥 LOCAL UPDATE (IMPORTANT)
    item.stock = Math.max(0, (item.stock || 0) - 1);

    updateDisplay(tableId);
    openCanteen(tableId);
}

async function removeItem(tableId, itemId, price, name) {

    let t = tables.find(x => String(x.id) === String(tableId));
    if (!t || !t.canteenItems[itemId]) return;

    // 🔥 FREEZE LOCK
    if (t.afterCheckout) return;

    t.canteenItems[itemId].qty -= 1;
    t.canteenTotal -= price;

    if (t.canteenItems[itemId].qty <= 0) {
        delete t.canteenItems[itemId];
    }

    // 🔥 STOCK BACK FIREBASE
    const itemRef = doc(window.db, "inventory", itemId);

    await updateDoc(itemRef, {
        stock: increment(1)
    });

    updateDisplay(tableId);
    openCanteen(tableId);
}


/******************************************************
 * EDIT TABLE POPUP
 ******************************************************/
function editTable(id) {
    if (ROLE !== "admin" && ROLE !== "superadmin") {
        alert("Only admin can edit ❌");
        return;
    }
    let t = tables.find(x => String(x.id) === String(id));
    editTargetId = id;

    document.getElementById("editTableName").value = t.name;
    document.getElementById("editFrameRate").value = t.frameRate;
    document.getElementById("editCenturyRate").value = t.centuryRate;
document.getElementById("editTableType").value =
t.tableType || "table";

    document.getElementById("editTablePopup").classList.remove("hidden");

    document.getElementById("saveEditBtn").onclick = updateTable;
    document.getElementById("cancelEditBtn").onclick = () =>
        document.getElementById("editTablePopup").classList.add("hidden");
}

async function updateTable() {

    let t = tables.find(x => x.id === editTargetId);

    t.name = document.getElementById("editTableName").value.trim();
    t.frameRate = Number(document.getElementById("editFrameRate").value);
    t.centuryRate = Number(document.getElementById("editCenturyRate").value);
    t.tableType = document.getElementById("editTableType").value;

    // 🔥 FIREBASE UPDATE
    await updateDoc(doc(window.db, "tables", editTargetId), {
        table_id: t.name,
        frame_rate: t.frameRate,
        century_rate: t.centuryRate,

        table_type: t.tableType
    });

     
    renderTables();

    document.getElementById("editTablePopup").classList.add("hidden");
}

/******************************************************
 * DELETE TABLE POPUP
 ******************************************************/
function deleteTableOpen(id) {
    if (ROLE !== "admin" && ROLE !== "superadmin") {
        alert("Only admin can delete ❌");
        return;
    }
    deleteTargetId = id;
    document.getElementById("deletePopup").classList.remove("hidden");

    document.getElementById("confirmDeleteBtn").onclick = deleteTableConfirm;
    document.getElementById("cancelDeleteBtn").onclick =
        () => document.getElementById("deletePopup").classList.add("hidden");
}

async function deleteTableConfirm() {

    // 🔥 FIREBASE DELETE
    await deleteDoc(doc(window.db, "tables", deleteTargetId));

    tables = tables.filter(x => x.id !== deleteTargetId);

     
    renderTables();

    document.getElementById("deletePopup").classList.add("hidden");
}
/******************************************************
 * OPEN HISTORY POPUP — FINAL SINGLE VERSION
 ******************************************************/
function openHistory(id) {

    const t = tables.find(
        x => String(x.id) === String(id)
    );

    if (!t) {
        console.error("❌ Table not found:", id);
        return;
    }

    const body =
        document.getElementById("historyTableBody");

    const title =
        document.getElementById("historyTableTitle");

    if (!body) {
        console.error("❌ historyTableBody not found");
        return;
    }

    if (title) {
        title.innerText = `History - ${t.name}`;
    }

    // =====================================================
    // 🔥 BUILD CLEAN HISTORY
    // ONE FIREBASE SESSION = ONE BILL
    // =====================================================

    let rawHistory = Array.isArray(t.history)
        ? [...t.history]
        : [];

    const seenSessions = new Set();

    const historyList = [];

    for (const h of rawHistory) {

        // ---------------------------------------------
        // SESSION ID MUST EXIST
        // ---------------------------------------------
        if (!h.sessionId) {
            console.warn(
                "⚠️ HISTORY WITHOUT SESSION ID SKIPPED:",
                h
            );
            continue;
        }

        const sessionId =
            String(h.sessionId);

        // ---------------------------------------------
        // EXACT FIREBASE SESSION DUPLICATE
        // ---------------------------------------------
        if (seenSessions.has(sessionId)) {
            console.warn(
                "⚠️ DUPLICATE SESSION HIDDEN:",
                sessionId
            );
            continue;
        }

        seenSessions.add(sessionId);

        historyList.push(h);
    }

    // =====================================================
    // 🔥 SORT ONLY COPY
    // ORIGINAL t.history KO TOUCH NAHI KARNA
    // =====================================================

    historyList.sort((a, b) => {

        return Number(b.checkout || 0)
             - Number(a.checkout || 0);

    });

    // =====================================================
    // 🔥 SHIFT FILTER
    // =====================================================

    const shift1History =
        historyList.filter(
            h => Number(h.shiftNumber || 1) === 1
        );

    const shift2History =
        historyList.filter(
            h => Number(h.shiftNumber || 1) === 2
        );

    // =====================================================
    // 🔥 SUMMARY
    // =====================================================

    const shift1Game =
        shift1History.length;

    const shift2Game =
        shift2History.length;

  // =====================================================
// 🎱 FRAME / CENTURY SUMMARY
// =====================================================

const getPlayType = (h) =>
    String(
        h.selectedPlayType ||
        h.playType ||
        h.play_type ||
        "frame"
    ).toLowerCase();

const getAmount = (h) =>
    Number(
        h.originalAmount ??
        h.amount ??
        h.final_game_amount ??
        h.final_amount ??
        0
    );

const getSeconds = (h) =>
    Number(
        h.playSeconds ??
        h.finalSeconds ??
        h.play_seconds ??
        h.final_seconds ??
        0
    );

const shift1Frames =
    shift1History.filter(
        h => getPlayType(h) === "frame"
    );

const shift2Frames =
    shift2History.filter(
        h => getPlayType(h) === "frame"
    );

const shift1Century =
    shift1History.filter(
        h => getPlayType(h) === "century"
    );

const shift2Century =
    shift2History.filter(
        h => getPlayType(h) === "century"
    );

const shift1FrameAmount =
    shift1Frames.reduce(
        (sum, h) => sum + getAmount(h),
        0
    );

const shift2FrameAmount =
    shift2Frames.reduce(
        (sum, h) => sum + getAmount(h),
        0
    );

const shift1CenturyAmount =
    shift1Century.reduce(
        (sum, h) => sum + getAmount(h),
        0
    );

const shift2CenturyAmount =
    shift2Century.reduce(
        (sum, h) => sum + getAmount(h),
        0
    );

const shift1CenturySeconds =
    shift1Century.reduce(
        (sum, h) => sum + getSeconds(h),
        0
    );

const shift2CenturySeconds =
    shift2Century.reduce(
        (sum, h) => sum + getSeconds(h),
        0
    );

    const shift1Guest =
        shift1History.filter(
            h => !h.fromBooking
        ).length;

    const shift2Guest =
        shift2History.filter(
            h => !h.fromBooking
        ).length;

    const shift1Booking =
        shift1History.filter(
            h => h.fromBooking
        ).length;

    const shift2Booking =
        shift2History.filter(
            h => h.fromBooking
        ).length;

    const shift1Paid =
        shift1History.filter(
            h => h.paid === true
        ).length;

    const shift2Paid =
        shift2History.filter(
            h => h.paid === true
        ).length;

    const shift1Unpaid =
        shift1History.filter(
            h => h.paid !== true
        ).length;

    const shift2Unpaid =
        shift2History.filter(
            h => h.paid !== true
        ).length;

    const shift1PaidAmount =
        shift1History
            .filter(h => h.paid === true)
            .reduce(
                (sum, h) =>
                    sum + Number(h.total || 0),
                0
            );

    const shift2PaidAmount =
        shift2History
            .filter(h => h.paid === true)
            .reduce(
                (sum, h) =>
                    sum + Number(h.total || 0),
                0
            );

    const shift1UnpaidAmount =
        shift1History
            .filter(h => h.paid !== true)
            .reduce(
                (sum, h) =>
                    sum + Number(h.total || 0),
                0
            );

    const shift2UnpaidAmount =
        shift2History
            .filter(h => h.paid !== true)
            .reduce(
                (sum, h) =>
                    sum + Number(h.total || 0),
                0
            );

// =====================================================
// 🔥 PAID / UNPAID FRAME + CENTURY SUMMARY
// =====================================================

const isPaid = (h) =>
    h.paid === true ||
    h.paid === "true";


// ---------- FRAME ----------

const shift1PaidFrames =
    shift1Frames.filter(isPaid);

const shift2PaidFrames =
    shift2Frames.filter(isPaid);

const shift1UnpaidFrames =
    shift1Frames.filter(h => !isPaid(h));

const shift2UnpaidFrames =
    shift2Frames.filter(h => !isPaid(h));


// ---------- CENTURY ----------

const shift1PaidCentury =
    shift1Century.filter(isPaid);

const shift2PaidCentury =
    shift2Century.filter(isPaid);

const shift1UnpaidCentury =
    shift1Century.filter(h => !isPaid(h));

const shift2UnpaidCentury =
    shift2Century.filter(h => !isPaid(h));


// =====================================================
// 🔥 HELPER
// =====================================================

const amountOf = (list) =>
    list.reduce(
        (sum, h) => sum + getAmount(h),
        0
    );

const secondsOf = (list) =>
    list.reduce(
        (sum, h) => sum + getSeconds(h),
        0
    );


// =====================================================
// 🎱 FRAME COUNT RULE
// SINGLE = 1
// DOUBLE = 2
// =====================================================
const getFrameCount = (h) => {

    const rate = Number(
        h.selectedRate ??
        h.selected_rate ??
        h.frameRate ??
        h.frame_rate ??
        h.rate ??
        0
    );

    const playType = String(
        h.selectedPlayType ??
        h.playType ??
        h.play_type ??
        ""
    ).toLowerCase();

    if (playType === "century") {
        return 0;
    }

    if (
        rate === 200 ||
        playType.includes("double")
    ) {
        return 2;
    }

    return 1;
};


const countFrames = (list) =>
    list.reduce(
        (sum, h) =>
            sum + getFrameCount(h),
        0
    );


const s1FrameCount =
    countFrames(shift1Frames);

const s2FrameCount =
    countFrames(shift2Frames);

const totalFrameCount =
    s1FrameCount + s2FrameCount;

// =====================================================
// 💰 FRAME AMOUNTS
// =====================================================

const s1FrameAmount =
    amountOf(shift1Frames);

const s2FrameAmount =
    amountOf(shift2Frames);

const totalFrameAmount =
    s1FrameAmount + s2FrameAmount;


// =====================================================
// 👑 CENTURY COUNTS
// =====================================================

const s1CenturyCount =
    shift1Century.length;

const s2CenturyCount =
    shift2Century.length;

const totalCenturyCount =
    s1CenturyCount + s2CenturyCount;


// =====================================================
// 👑 CENTURY AMOUNTS
// =====================================================

const s1CenturyAmount =
    amountOf(shift1Century);

const s2CenturyAmount =
    amountOf(shift2Century);

const totalCenturyAmount =
    s1CenturyAmount + s2CenturyAmount;


// =====================================================
// ⏱️ CENTURY TIME
// =====================================================

const s1CenturySeconds =
    secondsOf(shift1Century);

const s2CenturySeconds =
    secondsOf(shift2Century);

const totalCenturySeconds =
    s1CenturySeconds + s2CenturySeconds;


// =====================================================
// 💰 PAID FRAMES
// =====================================================

const s1PaidFrameCount =
    countFrames(shift1PaidFrames);

const s2PaidFrameCount =
    countFrames(shift2PaidFrames);

const totalPaidFrameCount =
    s1PaidFrameCount + s2PaidFrameCount;

const s1PaidFrameAmount =
    amountOf(shift1PaidFrames);

const s2PaidFrameAmount =
    amountOf(shift2PaidFrames);

const totalPaidFrameAmount =
    s1PaidFrameAmount + s2PaidFrameAmount;


// =====================================================
// 👑 PAID CENTURIES
// =====================================================

const s1PaidCenturyCount =
    shift1PaidCentury.length;

const s2PaidCenturyCount =
    shift2PaidCentury.length;

const totalPaidCenturyCount =
    s1PaidCenturyCount + s2PaidCenturyCount;

const s1PaidCenturyAmount =
    amountOf(shift1PaidCentury);

const s2PaidCenturyAmount =
    amountOf(shift2PaidCentury);

const totalPaidCenturyAmount =
    s1PaidCenturyAmount + s2PaidCenturyAmount;

const s1PaidCenturySeconds =
    secondsOf(shift1PaidCentury);

const s2PaidCenturySeconds =
    secondsOf(shift2PaidCentury);

const totalPaidCenturySeconds =
    s1PaidCenturySeconds + s2PaidCenturySeconds;


// =====================================================
// 🔴 UNPAID FRAMES
// =====================================================

const s1UnpaidFrameCount =
    countFrames(shift1UnpaidFrames);

const s2UnpaidFrameCount =
    countFrames(shift2UnpaidFrames);

const totalUnpaidFrameCount =
    s1UnpaidFrameCount + s2UnpaidFrameCount;

const s1UnpaidFrameAmount =
    amountOf(shift1UnpaidFrames);

const s2UnpaidFrameAmount =
    amountOf(shift2UnpaidFrames);

const totalUnpaidFrameAmount =
    s1UnpaidFrameAmount + s2UnpaidFrameAmount;


// =====================================================
// 🔴 UNPAID CENTURIES
// =====================================================

const s1UnpaidCenturyCount =
    shift1UnpaidCentury.length;

const s2UnpaidCenturyCount =
    shift2UnpaidCentury.length;

const totalUnpaidCenturyCount =
    s1UnpaidCenturyCount + s2UnpaidCenturyCount;

const s1UnpaidCenturyAmount =
    amountOf(shift1UnpaidCentury);

const s2UnpaidCenturyAmount =
    amountOf(shift2UnpaidCentury);

const totalUnpaidCenturyAmount =
    s1UnpaidCenturyAmount + s2UnpaidCenturyAmount;

const s1UnpaidCenturySeconds =
    secondsOf(shift1UnpaidCentury);

const s2UnpaidCenturySeconds =
    secondsOf(shift2UnpaidCentury);

const totalUnpaidCenturySeconds =
    s1UnpaidCenturySeconds +
    s2UnpaidCenturySeconds;


// =====================================================
// 🔥 TIME FORMAT
// =====================================================

const formatSummaryTime = (seconds) => {

    seconds = Math.max(
        0,
        Math.floor(Number(seconds) || 0)
    );

    const hours =
        Math.floor(seconds / 3600);

    const minutes =
        Math.floor((seconds % 3600) / 60);

    const secs =
        seconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(secs).padStart(2, "0")
    ].join(":");
};


// =====================================================
// 🔥 SAFE DOM UPDATE
// =====================================================

const setText = (id, value) => {

    const el =
        document.getElementById(id);

    if (el) {
        el.textContent = value;
    }
};


// =====================================================
// 🎱 TOTAL FRAMES
// =====================================================

setText(
    "historyShift1Frame",
    s1FrameCount
);

setText(
    "historyShift2Frame",
    s2FrameCount
);

setText(
    "historyTotalFrame",
    totalFrameCount
);

setText(
    "historyShift1FrameAmount",
    `Rs. ${s1FrameAmount.toLocaleString()}`
);

setText(
    "historyShift2FrameAmount",
    `Rs. ${s2FrameAmount.toLocaleString()}`
);

setText(
    "historyTotalFrameAmount",
    `Rs. ${totalFrameAmount.toLocaleString()}`
);


// =====================================================
// 👑 TOTAL CENTURY
// =====================================================

setText(
    "historyShift1Century",
    s1CenturyCount
);

setText(
    "historyShift2Century",
    s2CenturyCount
);

setText(
    "historyTotalCentury",
    totalCenturyCount
);

setText(
    "historyShift1CenturyAmount",
    `Rs. ${s1CenturyAmount.toLocaleString()}`
);

setText(
    "historyShift2CenturyAmount",
    `Rs. ${s2CenturyAmount.toLocaleString()}`
);

setText(
    "historyTotalCenturyAmount",
    `Rs. ${totalCenturyAmount.toLocaleString()}`
);

setText(
    "historyShift1CenturyTime",
    formatSummaryTime(s1CenturySeconds)
);

setText(
    "historyShift2CenturyTime",
    formatSummaryTime(s2CenturySeconds)
);

setText(
    "historyTotalCenturyTime",
    formatSummaryTime(totalCenturySeconds)
);


// =====================================================
// 💰 PAID FRAMES
// =====================================================

setText(
    "historyShift1PaidFrame",
    s1PaidFrameCount
);

setText(
    "historyShift2PaidFrame",
    s2PaidFrameCount
);

setText(
    "historyTotalPaidFrame",
    totalPaidFrameCount
);

setText(
    "historyShift1PaidFrameAmount",
    `Rs. ${s1PaidFrameAmount.toLocaleString()}`
);

setText(
    "historyShift2PaidFrameAmount",
    `Rs. ${s2PaidFrameAmount.toLocaleString()}`
);

setText(
    "historyTotalPaidFrameAmount",
    `Rs. ${totalPaidFrameAmount.toLocaleString()}`
);


// =====================================================
// 💰 PAID CENTURIES
// =====================================================

setText(
    "historyShift1PaidCentury",
    s1PaidCenturyCount
);

setText(
    "historyShift2PaidCentury",
    s2PaidCenturyCount
);

setText(
    "historyTotalPaidCentury",
    totalPaidCenturyCount
);

setText(
    "historyShift1PaidCenturyAmount",
    `Rs. ${s1PaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyShift2PaidCenturyAmount",
    `Rs. ${s2PaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyTotalPaidCenturyAmount",
    `Rs. ${totalPaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyShift1PaidCenturyTime",
    formatSummaryTime(s1PaidCenturySeconds)
);

setText(
    "historyShift2PaidCenturyTime",
    formatSummaryTime(s2PaidCenturySeconds)
);

setText(
    "historyTotalPaidCenturyTime",
    formatSummaryTime(totalPaidCenturySeconds)
);


// =====================================================
// 🔴 UNPAID FRAMES
// =====================================================

setText(
    "historyShift1UnpaidFrame",
    s1UnpaidFrameCount
);

setText(
    "historyShift2UnpaidFrame",
    s2UnpaidFrameCount
);

setText(
    "historyTotalUnpaidFrame",
    totalUnpaidFrameCount
);

setText(
    "historyShift1UnpaidFrameAmount",
    `Rs. ${s1UnpaidFrameAmount.toLocaleString()}`
);

setText(
    "historyShift2UnpaidFrameAmount",
    `Rs. ${s2UnpaidFrameAmount.toLocaleString()}`
);

setText(
    "historyTotalUnpaidFrameAmount",
    `Rs. ${totalUnpaidFrameAmount.toLocaleString()}`
);


// =====================================================
// 🔴 UNPAID CENTURIES
// =====================================================

setText(
    "historyShift1UnpaidCentury",
    s1UnpaidCenturyCount
);

setText(
    "historyShift2UnpaidCentury",
    s2UnpaidCenturyCount
);

setText(
    "historyTotalUnpaidCentury",
    totalUnpaidCenturyCount
);

setText(
    "historyShift1UnpaidCenturyAmount",
    `Rs. ${s1UnpaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyShift2UnpaidCenturyAmount",
    `Rs. ${s2UnpaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyTotalUnpaidCenturyAmount",
    `Rs. ${totalUnpaidCenturyAmount.toLocaleString()}`
);

setText(
    "historyShift1UnpaidCenturyTime",
    formatSummaryTime(s1UnpaidCenturySeconds)
);

setText(
    "historyShift2UnpaidCenturyTime",
    formatSummaryTime(s2UnpaidCenturySeconds)
);

setText(
    "historyTotalUnpaidCenturyTime",
    formatSummaryTime(totalUnpaidCenturySeconds)
);
    // =====================================================
    // 🔥 TABLE
    // =====================================================

    body.innerHTML = "";

    if (historyList.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="11"
                    style="text-align:center;">
                    No history found.
                </td>
            </tr>
        `;

    } else {

        historyList.forEach((h, index) => {

            const sessionId =
                String(h.sessionId);

            body.innerHTML += `

                <tr>

<td>
    ${index + 1}
</td>

<!-- 🔥 PLAYERS -->
<td>
    <div style="
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width:130px;
    ">

        <div style="
            ${
                Number(h.checkoutPlayerNumber) === 1
                ? "background:#d4af37;color:#000;padding:4px 7px;border-radius:5px;font-weight:bold;"
                : ""
            }
        ">
            ${
                Number(h.checkoutPlayerNumber) === 1
                ? "⭐ "
                : ""
            }
            ${h.player1Name || "Player 1"}
        </div>

        <div style="
            text-align:center;
            font-size:10px;
            opacity:.6;
        ">
            VS
        </div>

        <div style="
            ${
                Number(h.checkoutPlayerNumber) === 2
                ? "background:#d4af37;color:#000;padding:4px 7px;border-radius:5px;font-weight:bold;"
                : ""
            }
        ">
            ${
                Number(h.checkoutPlayerNumber) === 2
                ? "⭐ "
                : ""
            }
            ${h.player2Name || "Player 2"}
        </div>

    </div>
</td>

<td>
    ${formatTime(h.checkin)}

                        ${
                            h.fromBooking
                            ? `
                                <div style="
                                    margin-top:4px;
                                    display:inline-block;
                                    background:#d4af37;
                                    color:#000;
                                    padding:2px 7px;
                                    border-radius:5px;
                                    font-size:10px;
                                    font-weight:bold;
                                ">
                                    BOOKING
                                </div>
                              `
                            : ""
                        }

                    </td>

                    <td>
                        ${formatTime(h.checkout)}
                    </td>

                    <td>
                        ${formatSeconds(
                            h.playSeconds || 0
                        )}
                    </td>

                    <td>
                        ${h.rate || 0}
                    </td>

                    <td>
                        ${
                            h.originalAmount ||
                            h.amount ||
                            0
                        }
                    </td>

                    <td>
                        ${h.discount || 0}
                    </td>

                    <td>
                        ${h.canteenAmount || 0}
                    </td>

                    <td>
                        ${
                            h.total ||
                            (
                                Number(
                                    h.amount || 0
                                ) +
                                Number(
                                    h.canteenAmount || 0
                                )
                            )
                        }
                    </td>

                    <td>

                        ${
                            h.paid === true

                            ? `
                                <button
                                    class="paid-btn"
                                    disabled>
                                    PAID
                                </button>
                              `

                            : `
                                <button
                                    class="unpaid-btn"
                                    onclick="openBillFromHistory(
                                        '${String(id)}',
                                        '${sessionId}'
                                    )">
                                    UNPAID
                                </button>
                              `
                        }

                    </td>

                    <td>

                        ${
                            ROLE === "admin"

                            ? `
                                <input
                                    type="checkbox"
                                    class="historyDeleteCheck"
                                    data-session-id="${sessionId}"
                                >
                              `

                            : "-"
                        }

                    </td>

                </tr>

            `;
        });
    }

    // =====================================================
    // 🔥 SHOW POPUP
    // =====================================================

    document
        .getElementById("historyPopup")
        .classList.remove("hidden");

    // =====================================================
    // CLOSE
    // =====================================================

    const closeBtn =
        document.getElementById(
            "closeHistoryBtn"
        );

    if (closeBtn) {

        closeBtn.onclick = () => {

            document
                .getElementById("historyPopup")
                .classList.add("hidden");

        };
    }

    // =====================================================
    // DELETE BUTTON
    // =====================================================

    const deleteBtn =
        document.getElementById(
            "deleteSelectedHistoryBtn"
        );

    if (!deleteBtn) return;

    if (ROLE === "admin") {

        deleteBtn.classList.remove("hidden");

        deleteBtn.onclick = async () => {

            const checks =
                document.querySelectorAll(
                    ".historyDeleteCheck:checked"
                );

            if (checks.length === 0) {
                alert("Select history first ❌");
                return;
            }

            const ok = confirm(
                `Delete ${checks.length} sessions ?`
            );

            if (!ok) return;

            for (const check of checks) {

                const sessionId =
                    check.dataset.sessionId;

                const index =
                    t.history.findIndex(
                        h =>
                            String(h.sessionId)
                            === String(sessionId)
                    );

                if (index !== -1) {
                    await softDeleteSession(
                        id,
                        index
                    );
                }
            }

            await rebuildHistoryFromSessions();

            renderTables();

            openHistory(id);

            alert(
                `${checks.length} sessions deleted successfully ✅`
            );
        };

    } else {

        deleteBtn.classList.add("hidden");

    }
}

function openBillFromHistory(tableId, sessionId) {

    const t =
        tables.find(
            x => String(x.id) === String(tableId)
        );

    if (!t) {

        console.error(
            "❌ Table not found:",
            tableId
        );

        return;
    }

    if (!Array.isArray(t.history)) {

        console.error(
            "❌ Table history missing:",
            tableId
        );

        return;
    }

    // ==========================================
    // EXACT FIREBASE SESSION
    // ==========================================

    const h =
        t.history.find(
            x =>
                String(x.sessionId) ===
                String(sessionId)
        );

    if (!h) {

        console.error(
            "❌ History session not found:",
            {
                tableId,
                sessionId,
                history: t.history
            }
        );

        alert("History session not found ❌");

        return;
    }

    // ==========================================
    // ALREADY PAID
    // ==========================================

    if (h.paid === true) {

        alert(
            "This bill is already paid ✅"
        );

        return;
    }

    // ==========================================
    // BILL VALUES
    // ==========================================

    const academy =
        localStorage.getItem("academyName") ||
        "Rasson Snooker Academy";

    const branch =
        BRANCH || "Rasson1";

    const checkin =
        h.checkin
        ? formatTime(h.checkin)
        : "--";

    const checkout =
        h.checkout
        ? formatTime(h.checkout)
        : "--";

    const playtime =
        formatSeconds(
            h.playSeconds || 0
        );

    const originalAmount =
        Number(
            h.originalAmount ||
            h.amount ||
            0
        );

    const discount =
        Number(
            h.discount || 0
        );

    const gameAmount =
        Number(
            h.amount || 0
        );

    const canteenTotal =
        Number(
            h.canteenAmount || 0
        );

    const finalTotal =
        gameAmount +
        canteenTotal;

    // ==========================================
    // CANTEEN
    // ==========================================

    const canteenItems =
        Object.values(
            h.canteenItems || {}
        );

    let canteenHTML = "";

    if (canteenItems.length === 0) {

        canteenHTML =
            `<div>No canteen items</div>`;

    } else {

        canteenHTML =
            canteenItems
                .map(item => {

                    const name =
                        item.name ||
                        item.item ||
                        "Item";

                    const qty =
                        Number(
                            item.qty ||
                            item.quantity ||
                            1
                        );

                    const amount =
                        Number(
                            item.amount ||
                            item.total ||
                            item.price ||
                            0
                        );

                    return `
                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                            "
                        >
                            <span>
                                ${name} x${qty}
                            </span>

                            <span>
                                Rs ${amount}
                            </span>
                        </div>
                    `;

                })
                .join("");
    }

    // ==========================================
    // BILL HTML
    // ==========================================

    const bill =
        document.getElementById(
            "billDetails"
        );

    if (!bill) {

        console.error(
            "❌ billDetails element not found"
        );

        return;
    }

    bill.innerHTML = `

        <div
            style="
                width:300px;
                margin:auto;
                font-family:monospace;
                color:#000;
                background:#fff;
                padding:15px;
                border-radius:10px;
            "
        >

            <center>

                <img
                    src="../assets/bill-logo.png"
                    style="width:120px;"
                >

                <h2>
                    ${academy}
                </h2>

                <div>
                    ${branch}
                </div>

            </center>

            <hr>

            <div style="
    margin:10px 0;
    padding:8px;
    border:1px solid #999;
    border-radius:6px;
">

    <b>PLAYERS</b>

    <div style="
        margin-top:7px;
        font-size:15px;
    ">

        <span style="
            ${
                Number(h.checkoutPlayerNumber) === 1
                ? "background:#d4af37;color:#000;padding:3px 6px;border-radius:5px;font-weight:bold;"
                : ""
            }
        ">
            ${
                Number(h.checkoutPlayerNumber) === 1
                ? "⭐ "
                : ""
            }

            ${h.player1Name || "Player 1"}
        </span>

        <b> VS </b>

        <span style="
            ${
                Number(h.checkoutPlayerNumber) === 2
                ? "background:#d4af37;color:#000;padding:3px 6px;border-radius:5px;font-weight:bold;"
                : ""
            }
        ">
            ${
                Number(h.checkoutPlayerNumber) === 2
                ? "⭐ "
                : ""
            }

            ${h.player2Name || "Player 2"}
        </span>

    </div>

</div>

            <div>
                <b>Table:</b>
                ${t.name}
            </div>

            <div>
                <b>Check-in:</b>
                ${checkin}
            </div>

            <div>
                <b>Check-out:</b>
                ${checkout}
            </div>

            <div>
                <b>Play Time:</b>
                ${playtime}
            </div>

            <hr>

            <h3>GAME</h3>

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                "
            >
                <span>Original</span>
                <span>
                    Rs ${originalAmount}
                </span>
            </div>

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                "
            >
                <span>Discount</span>
                <span>
                    Rs ${discount}
                </span>
            </div>

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                "
            >
                <b>Game Total</b>
                <b>
                    Rs ${gameAmount}
                </b>
            </div>

            <hr>

            <h3>CANTEEN</h3>

            ${canteenHTML}

            <hr>

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    font-size:20px;
                "
            >
                <b>TOTAL</b>

                <b>
                    Rs ${finalTotal}
                </b>
            </div>

            <hr>

            <center>

                <img
                    src="../assets/QR-bill.png"
                    style="width:100px;"
                >

                <br>

                <small>
                    Scan & Pay
                </small>

            </center>

        </div>
    `;

    // ==========================================
    // SHOW BILL POPUP
    // ==========================================

    const billPopup =
        document.getElementById(
            "billPopup"
        );

    if (billPopup) {

        billPopup
            .classList
            .remove("hidden");
    }

    // ==========================================
    // CLOSE
    // ==========================================

    const cancelBillBtn =
        document.getElementById(
            "cancelBillBtn"
        );

    if (cancelBillBtn) {

        cancelBillBtn.onclick =
            () => {

                billPopup
                    ?.classList
                    .add("hidden");

            };
    }

    // ==========================================
    // PAID
    // ==========================================

    const paidBtn =
        document.getElementById(
            "paidBtn"
        );

    if (!paidBtn) {

        console.error(
            "❌ paidBtn not found"
        );

        return;
    }

    // Remove previous handler
    paidBtn.onclick = null;

    paidBtn.onclick =
        async () => {

            try {

                // EXACT SESSION ID
                await updateDoc(
                    doc(
                        window.db,
                        "sessions",
                        String(sessionId)
                    ),
                    {
                        paid: true,
                        paid_time:
                            new Date().toISOString()
                    }
                );

                // Refresh local history
                await rebuildHistoryFromSessions();

                // Close bill
                billPopup
                    ?.classList
                    .add("hidden");

// Refresh history popup
openHistory(tableId);

// PRINT BILL
printThermalBill(
    tableId,
    h
);

console.log(
    "✅ BILL PAID + PRINTED:",
    sessionId
);

            } catch (error) {

                console.error(
                    "❌ PAYMENT ERROR:",
                    error
                );

                alert(
                    "Payment save failed ❌"
                );
            }
        };
}

// 🔥 MUST BE GLOBAL FOR HTML ONCLICK
window.openBillFromHistory = openBillFromHistory;

document.getElementById("paidBtn").onclick = async () => {

    let t = tables.find(x => String(x.id) === String(tableId));
    let h = t.history[historyIndex];

    // ✅ MARK PAID
    h.paid = true;
    h.paidTime = Date.now();

    // 🔥 FIREBASE UPDATE (MAIN FIX)
    const q = query(
        collection(window.db, "sessions"),
        where("table_id", "==", t.name),
        where("branch", "==", BRANCH),
      where("is_deleted", "==", false)
    );

    const snap = await getDocs(q);

    let targetSession = null;

    snap.forEach(d => {
        const data = d.data();

const startDiff = Math.abs(
    new Date(data.start_time).getTime() - h.checkin
);

const endDiff = Math.abs(
    new Date(data.end_time).getTime() - h.checkout
);

if (startDiff < 5000 && endDiff < 5000) {
    targetSession = d;
}
    });

    if (targetSession) {
        await updateDoc(doc(window.db, "sessions", targetSession.id), {
            paid: true,
            paid_time: new Date().toISOString()
        });
    }

    // ✅ CLOSE BILL
    document.getElementById("billPopup").classList.add("hidden");

    // ✅ UI UPDATE
    openHistory(tableId);

    // ✅ PRINT
    printThermalBill(tableId, h);
};

// 🔥 CANTEEN LIST
let canteenHTML = "";
let canteenTotal = 0;

canteenItems.forEach(item => {
    const total = item.qty * item.price;
    canteenTotal += total;

    canteenHTML += `
    <div style="display:flex; justify-content:space-between;">
        <span>${item.name} x${item.qty}</span>
        <span>${total}</span>
    </div>
    `;
});

if (!canteenHTML) canteenHTML = "<p>No items</p>";

const originalAmount =
h.originalAmount || h.amount || 0;

const discount =
h.discount || 0;

const gameAmount =
originalAmount - discount;

const finalTotal =
gameAmount + canteenTotal;

// 🔥 PLAYER NAMES FOR BILL
const player1 =
    h.player1Name ||
    h.player1_name ||
    "";

const player2 =
    h.player2Name ||
    h.player2_name ||
    "";

bill.innerHTML = `
<div style="width:300px; margin:auto; font-family:monospace; color:#000; background:#fff; padding:15px; border-radius:10px;">

    <!-- 🔥 LOGO -->
    <center>
        <img src="../assets/bill-logo.png" style="width:120px;">
        <h3 style="margin:5px 0;">${academy}</h3>
        <small>${branch}</small>
    </center>

    <hr>

    <!-- TABLE INFO -->
    <p><b>Table:</b> ${t.name}</p>
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Checkout:</b> ${checkout}</p>
    <p><b>Play Time:</b> ${playtime}</p>
    <p><b>Play Type:</b> ${h.playType || "frame"}</p>
    <p><b>Rate:</b> Rs ${h.rate || 0}</p>

    <hr>

    <!-- 🔥 CANTEEN -->
    <p><b>Canteen</b></p>
    ${canteenHTML}

    <div style="display:flex; justify-content:space-between;">
        <b>Canteen Total</b>
        <b>Rs ${canteenTotal}</b>
    </div>

    <hr>

    <!-- 🔥 GAME -->
<div style="display:flex; justify-content:space-between;">
    <span>Original</span>
    <span>Rs ${originalAmount}</span>
</div>

<div style="display:flex; justify-content:space-between;">
    <span>Discount</span>
    <span>Rs ${discount}</span>
</div>

<div style="display:flex; justify-content:space-between;">
    <span>Final Game</span>
    <span>Rs ${gameAmount}</span>
</div>

    <hr>

    <!-- 🔥 FINAL TOTAL -->
    <div style="display:flex; justify-content:space-between; font-size:18px;">
        <b>Total</b>
        <b>Rs ${finalTotal}</b>
    </div>

    <hr>

    <!-- 🔥 QR -->
    <center>
        <img src="../assets/QR-bill.png" style="width:100px;">
        <br>
        <small>Scan & Pay</small>
    </center>

    <hr>

    <center>
        <small>Thanks for visiting ❤️</small>
    </center>

</div>
`;

    document.getElementById("billPopup").classList.remove("hidden");


/******************************************************
 * SHIFT TABLE POPUP (OPEN)
 ******************************************************/
function openTableShift(id) {

    const t = tables.find(
        x => String(x.id) === String(id)
    );

    if (!t) {
        console.error("❌ Source table not found:", id);
        return;
    }

    if (!t.isRunning) {
        alert("Only running tables can be shifted.");
        return;
    }

    window._shiftSourceTable = id;

    const sel =
        document.getElementById("shiftTableSelect");

    if (!sel) {
        console.error("❌ shiftTableSelect not found");
        return;
    }

    sel.innerHTML = "";

    // ==========================================
    // SORT — TABLES FIRST, ROOMS AFTER
    // ==========================================

    const sortedTables = [...tables].sort((a, b) => {

        const getType = (name = "") => {

            const n =
                String(name)
                    .toLowerCase()
                    .trim();

            if (n.startsWith("table")) return 1;
            if (n.startsWith("room")) return 2;
            if (n.startsWith("pool")) return 3;

            return 4;
        };

        const typeA = getType(a.name);
        const typeB = getType(b.name);

        if (typeA !== typeB) {
            return typeA - typeB;
        }

        const numA =
            Number(
                ((a.name || "").match(/\d+/) || [0])[0]
            );

        const numB =
            Number(
                ((b.name || "").match(/\d+/) || [0])[0]
            );

        return numA - numB;
    });

    // ==========================================
    // ONLY FREE TABLES
    // ==========================================

    sortedTables.forEach(tb => {

        if (
            !tb.isRunning &&
            String(tb.id) !== String(id)
        ) {

            sel.innerHTML += `
                <option value="${tb.id}">
                    ${tb.name}
                </option>
            `;
        }
    });

    // ==========================================
    // NO FREE TABLE
    // ==========================================

    if (!sel.value) {

        alert(
            "No free tables available to shift."
        );

        return;
    }

    // ==========================================
    // OPEN POPUP
    // ==========================================

    const popup =
        document.getElementById("shiftTablePopup");

    if (!popup) {
        console.error("❌ shiftTablePopup not found");
        return;
    }

    popup.classList.remove("hidden");

    // ==========================================
    // CANCEL
    // ==========================================

    const cancelBtn =
        document.getElementById(
            "cancelShiftTableBtn"
        );

    if (cancelBtn) {

        cancelBtn.onclick = () => {

            popup.classList.add("hidden");

            window._shiftSourceTable = null;
        };
    }

    // ==========================================
    // CONFIRM
    // ==========================================

    const confirmBtn =
        document.getElementById(
            "confirmShiftTableBtn"
        );

    if (confirmBtn) {

        confirmBtn.onclick =
            shiftPlayerToNewTable;
    }
}
/******************************************************
 * SHIFT PLAYER TO NEW TABLE (MAIN LOGIC)
 ******************************************************/
async function shiftPlayerToNewTable() {

    let oldId = window._shiftSourceTable;
    let newId = document.getElementById("shiftTableSelect").value;

    let oldT = tables.find(x => String(x.id) === String(oldId));
    let newT = tables.find(x => String(x.id) === String(newId));

    if (!oldT || !newT) return;

    // 🔥 MOVE SESSION (LOCAL)
    newT.isRunning = true;
    newT.checkinTime = oldT.checkinTime;
    newT.playSeconds = oldT.playSeconds;
    newT.liveAmount = oldT.liveAmount;
    newT.canteenTotal = oldT.canteenTotal;
    newT.canteenItems = { ...oldT.canteenItems };


  // 🔥 MOVE PLAYERS WITH RUNNING SESSION
newT.player1Name =
    oldT.player1Name || "";

newT.player2Name =
    oldT.player2Name || "";

newT.checkoutPlayer =
    oldT.checkoutPlayer || "";

newT.checkoutPlayerNumber =
    oldT.checkoutPlayerNumber || null;

    runTimer(newT.id);

    // 🔥 RESET OLD TABLE
    oldT.isRunning = false;
    oldT.checkinTime = null;
    oldT.checkoutTime = null;
    oldT.playSeconds = 0;
    oldT.liveAmount = 0;
    oldT.canteenTotal = 0;
    oldT.canteenItems = {};

  // 🔥 CLEAR OLD TABLE PLAYERS
oldT.player1Name = "";
oldT.player2Name = "";
oldT.checkoutPlayer = "";
oldT.checkoutPlayerNumber = null;

     
    renderTables();

    document.getElementById("shiftTablePopup").classList.add("hidden");

    // 🔥 FIREBASE SYNC (IMPORTANT FIX)
    try {
        const q = query(
            collection(window.db, "sessions"),
            where("table_id", "==", oldT.name),
            where("branch", "==", BRANCH),
            where("end_time", "==", null)
        );

        const snap = await getDocs(q);

        snap.forEach(async (d) => {
            await updateDoc(doc(window.db, "sessions", d.id), {
                table_id: newT.name
            });
        });

    } catch (err) {
        console.error("Shift Firebase error:", err);
    }

    alert(`Shifted successfully to ${newT.name}`);
}


/******************************************************
 * SHIFT BUTTON BINDING — SINGLE SHIFT
 ******************************************************/
function bindShiftButtons() {

    const shiftCloseBtn =
        document.getElementById("shiftCloseBtn");

    const confirmShiftCloseBtn =
        document.getElementById("confirmShiftCloseBtn");

    const cancelShiftSummaryBtn =
        document.getElementById("cancelShiftSummaryBtn");


    // 🔥 OPEN SHIFT SNAPSHOT
    if (shiftCloseBtn) {

        shiftCloseBtn.onclick =
            openShiftSummary;

    }


// 🔥 CONFIRM SHIFT / DAY CLOSE
if (confirmShiftCloseBtn) {

    confirmShiftCloseBtn.onclick = async () => {

        const action =
            confirmShiftCloseBtn.innerText
                .trim()
                .toLowerCase();

        console.log("🔥 CLOSE ACTION:", action);

        // 🔥 DAY CLOSE
        if (action.includes("day")) {

            await closeDay();

        }

        // 🔥 SHIFT CLOSE
        else if (action.includes("shift")) {

            await closeShift();

        }

        else {

            console.error(
                "❌ UNKNOWN CLOSE ACTION:",
                action
            );

        }

    };

}


    // 🔥 CANCEL
    if (cancelShiftSummaryBtn) {

        cancelShiftSummaryBtn.onclick =
            () =>
                hidePopup(
                    "shiftSummaryPopup"
                );

    }


    hidePopup(
        "shiftSummaryPopup"
    );
}

/******************************************************
 * POPUP SHOW/HIDE
 ******************************************************/
function showPopup(id) {
    document.getElementById(id).classList.remove("hidden");
}
function hidePopup(id) {
    document.getElementById(id).classList.add("hidden");
}

/******************************************************
 * 🔥 NEW RASSON DAY / SHIFT SNAPSHOT
 ******************************************************/

function snapshotMoney(value) {
    return "Rs. " + Number(value || 0).toLocaleString("en-PK");
}


function snapshotTime(seconds) {

    seconds = Number(seconds || 0);

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return (
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0")
    );
}

/* =====================================================
   🎱 SNAPSHOT FRAME COUNT
   SINGLE FRAME = 1
   DOUBLE FRAME = 2
   CENTURY = 0 FRAME
===================================================== */

function getFrameCount(h) {

    const rate = Number(
        h.selectedRate ??
        h.selected_rate ??
        h.frameRate ??
        h.frame_rate ??
        h.rate ??
        0
    );

    const playType = String(
        h.selectedPlayType ??
        h.selected_play_type ??
        h.playType ??
        h.play_type ??
        ""
    ).toLowerCase().trim();


    // 👑 Century is not a frame
    if (playType === "century") {
        return 0;
    }


    // 🎱 Double Frame = 2
    if (
        rate === 200 ||
        playType.includes("double")
    ) {
        return 2;
    }


    // 🎱 Single Frame = 1
    return 1;
}


/* =====================================================
   TABLE DATA
===================================================== */

function getSnapshotTableData(
    table,
    startMs,
    endMs,
    shiftNumber = null
) {

    let frames = 0;
    let frameAmount = 0;
    let frameTime = 0;

    let centuries = 0;
    let centuryAmount = 0;
    let centuryTime = 0;


    (table.history || []).forEach(h => {

        const checkout =
            Number(h.checkout || 0);

        if (
            checkout < startMs ||
            checkout > endMs
        ) {
            return;
        }


        /*
         * Shift filtering
         */

        if (
            shiftNumber !== null &&
            Number(h.shiftNumber || 1) !==
            Number(shiftNumber)
        ) {
            return;
        }


        const amount =
            Number(
                h.amount ??
                h.finalAmount ??
                0
            );


        const seconds =
            Number(
                h.playSeconds ??
                h.finalSeconds ??
                0
            );


        const type =
            String(
                h.playType || "frame"
            ).toLowerCase();


if (type === "century") {

    centuries++;
    centuryAmount += amount;
    centuryTime += seconds;

} else {

    frames += getFrameCount(h);
    frameAmount += amount;
    frameTime += seconds;

}

    });


    return {
        frames,
        frameAmount,
        frameTime,

        centuries,
        centuryAmount,
        centuryTime
    };
}


/* =====================================================
   ROOM DATA
===================================================== */

function getSnapshotRoomAmount(
    room,
    startMs,
    endMs,
    shiftNumber = null
) {

    let total = 0;


    (room.history || []).forEach(h => {

        const checkout =
            Number(h.checkout || 0);


        if (
            checkout < startMs ||
            checkout > endMs
        ) {
            return;
        }


        if (
            shiftNumber !== null &&
            Number(h.shiftNumber || 1) !==
            Number(shiftNumber)
        ) {
            return;
        }


        total += Number(
            h.amount ??
            h.finalAmount ??
            0
        );

    });


    return total;
}


/* =====================================================
   BUILD SNAPSHOT
===================================================== */

function buildRassonSnapshot(
    startMs,
    endMs,
    shiftNumber = null
) {

    let html = "";


    let totalFrames = 0;
    let totalFrameAmount = 0;
    let totalFrameTime = 0;

    let totalCenturies = 0;
    let totalCenturyAmount = 0;
    let totalCenturyTime = 0;


    /* =================================================
       TABLES
    ================================================= */

    const normalTables =
        tables
            .filter(t =>
                String(
                    t.tableType || "table"
                ).toLowerCase() !== "room"
            )
            .sort((a, b) => {

                const aNum =
                    parseInt(
                        String(a.name)
                            .replace(/\D/g, "")
                    ) || 999;

                const bNum =
                    parseInt(
                        String(b.name)
                            .replace(/\D/g, "")
                    ) || 999;

                return aNum - bNum;

            });


    normalTables.forEach(t => {

        const data =
            getSnapshotTableData(
                t,
                startMs,
                endMs,
                shiftNumber
            );


        totalFrames += data.frames;
        totalFrameAmount += data.frameAmount;
        totalFrameTime += data.frameTime;

        totalCenturies += data.centuries;
        totalCenturyAmount += data.centuryAmount;
        totalCenturyTime += data.centuryTime;


        html += `

        <div class="snapshot-table-card">

            <div class="snapshot-table-title">
                ${t.name}
            </div>


            <div class="snapshot-game-row frame-row">

                <div class="snapshot-game-type">
                    🎱 FRAMES
                </div>

                <div class="snapshot-stat">
                    <span>Total Frames</span>
                    <strong>
                        ${data.frames}
                    </strong>
                </div>

                <div class="snapshot-stat">
                    <span>Amount</span>
                    <strong>
                        ${snapshotMoney(
                            data.frameAmount
                        )}
                    </strong>
                </div>

                <div class="snapshot-stat">
                    <span>Total Time</span>
                    <strong>
                        ${snapshotTime(
                            data.frameTime
                        )}
                    </strong>
                </div>

            </div>


            <div class="snapshot-game-row century-row">

                <div class="snapshot-game-type">
                    👑 CENTURIES
                </div>

                <div class="snapshot-stat">
                    <span>Total Centuries</span>
                    <strong>
                        ${data.centuries}
                    </strong>
                </div>

                <div class="snapshot-stat">
                    <span>Amount</span>
                    <strong>
                        ${snapshotMoney(
                            data.centuryAmount
                        )}
                    </strong>
                </div>

                <div class="snapshot-stat">
                    <span>Total Time</span>
                    <strong>
                        ${snapshotTime(
                            data.centuryTime
                        )}
                    </strong>
                </div>

            </div>

        </div>

        `;

    });


    /* =================================================
       ROOMS
    ================================================= */

    const rooms =
        tables
            .filter(t =>
                String(
                    t.tableType || ""
                ).toLowerCase() === "room"
            )
            .sort((a, b) => {

                const aNum =
                    parseInt(
                        String(a.name)
                            .replace(/\D/g, "")
                    ) || 999;

                const bNum =
                    parseInt(
                        String(b.name)
                            .replace(/\D/g, "")
                    ) || 999;

                return aNum - bNum;

            });


    if (rooms.length) {

        html += `

        <div class="snapshot-section-title">
            🏠 ROOMS
        </div>

        <div class="snapshot-rooms">

        `;


        rooms.forEach(room => {

            const amount =
                getSnapshotRoomAmount(
                    room,
                    startMs,
                    endMs,
                    shiftNumber
                );


            html += `

            <div class="snapshot-room-card">

                <div class="snapshot-room-name">
                    ${room.name}
                </div>

                <div class="snapshot-room-amount">
                    ${snapshotMoney(amount)}
                </div>

            </div>

            `;

        });


        html += `</div>`;

    }


    /* =================================================
       DISCOUNT
    ================================================= */

    let discount = 0;


    tables.forEach(t => {

        (t.history || []).forEach(h => {

            const checkout =
                Number(h.checkout || 0);


            if (
                checkout < startMs ||
                checkout > endMs
            ) {
                return;
            }


            if (
                shiftNumber !== null &&
                Number(h.shiftNumber || 1) !==
                Number(shiftNumber)
            ) {
                return;
            }


            discount +=
                Number(h.discount || 0);

        });

    });


    /* =================================================
       EXISTING ACCOUNTING
       DON'T CHANGE FORMULA
    ================================================= */

    const accounting =
        calculateShiftSnapshot(
            startMs,
            endMs,
            shiftNumber
        );


    const easypaisa =
        Number(
            accounting.easypaisa || 0
        );

    const expenses =
    Number(
        accounting.expenses || 0
    );

const gameCollection =
    Number(
        accounting.gameCollection || 0
    );
  

    const closingCash =
        Number(
            accounting.closingCash || 0
        );


    /* =================================================
       OVERALL
    ================================================= */

    html += `

    <div class="snapshot-section-title">
        📊 OVERALL SUMMARY
    </div>


<div class="snapshot-overall">

    <div class="snapshot-overall-card income-total">

        <div class="snapshot-overall-title">
            💰 TOTAL INCOME
        </div>

        <strong>
            ${snapshotMoney(
                gameCollection
            )}
        </strong>

    </div>


    <div class="snapshot-overall-card discount-total">

        <div class="snapshot-overall-title">
            🎁 DISCOUNT
        </div>

        <strong>
            ${snapshotMoney(
                discount
            )}
        </strong>

    </div>


    <div class="snapshot-overall-card expense-total">

        <div class="snapshot-overall-title">
            💸 EXPENSE
        </div>

        <strong>
            ${snapshotMoney(
                expenses
            )}
        </strong>

    </div>


    <div class="snapshot-overall-card easypaisa-total">

        <div class="snapshot-overall-title">
            📲 EASYPAISA
        </div>

        <strong>
            ${snapshotMoney(
                easypaisa
            )}
        </strong>

    </div>


    <div class="snapshot-overall-card cash-total">

        <div class="snapshot-overall-title">
            💵 CLOSING CASH
        </div>

        <strong>
            ${snapshotMoney(
                closingCash
            )}
        </strong>

    </div>

</div>

    `;


    /* =================================================
       OPEN / CLOSE TIME
    ================================================= */

    const openText =
        startMs
            ? new Date(startMs)
                .toLocaleString(
                    "en-PK",
                    {
                        timeZone:
                            "Asia/Karachi"
                    }
                )
            : "—";


    const closeText =
        endMs
            ? new Date(endMs)
                .toLocaleString(
                    "en-PK",
                    {
                        timeZone:
                            "Asia/Karachi"
                    }
                )
            : "RUNNING";


    html += `

    <div class="snapshot-time-card">

        <div>
            <span>OPEN TIME</span>
            <strong>
                ${openText}
            </strong>
        </div>

        <div>
            <span>CLOSE TIME</span>
            <strong>
                ${closeText}
            </strong>
        </div>

    </div>

    `;


    return html;
}


/******************************************************
 * 🔥 OPEN SHIFT / DAY SNAPSHOT
 * SINGLE SHIFT — TWO STEP FLOW
 ******************************************************/

async function openShiftSummary() {

    const body =
        document.getElementById(
            "shiftSummaryBody"
        );

    const title =
        document.getElementById(
            "shiftSummaryTitle"
        );

    const confirmBtn =
        document.getElementById(
            "confirmShiftCloseBtn"
        );

    await rebuildHistoryFromSessions();

    const now = Date.now();

const startMs =
    Number(
        window.pendingDayCloseStartMs ||
        window.currentDayId
    ) || now;

    const endMs =
        now;


// =================================================
// 🔥 STEP 1 — SHIFT NOT CLOSED YET
// =================================================

if (
    !window.pendingDayCloseId &&
    !shift1
) {

    title.innerText =
        "SHIFT SNAPSHOT";

    if (confirmBtn) {

        confirmBtn.innerText =
            "Close Shift";

    }

    body.innerHTML =
        buildRassonSnapshot(
            startMs,
            endMs,
            1
        );

}


    // =================================================
    // 🔥 STEP 2 — SHIFT ALREADY CLOSED
    // =================================================

    else {

        title.innerText =
            "DAY CLOSE";

        if (confirmBtn) {

            confirmBtn.innerText =
                "Day Close";

        }

        body.innerHTML =
            buildRassonSnapshot(
                startMs,
                endMs,
                null
            );

    }


    showPopup(
        "shiftSummaryPopup"
    );
}
/******************************************************
 * 🔥 SHIFT 1 CLOSE
 *
 * IMPORTANT:
 * Shift Close = NEW OPERATIONAL DAY START
 *
 * Old day remains OPEN for:
 * EasyPaisa + Expenses
 *
 * Running sessions move to new day.
 ******************************************************/
async function closeShift() {

    // ==================================================
    // 🔒 DAY CLOSE PENDING HAI
    // SHIFT 1 DOBARA CLOSE NAHI HOGI
    // ==================================================

    if (
        window.pendingDayCloseId
    ) {

        alert(
            "Shift 1 already closed.\nDay Close is pending ❌"
        );

        return;
    }


    const oldDayId =
        Number(window.currentDayId);

    if (!oldDayId) {
        alert("Current day ID missing ❌");
        return;
    }


    // ==================================================
    // 🔒 CHECK SHIFT 1 ALREADY CLOSED
    // ==================================================

    const q = query(
        collection(window.db, "shifts"),
        where("branch", "==", BRANCH),
        where("shift_number", "==", 1),
        where("day_id", "==", oldDayId)
    );

    const snap =
        await getDocs(q);

    if (!snap.empty) {

        alert(
            "Shift 1 already closed ❌"
        );

        return;
    }


    // ==================================================
    // 🔴 UNPAID BILLS CHECK
    // ==================================================

    const unpaidBillsQuery =
        query(
            collection(window.db, "sessions"),
            where("branch", "==", BRANCH),
            where("day_id", "==", oldDayId)
        );

    const unpaidBillsSnap =
        await getDocs(unpaidBillsQuery);

    const unpaidBills = [];

    unpaidBillsSnap.forEach(docSnap => {

        const data =
            docSnap.data();

        if (data.is_deleted === true) {
            return;
        }

        // Running game ignore
        if (!data.end_time) {
            return;
        }

        if (data.paid === true) {
            return;
        }

        const total =
            Number(
                data.total_bill_amount ??
                (
                    Number(
                        data.final_game_amount ??
                        data.final_amount ??
                        0
                    ) +
                    Number(
                        data.canteen_total ??
                        data.canteen_amount ??
                        0
                    )
                )
            );

        const paid =
            Number(
                data.paid_amount ??
                data.amount_paid ??
                data.paidAmount ??
                0
            );

        if (total > paid) {

            unpaidBills.push({
                id: docSnap.id,
                table: data.table_id || "",
                player1: data.player1Name || "",
                player2: data.player2Name || "",
                balance: total - paid
            });

        }

    });


    if (unpaidBills.length > 0) {

        alert(
            "Unpaid bills exist. Please clear them before closing Shift 1 ❌"
        );

        return;
    }


    // ==================================================
    // ⏱ SHIFT CLOSE TIME
    // ==================================================

    const now =
        Date.now();

    let startMs =
        Number(oldDayId);

    if (!startMs || startMs < 1000000000000) {
        startMs = now;
    }


    // ==================================================
    // 🔥 REBUILD OLD DAY HISTORY
    // ==================================================

    await rebuildHistoryFromSessions();


    // ==================================================
    // 🔥 CALCULATE SHIFT 1 SNAPSHOT
    // ==================================================

    const shiftData =
        calculateShiftSnapshot(
            startMs,
            now
        );


    shift1 = {

        shift: 1,

        openTime:
            new Date(startMs).toLocaleString(
                "en-PK",
                {
                    timeZone:
                        "Asia/Karachi"
                }
            ),

        closeTime:
            new Date(now).toLocaleString(
                "en-PK",
                {
                    timeZone:
                        "Asia/Karachi"
                }
            ),

        startMs:
            startMs,

        endMs:
            now,

        ...shiftData

    };


    // ==================================================
    // 🔥 SAVE SHIFT 1
    // ==================================================

    const docRef =
        await addDoc(
            collection(
                window.db,
                "shifts"
            ),
            {

                tables:
                    tables.map(t => ({
                        table_id:
                            t.name,

                        total:
                            t.history.reduce(
                                (sum, h) =>
                                    sum +
                                    Number(
                                        h.total || 0
                                    ),
                                0
                            )
                    })),

                shift_number:
                    1,

                branch:
                    BRANCH,

                // 🔥 THIS BELONGS TO OLD DAY
                day_id:
                    oldDayId,

                open_time:
                    shift1.openTime,

                close_time:
                    shift1.closeTime,

                start_ms:
                    shift1.startMs,

                end_ms:
                    shift1.endMs,

                game_total:
                    shiftData.gameTotal,

                canteen_total:
                    shiftData.canteenTotal,

                game_collection:
                    shiftData.gameCollection,

                canteen_collection:
                    shiftData.canteenCollection,

                expenses:
                    shiftData.expenses,

                easypaisa:
                    shiftData.easypaisa,

                discount:
                    shiftData.discount || 0,

                closing_cash:
                    shiftData.closingCash,

                created_at:
                    new Date().toISOString()

            }
        );


    if (!docRef?.id) {

        alert(
            "Shift 1 save failed ❌"
        );

        return;
    }


    // ==================================================
    // 🔥 NOW CREATE NEW OPERATIONAL DAY
    // ==================================================

    const newDayId =
        Date.now();


    // ==================================================
    // 🔥 REMEMBER OLD DAY FOR DAY CLOSE
    // ==================================================

    window.pendingDayCloseId =
        oldDayId;

    window.pendingDayCloseStartMs =
        startMs;

    window.pendingShiftCloseMs =
        now;


    localStorage.setItem(
        "pendingDayCloseId",
        String(oldDayId)
    );

    localStorage.setItem(
        "pendingDayCloseStartMs",
        String(startMs)
    );

    localStorage.setItem(
        "pendingShiftCloseMs",
        String(now)
    );


    // ==================================================
    // 🔥 FIND CENTRAL CURRENT DAY
    // ==================================================

    const systemQ =
        query(
            collection(
                window.db,
                "system"
            ),
            where(
                "branch",
                "==",
                BRANCH
            ),
            where(
                "type",
                "==",
                "current_day"
            )
        );

    const systemSnap =
        await getDocs(systemQ);


    // ==================================================
    // 🔥 UPDATE CENTRAL DAY → NEW DAY
    // ==================================================

    for (
        const d of systemSnap.docs
    ) {

        await updateDoc(
            doc(
                window.db,
                "system",
                d.id
            ),
            {

                day_id:
                    newDayId,

                created_at:
                    new Date().toISOString(),

                // 🔥 OLD DAY STILL WAITING FOR DAY CLOSE
                pending_day_close:
                    true,

                pending_day_close_id:
                    oldDayId,

                pending_day_close_start_ms:
                    startMs,

                shift_closed_at:
                    now

            }
        );

    }


    // ==================================================
    // 🔥 MOVE ONLY OLD-DAY RUNNING SESSIONS
    // ==================================================

    const runningSessionsQuery =
        query(
            collection(
                window.db,
                "sessions"
            ),

            where(
                "branch",
                "==",
                BRANCH
            ),

            where(
                "day_id",
                "==",
                oldDayId
            ),

            where(
                "end_time",
                "==",
                null
            )
        );


    const runningSessionsSnap =
        await getDocs(
            runningSessionsQuery
        );


    for (
        const sessionDoc
        of runningSessionsSnap.docs
    ) {

        const sessionData =
            sessionDoc.data();


        if (
            sessionData.is_deleted === true
        ) {
            continue;
        }


        await updateDoc(
            doc(
                window.db,
                "sessions",
                sessionDoc.id
            ),
            {

                // 🔥 NEW OPERATIONAL DAY
                day_id:
                    newDayId,

                // 🔥 NEW DAY = SHIFT 1
                shift_number:
                    1,

                // 🔥 ORIGINAL CHECK-IN
                start_time:
                    sessionData.start_time,

                // 🔥 STILL RUNNING
                end_time:
                    null,

                carried_forward:
                    true,

                carried_from_day_id:
                    oldDayId,

                carried_at:
                    new Date().toISOString()

            }
        );


        console.log(
            "🔥 SHIFT CLOSE → CARRIED:",
            sessionData.table_id,
            oldDayId,
            "→",
            newDayId
        );

    }


    // ==================================================
    // 🔥 CURRENT OPERATIONAL DAY = NEW DAY
    // ==================================================

    window.currentDayId =
        newDayId;


    // ==================================================
    // 🔥 RESET LOCAL SHIFT STATE
    // ==================================================

    shift1 =
        null;


    // ==================================================
    // 🔥 KEEP RUNNING TABLES RUNNING
    // ==================================================

    tables.forEach(t => {

        if (t.isRunning) {

            // DO NOT RESET
            // timer continues

            return;
        }

        // Free table stays free
        t.history = [];

    });


    // ==================================================
    // 🔥 UI
    // ==================================================

    document.getElementById(
        "shiftCloseBtn"
    ).innerText =
        "Day Close";


    hidePopup(
        "shiftSummaryPopup"
    );


    renderTables();


    alert(
        "Shift 1 closed ✅ New operational day started."
    );


    await loadShiftsFromFirebase();

}

/******************************************************
 * 🔥 DAY CLOSE
 *
 * IMPORTANT:
 * New operational day was already created at Shift Close.
 *
 * Day Close ONLY finalizes the OLD day.
 *
 * It DOES NOT:
 * - create another day
 * - move running games
 * - reset running tables
 ******************************************************/
async function closeDay() {

    const oldDayId =
        Number(
            window.pendingDayCloseId
        );


    // ==================================================
    // 🔒 OLD DAY MUST EXIST
    // ==================================================

    if (!oldDayId) {

        alert(
            "No pending day is waiting for Day Close ❌"
        );

        return;
    }


    const oldDayStartMs =
        Number(
            window.pendingDayCloseStartMs
        );


    const shiftClosedMs =
        Number(
            window.pendingShiftCloseMs
        );


    const now =
        Date.now();


    // ==================================================
    // 🔒 CHECK DAY NOT ALREADY CLOSED
    // ==================================================

    const existingDayQuery =
        query(
            collection(
                window.db,
                "days"
            ),

            where(
                "branch",
                "==",
                BRANCH
            ),

            where(
                "day_id",
                "==",
                oldDayId
            )
        );


    const existingDaySnap =
        await getDocs(
            existingDayQuery
        );


    if (!existingDaySnap.empty) {

        alert(
            "This day is already closed ❌"
        );

        return;
    }


    // ==================================================
    // 🔥 GET SHIFT 1 SNAPSHOT
    // ==================================================

    const shiftQuery =
        query(
            collection(
                window.db,
                "shifts"
            ),

            where(
                "branch",
                "==",
                BRANCH
            ),

            where(
                "day_id",
                "==",
                oldDayId
            ),

            where(
                "shift_number",
                "==",
                1
            )
        );


    const shiftSnap =
        await getDocs(
            shiftQuery
        );


    if (shiftSnap.empty) {

        alert(
            "Shift 1 record not found ❌"
        );

        return;
    }


    let savedShift =
        null;


    shiftSnap.forEach(d => {

        if (!savedShift) {

            savedShift = {
                id: d.id,
                ...d.data()
            };

        }

    });


    // ==================================================
    // 🔥 CALCULATE ONLY EASYPAISA + EXPENSES
    // ADDED AFTER SHIFT CLOSE
    //
    // New games are NOT included here.
    // ==================================================

    let extraExpenses = 0;

    let extraEasyPaisa = 0;


    // ==================================================
    // 🔥 EXPENSES AFTER SHIFT CLOSE
    // ==================================================

    if (
        Array.isArray(
            firebaseExpenses
        )
    ) {

        extraExpenses =
            firebaseExpenses
                .filter(e => {

                    let time = 0;


                    if (
                        e.created_at?.seconds
                    ) {

                        time =
                            e.created_at.seconds *
                            1000;

                    }
                    else if (
                        e.created_at
                    ) {

                        time =
                            new Date(
                                e.created_at
                            ).getTime();

                    }


                    return (
                        time >
                        shiftClosedMs
                        &&
                        time <=
                        now
                    );

                })
                .reduce(
                    (
                        sum,
                        e
                    ) =>
                        sum +
                        Number(
                            e.amount || 0
                        ),
                    0
                );

    }


    // ==================================================
    // 🔥 EASYPAISA AFTER SHIFT CLOSE
    // ==================================================

    if (
        Array.isArray(
            firebaseEasy
        )
    ) {

        extraEasyPaisa =
            firebaseEasy
                .filter(e => {

                    let time = 0;


                    if (
                        e.created_at?.seconds
                    ) {

                        time =
                            e.created_at.seconds *
                            1000;

                    }
                    else if (
                        e.created_at
                    ) {

                        time =
                            new Date(
                                e.created_at
                            ).getTime();

                    }


                    return (
                        time >
                        shiftClosedMs
                        &&
                        time <=
                        now
                    );

                })
                .reduce(
                    (
                        sum,
                        e
                    ) =>
                        sum +
                        Number(
                            e.amount || 0
                        ),
                    0
                );

    }


    // ==================================================
    // 🔥 OLD DAY FINAL ACCOUNTING
    // ==================================================

    const finalExpenses =
        Number(
            savedShift.expenses || 0
        ) +
        extraExpenses;


    const finalEasyPaisa =
        Number(
            savedShift.easypaisa || 0
        ) +
        extraEasyPaisa;


    const finalClosingCash =
        (
            Number(
                savedShift.gameCollection || 0
            )
            +
            Number(
                savedShift.canteenCollection || 0
            )
        )
        -
        finalExpenses
        -
        finalEasyPaisa;


    // ==================================================
    // 🔥 FINAL COMBINED SNAPSHOT
    // ==================================================

    const finalCombined = {

        gameTotal:
            Number(
                savedShift.game_total || 0
            ),

        canteenTotal:
            Number(
                savedShift.canteen_total || 0
            ),

        gameCollection:
            Number(
                savedShift.game_collection || 0
            ),

        canteenCollection:
            Number(
                savedShift.canteen_collection || 0
            ),

        gameBalance:
            Number(
                savedShift.game_total || 0
            ) -
            Number(
                savedShift.game_collection || 0
            ),

        canteenBalance:
            Number(
                savedShift.canteen_total || 0
            ) -
            Number(
                savedShift.canteen_collection || 0
            ),

        expenses:
            finalExpenses,

        easypaisa:
            finalEasyPaisa,

        discount:
            Number(
                savedShift.discount || 0
            ),

        closingCash:
            finalClosingCash

    };


    // ==================================================
    // 🔥 DAY SNAPSHOT
    //
    // IMPORTANT:
    // Current tables may contain NEW DAY games.
    //
    // Therefore DO NOT save current tables.history
    // as old day history.
    //
    // Old-day session history is reconstructed separately.
    // ==================================================

    await rebuildSpecificDayHistory(
        oldDayId
    );


    const safeTables =
        tables.map(t => ({

            table_id:
                t.name,

            history:
                Array.isArray(
                    t.history
                )
                    ? t.history.map(
                        h => ({
                            ...h
                        })
                    )
                    : []

        }));


    // ==================================================
    // 🔥 SAVE OLD DAY
    // ==================================================

    await addDoc(
        collection(
            window.db,
            "days"
        ),
        {

            tables:
                safeTables,

            date:
                new Date(
                    oldDayStartMs
                ).toLocaleDateString(
                    "en-CA"
                ),

            // 🔥 OLD DAY ID
            day_id:
                oldDayId,

            branch:
                BRANCH,

            shift:
                "day",

            shift1:
                savedShift,

            combined:
                finalCombined,

            day_closed_at:
                new Date().toISOString(),

            created_at:
                new Date().toISOString()

        }
    );


    // ==================================================
    // 🔥 MARK CURRENT SYSTEM DAY
    //
    // DO NOT CREATE NEW DAY HERE.
    // New day is already active.
    // ==================================================

    const systemQ =
        query(
            collection(
                window.db,
                "system"
            ),

            where(
                "branch",
                "==",
                BRANCH
            ),

            where(
                "type",
                "==",
                "current_day"
            )
        );


    const systemSnap =
        await getDocs(
            systemQ
        );


    for (
        const d of systemSnap.docs
    ) {

        await updateDoc(
            doc(
                window.db,
                "system",
                d.id
            ),
            {

                pending_day_close:
                    false,

                pending_day_close_id:
                    null,

                pending_day_close_start_ms:
                    null,

                shift_closed_at:
                    null,

                day_closed_at:
                    new Date().toISOString()

            }
        );

    }


    // ==================================================
    // 🔥 CLEAR PENDING OLD DAY
    // ==================================================

    window.pendingDayCloseId =
        null;

    window.pendingDayCloseStartMs =
        null;

    window.pendingShiftCloseMs =
        null;


    localStorage.removeItem(
        "pendingDayCloseId"
    );

    localStorage.removeItem(
        "pendingDayCloseStartMs"
    );

    localStorage.removeItem(
        "pendingShiftCloseMs"
    );


    // ==================================================
    // 🔥 CURRENT DAY REMAINS NEW DAY
    // ==================================================

    // DO NOT CHANGE:
    // window.currentDayId


    document.getElementById(
        "shiftCloseBtn"
    ).innerText =
        "Shift Close";


    hidePopup(
        "shiftSummaryPopup"
    );


    renderTables();


    alert(
        "Day closed successfully ✅"
    );

}



/******************************************************
 * SHIFT HELPERS
 ******************************************************/
function getGameTotal() {
    return tables.reduce((sum, t) => sum + t.liveAmount, 0);
}

function getTotalCollection() {
    return tables.reduce((sum, t) => sum + (t.liveAmount + t.canteenTotal), 0);
}

function calculateShiftSnapshot(startTime, endTime) {

    let gameTotal = 0;
    let canteenTotal = 0;
    let gameCollection = 0;
    let canteenCollection = 0;
    let gameBalance = 0;
    let canteenBalance = 0;
    let discount = 0;

    tables.forEach(t => {
        t.history.forEach(h => {

let originalGame =
Number(h.originalAmount || h.amount || 0);

let finalGame =
originalGame - Number(h.discount || 0);

let c = Number(h.canteenAmount || 0);

let d = Number(h.discount || 0);
 if (h.checkout >= startTime && h.checkout <= endTime) {
discount += d;

            // =========================
            // 🔥 TOTAL (checkout based)
            // =========================

              gameTotal += originalGame;
              
              canteenTotal += c;

                // ❗ UNPAID → balance
              // 🔥 ONLY UNPAID BILLS GO TO BALANCE
              if (!h.paid) {
              
                 gameBalance += Number(h.amount || 0);
              
                 canteenBalance += Number(h.canteenAmount || 0);
              }
            }

            // =========================
            // 🔥 COLLECTION (paidTime based)
            // =========================
            if (h.paid && h.paidTime) {
        if (h.paidTime >= (startTime - 1000) && h.paidTime <= endTime) {

       gameCollection += finalGame;
        canteenCollection += c;
        }
      }

        });
    });

    // =========================
    // 🔥 EXPENSES
    // =========================
    let expenses = firebaseExpenses
    .filter(e => {

        let time = 0;

        if (e.created_at?.seconds) {
            time = e.created_at.seconds * 1000;
        } else if (e.created_at) {
            time = new Date(e.created_at).getTime();
        }

        return time >= startTime && time <= endTime;
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    // =========================
    // 🔥 EASYPAISA
    // =========================
  let easypaisa = firebaseEasy
    .filter(e => {

        let time = 0;

        if (e.created_at?.seconds) {
            time = e.created_at.seconds * 1000;
        } else if (e.created_at) {
            time = new Date(e.created_at).getTime();
        }

        return time >= startTime && time <= endTime;
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);


  // ======================================
// 🔥 ADD RUNNING TABLE LIVE AMOUNT
// ======================================

tables.forEach(t => {

    if(!t.isRunning) return;

    let liveAmount = Number(t.liveAmount || 0);

    if(liveAmount > 0){

        gameTotal += liveAmount;

        gameBalance += liveAmount;

    }

});

    // =========================
    // 🔥 FINAL BALANCE FIX
    // =========================
    let closingCash = (gameCollection + canteenCollection) - expenses - easypaisa;

    return {
        gameTotal,
        canteenTotal,
        gameCollection,
        canteenCollection,
        gameBalance,
        canteenBalance,
        expenses,
        easypaisa,
        discount,
        closingCash
    };
}


/******************************************************
 * 🔥 REFRESH CURRENT DAY HISTORY — SINGLE SHIFT
 ******************************************************/
async function refreshCurrentDayHistory(dayId = null) {

    try {

        console.log(
            "🔥 Refreshing current day history..."
        );

        window.historyData = [];
        window.combinedHistoryData = [];

        // 🔥 CURRENT DAY
        dayId =
            dayId ||
            window.currentDayId;

        const q = query(
            collection(window.db, "days"),
            where("branch", "==", BRANCH),
            where("day_id", "==", Number(dayId))
        );

        const snap =
            await getDocs(q);

        if (snap.empty) {

            console.log(
                "⏳ Day history not created yet:",
                dayId
            );

            return;
        }

        // 🔥 REBUILD TABLE HISTORY
        await rebuildSpecificDayHistory(
            dayId
        );

        // 🔥 GET SINGLE SHIFT
        const shiftsQ = query(
            collection(window.db, "shifts"),
            where("branch", "==", BRANCH),
            where("day_id", "==", Number(dayId))
        );

        const shiftsSnap =
            await getDocs(shiftsQ);

        let latestShift1 = null;

        shiftsSnap.forEach(
            docSnap => {

                const d =
                    docSnap.data();

                if (
                    d.shift_number === 1
                ) {

                    latestShift1 = d;

                }

            }
        );

        if (!latestShift1) {

            console.log(
                "⚠️ Shift data missing"
            );

            return;
        }

        // 🔥 RECALCULATE SINGLE SHIFT
        const newShift1 =
            calculateShiftSnapshot(
                latestShift1.start_ms,
                latestShift1.end_ms
            );

        // 🔥 TABLE SNAPSHOT
        const tablesSnapshot =
            tables.map(t => ({

                table_id:
                    t.name,

                history:
                    t.history.map(
                        h => ({
                            ...h
                        })
                    )

            }));

        // 🔥 UPDATE DAY HISTORY
        for (
            const d of snap.docs
        ) {

            await updateDoc(
                doc(
                    window.db,
                    "days",
                    d.id
                ),
                {

                    tables:
                        tablesSnapshot,

                    shift1: {
                        ...latestShift1,
                        ...newShift1
                    },

                    // 🔥 SINGLE SHIFT
                    shift:
                        {
                            ...latestShift1,
                            ...newShift1
                        },

                    // 🔥 NO SHIFT 2
                    combined:
                        {
                            ...newShift1
                        }

                }
            );

        }

        // 🔥 UPDATE LIVE SHIFT
        shift1 = {
            ...shift1,
            ...newShift1
        };

        console.log(
            "✅ Single shift history updated"
        );

        await loadShiftsFromFirebase();

        // 🔥 REFRESH DAY HISTORY CACHE
        const latestDaysQ =
            query(
                collection(
                    window.db,
                    "days"
                ),
                where(
                    "branch",
                    "==",
                    BRANCH
                )
            );

        const latestDaysSnap =
            await getDocs(
                latestDaysQ
            );

        window._daysData = [];

        latestDaysSnap.forEach(
            docSnap => {

                window._daysData.push(
                    docSnap.data()
                );

            }
        );

    } catch (err) {

        console.error(
            "❌ refreshCurrentDayHistory:",
            err
        );

    }
}


/******************************************************
 * HISTORY BUTTON BINDING
 ******************************************************/
function bindHistoryButtons() {

    // DAY HISTORY
    document.getElementById("dayHistoryBtn").onclick = openDayHistory;

    // 🔥 ADD THIS LINE (MAIN FIX)
    document.getElementById("tableHistoryBtn").onclick = openTableHistory;

    document.getElementById("cancelDayHistoryBtn").onclick =
        () => hidePopup("dayHistoryPopup");
    document.getElementById("cancelTableHistoryBtn").onclick =
        () => hidePopup("tableHistoryPopup");

    document.addEventListener("click", function(e) {

        if (e.target && e.target.id === "printDayHistoryBtn") {

            let index = document.getElementById("dayHistoryDateSelect").selectedIndex;
            let d = window._daysData[index];

            if (!d) {
                alert("No data found ❌");
                return;
            }

            printDayHistoryThermal(d);
        }

        if (e.target && e.target.id === "printTableHistoryBtn") {

            let tableId = document.getElementById("tableHistoryTableSelect").value;
            let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;

            if (!tableId || dayIndex < 0) {
                alert("Select table & date first ❌");
                return;
            }

            printTableHistoryThermal();
        }

    });
}
/******************************************************
 * 🟢 OPEN DAY HISTORY POPUP
 ******************************************************/
async function openDayHistory() {

  const forceRefreshDay =
    localStorage.getItem("forceRefreshClosedDay");

if (forceRefreshDay) {

    console.log(
        "🔄 Force refreshing closed day:",
        forceRefreshDay
    );

    await refreshCurrentDayHistory(forceRefreshDay);

    localStorage.removeItem(
        "forceRefreshClosedDay"
    );
}

    const q = query(
        collection(window.db, "days"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    let sel = document.getElementById("dayHistoryDateSelect");
    sel.innerHTML = "";

    let days = [];

    snap.forEach(doc => {
    let d = doc.data();
    days.push(d);
});

// 🔥 SORT
days.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
});
  
  
// 🔥 AB DROPDOWN BANAO
days.forEach(d => {

  // ✅ OPERATIONAL DATE FIX
let operationalDate = d.shift1?.startMs
    ? new Date(d.shift1.startMs)
    : new Date(d.date);

    let openTime = d.shift1?.startMs 
        ? new Date(d.shift1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";



sel.innerHTML += `<option>${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime})</option>`;
});

    window._daysData = days;
  // 🔥 SAVE SELECTED CLOSED DAY
const daySelect =
document.getElementById(
    "dayHistoryDateSelect"
);

if (daySelect) {

    daySelect.onchange = () => {

        const index =
            daySelect.selectedIndex;

        const selectedDay =
            window._daysData[index];

        if (selectedDay?.day_id) {

            window.selectedClosedDayId =
                selectedDay.day_id;
        }
    };

    // 🔥 DEFAULT FIRST
    if (window._daysData[0]?.day_id) {

        window.selectedClosedDayId =
            window._daysData[0].day_id;
    }
}

loadDayHistorySnapshot();

document.getElementById("dayHistoryDateSelect").onchange =
    loadDayHistorySnapshot;

showPopup("dayHistoryPopup");
}


function loadDayHistorySnapshot() {

    const select =
        document.getElementById("dayHistoryDateSelect");

    const container =
        document.getElementById("dayHistorySnapshot");

    if (!select || !container) return;


    const index =
        select.selectedIndex;

    const d =
        window._daysData?.[index];

    if (!d) {

        container.innerHTML =
            `<div class="snapshot-empty">
                No day data found
             </div>`;

        return;
    }


let tables =
    Array.isArray(d.tables)
        ? [...d.tables]
        : [];

  // 🔥 FIXED DAY HISTORY DISPLAY ORDER
// TABLE 1 → TABLE 2 → ... → TABLE 9
// ROOM 1 → ROOM 2 → ROOM 3

tables.sort((a, b) => {

    function getOrder(item) {

        const name =
            String(item.table_id || "")
                .trim()
                .toLowerCase();

        const tableMatch =
            name.match(/^table\s*(\d+)/);

        if (tableMatch) {

            return Number(tableMatch[1]);

        }

        const roomMatch =
            name.match(/^room\s*(\d+)/);

        if (roomMatch) {

            return 100 + Number(roomMatch[1]);

        }

        return 999;

    }

    return getOrder(a) - getOrder(b);

});


    /* =====================================================
       HELPERS
    ===================================================== */

    function getType(h) {

        return String(
            h.selectedPlayType ??
            h.selected_play_type ??
            h.playType ??
            h.play_type ??
            ""
        )
        .toLowerCase()
        .trim();

    }


    function getRate(h) {

        return Number(
            h.selectedRate ??
            h.selected_rate ??
            h.frameRate ??
            h.frame_rate ??
            h.rate ??
            0
        );

    }


    function getAmount(h) {

        return Number(
            h.finalGameAmount ??
            h.final_game_amount ??
            h.finalAmount ??
            h.final_amount ??
            h.amount ??
            0
        );

    }


    function getSeconds(h) {

        return Number(
            h.finalSeconds ??
            h.final_seconds ??
            h.playSeconds ??
            h.play_seconds ??
            0
        );

    }


    function getFrameCount(h) {

        const type =
            getType(h);

        const rate =
            getRate(h);


        // Century is NOT a frame

        if (type === "century") {

            return 0;

        }


        // Double frame = 2

        if (
            rate === 200 ||
            type.includes("double")
        ) {

            return 2;

        }


        // Single frame = 1

        return 1;

    }


    function formatTime(seconds) {

        seconds =
            Number(seconds || 0);


        const hours =
            Math.floor(
                seconds / 3600
            );


        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );


        const secs =
            Math.floor(
                seconds % 60
            );


        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );

    }



    function formatDateTime(value) {

        if (!value) return "-";


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";

        }


        return date.toLocaleString(
            "en-PK",
            {
                timeZone: "Asia/Karachi",
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }


    /* =====================================================
       BUILD TABLE / ROOM CARDS
    ===================================================== */

    let html = "";


    tables.forEach(resource => {

        const resourceName =
            resource.table_id ||
            resource.name ||
            "";


        const history =
            Array.isArray(resource.history)
                ? resource.history
                : [];


        let frames = 0;
        let frameAmount = 0;
        let frameSeconds = 0;


        let centuries = 0;
        let centuryAmount = 0;
        let centurySeconds = 0;


        history.forEach(h => {

            const type =
                getType(h);


            const amount =
                getAmount(h);


            const seconds =
                getSeconds(h);


            if (
                type === "century"
            ) {

                centuries++;

                centuryAmount +=
                    amount;

                centurySeconds +=
                    seconds;

            } else {

                frames +=
                    getFrameCount(h);

                frameAmount +=
                    amount;

                frameSeconds +=
                    seconds;

            }

        });


        /* =================================================
           ROOM
        ================================================= */

        if (
            resourceName
                .toLowerCase()
                .startsWith("room")
        ) {

            const totalAmount =
                frameAmount +
                centuryAmount;


            html += `

                <div
                    class="shift-snapshot-card
                           day-history-resource-card"
                >

                    <div class="snapshot-card-title">

                        🏠
                        ${resourceName.toUpperCase()}

                    </div>


                    <div class="snapshot-grid room-total-grid">
                    
                        <div class="snapshot-item">
                    
                            <span>
                                Total Amount
                            </span>
                            <strong>
                                Rs ${formatMoney(
                                    totalAmount
                                )}
                            </strong>

                        </div>

                    </div>

                </div>

            `;

            return;

        }


        /* =================================================
           TABLE
        ================================================= */

        html += `

            <div
                class="shift-snapshot-card
                       day-history-resource-card"
            >

                <div class="snapshot-card-title">

                    🎱
                    ${resourceName.toUpperCase()}

                </div>


                <div class="snapshot-grid">


                    <div class="snapshot-item">

                        <span>
                            Frames
                        </span>

                        <strong>
                            ${frames}
                        </strong>

                    </div>


                    <div class="snapshot-item">

                        <span>
                            Frame Amount
                        </span>

                        <strong>
                            Rs ${formatMoney(
                                frameAmount
                            )}
                        </strong>

                    </div>


                    <div class="snapshot-item">

                        <span>
                            Frame Time
                        </span>

                        <strong>
                            ${formatTime(
                                frameSeconds
                            )}
                        </strong>

                    </div>


                    <div class="snapshot-item">

                        <span>
                            Centuries
                        </span>

                        <strong>
                            ${centuries}
                        </strong>

                    </div>


                    <div class="snapshot-item">

                        <span>
                            Century Amount
                        </span>

                        <strong>
                            Rs ${formatMoney(
                                centuryAmount
                            )}
                        </strong>

                    </div>


                    <div class="snapshot-item">

                        <span>
                            Century Time
                        </span>

                        <strong>
                            ${formatTime(
                                centurySeconds
                            )}
                        </strong>

                    </div>


                </div>

            </div>

        `;

    });


    /* =====================================================
       OVERALL
    ===================================================== */

    const combined =
        d.combined || {};


    const s1 =
        d.shift1 || {};


    const s2 =
        d.shift2 || {};


    const totalIncome =
        Number(
            combined.gameCollection ??
            (
                Number(
                    s1.gameCollection || 0
                ) +
                Number(
                    s2.gameCollection || 0
                )
            )
        );


    const discount =
        Number(
            combined.discount ??
            (
                Number(
                    s1.discount || 0
                ) +
                Number(
                    s2.discount || 0
                )
            )
        );


    const expense =
        Number(
            combined.expenses ??
            (
                Number(
                    s1.expenses || 0
                ) +
                Number(
                    s2.expenses || 0
                )
            )
        );


    const easypaisa =
        Number(
            combined.easypaisa ??
            (
                Number(
                    s1.easypaisa || 0
                ) +
                Number(
                    s2.easypaisa || 0
                )
            )
        );


    const closingCash =
        Number(
            combined.closingCash ??
            (
                totalIncome -
                discount -
                expense -
                easypaisa
            )
        );


    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    const openTime =
        formatDateTime(
            s1.startMs ||
            s1.start_ms
        );


    const closeTime =
        formatDateTime(
            s2.endMs ||
            s2.end_ms
        );


    /* =====================================================
       OVERALL CARD
    ===================================================== */

    html += `

        <div
            class="shift-snapshot-card
                   day-history-overall-card"
        >

            <div class="snapshot-card-title">

                💰 OVERALL

            </div>


            <div class="snapshot-grid">


                <div class="snapshot-item">

                    <span>
                        Total Income
                    </span>

                    <strong>
                        Rs ${formatMoney(
                            totalIncome
                        )}
                    </strong>

                </div>


                <div class="snapshot-item">

                    <span>
                        Discount
                    </span>

                    <strong>
                        Rs ${formatMoney(
                            discount
                        )}
                    </strong>

                </div>


                <div class="snapshot-item">

                    <span>
                        Expense
                    </span>

                    <strong>
                        Rs ${formatMoney(
                            expense
                        )}
                    </strong>

                </div>


                <div class="snapshot-item">

                    <span>
                        EasyPaisa
                    </span>

                    <strong>
                        Rs ${formatMoney(
                            easypaisa
                        )}
                    </strong>

                </div>


                <div
                    class="snapshot-item
                           snapshot-cash"
                >

                    <span>
                        Closing Cash
                    </span>

                    <strong>
                        Rs ${formatMoney(
                            closingCash
                        )}
                    </strong>

                </div>


            </div>


            <div class="snapshot-time">

                Open:
                <span>
                    ${openTime}
                </span>

                &nbsp; → &nbsp;

                Close:
                <span>
                    ${closeTime}
                </span>

            </div>

        </div>

    `;


    container.innerHTML =
        html;

}

/******************************************************
 * 🟢 OPEN TABLE HISTORY POPUP
 ******************************************************/
function openTableHistory() {

  if (!window._daysData || window._daysData.length === 0) {
    openDayHistory();

    setTimeout(() => {
        openTableHistory();
    }, 1000);

    return;
}

    let dateSel = document.getElementById("tableHistoryDateSelect");
    dateSel.innerHTML = "";

    // 🔥 Firebase day history use karo
    (window._daysData || []).forEach((d, i) => {

      // ✅ OPERATIONAL DATE FIX
let operationalDate = d.shift1?.startMs
    ? new Date(d.shift1.startMs)
    : new Date(d.date);
    
        let openTime = d.shift1?.startMs 
    ? new Date(d.shift1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
    : "-";



dateSel.innerHTML += `<option value="${i}">${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime})</option>`;
    });

let tableSel = document.getElementById("tableHistoryTableSelect");

const sortedHistoryTables = [...tables].sort((a, b) => {

    const getType = (name = "") => {

        const n = name
            .toLowerCase()
            .trim();

        if (n.startsWith("table")) return 1;
        if (n.startsWith("room")) return 2;
        if (n.startsWith("pool")) return 3;

        return 4;
    };

    const typeA = getType(a.name);
    const typeB = getType(b.name);

    // TABLE → ROOM → POOL
    if (typeA !== typeB) {
        return typeA - typeB;
    }

    // NUMBER ORDER
    const numA =
        parseInt(
            (a.name || "").match(/\d+/)?.[0] || 0
        );

    const numB =
        parseInt(
            (b.name || "").match(/\d+/)?.[0] || 0
        );

    return numA - numB;

});

tableSel.innerHTML = sortedHistoryTables
    .map(t =>
        `<option value="${t.id}">${t.name}</option>`
    )
    .join("");
    document.getElementById("tableHistoryBranch").innerText =
        "Branch: " + (BRANCH || "Rasson1");

loadSelectedTableHistory();

showPopup("tableHistoryPopup");

document.getElementById("tableHistoryDateSelect").onchange =
    loadSelectedTableHistory;

document.getElementById("tableHistoryTableSelect").onchange =
    loadSelectedTableHistory;
}

/*
 * RASSON ARENA — TABLE HISTORY FINAL FIX
 *
 * Add this block ONCE in tables.js, immediately BEFORE:
 *
 * function loadSelectedTableHistory() {
 *
 * This fixes the current "formatMoney is not defined" error and
 * also safely provides formatSeconds if it is not globally defined.
 * The latest Table History logic for frame counts, player names and
 * checkout-player highlighting remains unchanged.
 */

if (typeof window.formatMoney !== "function") {
    window.formatMoney = function (value) {
        return Number(value || 0).toLocaleString("en-PK");
    };
}

if (typeof window.formatSeconds !== "function") {
    window.formatSeconds = function (seconds) {

        seconds = Math.max(0, Number(seconds || 0));

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        return (
            String(h).padStart(2, "0") + ":" +
            String(m).padStart(2, "0") + ":" +
            String(s).padStart(2, "0")
        );
    };
}



/******************************************************
 * 🟢 LOAD TABLE HISTORY — FINAL
 * SAME DATA LOGIC AS HISTORY POPUP
 * Single Frame = 1
 * Double Frame = 2
 * Century = Century
 * Player names + checkout ⭐
 ******************************************************/
function loadSelectedTableHistory() {

    const tableSelect =
        document.getElementById("tableHistoryTableSelect");

    const dateSelect =
        document.getElementById("tableHistoryDateSelect");

    const body =
        document.getElementById("tableHistoryBody");

    if (!tableSelect || !dateSelect || !body) {
        console.error("❌ TABLE HISTORY HTML ELEMENT MISSING");
        return;
    }

    const tableId = tableSelect.value;

    const selectedTable =
        tables.find(
            t => String(t.id) === String(tableId)
        );

    if (!selectedTable) {
        body.innerHTML =
            `<tr><td colspan="11">No table selected.</td></tr>`;
        return;
    }

    const dayIndex =
        dateSelect.selectedIndex;

    const selectedDay =
        window._daysData?.[dayIndex];

    if (!selectedDay) {
        body.innerHTML =
            `<tr><td colspan="11">No history found.</td></tr>`;
        return;
    }

  window.loadSelectedTableHistory = loadSelectedTableHistory;

    /* ==================================================
       FIND TABLE DATA
    ================================================== */

    const tableData =
        (selectedDay.tables || []).find(
            t =>
                String(t.table_id || "")
                    .trim()
                    .toLowerCase() ===
                String(selectedTable.name || "")
                    .trim()
                    .toLowerCase()
        );

    const history =
        Array.isArray(tableData?.history)
            ? [...tableData.history]
            : [];


    /* ==================================================
       HELPERS
    ================================================== */

    const getType = (h) =>
        String(
            h.playType ??
            h.play_type ??
            h.selectedPlayType ??
            h.selected_play_type ??
            ""
        )
        .toLowerCase()
        .trim();


    const getRate = (h) =>
        Number(
            h.rate ??
            h.selectedRate ??
            h.selected_rate ??
            h.frameRate ??
            h.frame_rate ??
            0
        );


    const getAmount = (h) =>
        Number(
            h.amount ??
            h.finalGameAmount ??
            h.final_game_amount ??
            h.finalAmount ??
            h.final_amount ??
            0
        );


    const getSeconds = (h) =>
        Number(
            h.playSeconds ??
            h.play_seconds ??
            h.finalSeconds ??
            h.final_seconds ??
            0
        );


    const getDiscount = (h) =>
        Number(h.discount || 0);


    const getCanteen = (h) =>
        Number(
            h.canteenAmount ??
            h.canteen_total ??
            0
        );


    const getTotal = (h) =>
        Number(
            h.total ??
            (
                getAmount(h) +
                getCanteen(h)
            )
        );


    const isPaid = (h) =>
        h.paid === true ||
        h.paid === "true";


    const getFrameCount = (h) => {

        const type = getType(h);
        const rate = getRate(h);

        if (type === "century") {
            return 0;
        }

        if (
            rate === 200 ||
            type.includes("double")
        ) {
            return 2;
        }

        return 1;
    };


    const getTimeValue = (value) => {

        if (
            typeof value === "number" &&
            Number.isFinite(value)
        ) {
            return value;
        }

        const numeric =
            Number(value);

        if (
            Number.isFinite(numeric) &&
            numeric > 0
        ) {
            return numeric;
        }

        const parsed =
            Date.parse(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    };


    const getPlayer1 = (h) =>
        String(
            h.player1Name ??
            h.player1_name ??
            "Player 1"
        ).trim();


    const getPlayer2 = (h) =>
        String(
            h.player2Name ??
            h.player2_name ??
            "Player 2"
        ).trim();


    const getCheckoutPlayer = (h) =>
        String(
            h.checkoutPlayer ??
            h.checkout_player ??
            ""
        ).trim();


    const getCheckoutNumber = (h) => {

        const value =
            h.checkoutPlayerNumber ??
            h.checkout_player_number;

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        return Number(value);
    };


    const formatClock = (value) => {

        const ms =
            getTimeValue(value);

        if (!ms) return "-";

        return new Date(ms)
            .toLocaleTimeString(
                "en-PK",
                {
                    timeZone: "Asia/Karachi",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            );
    };


    const formatDuration = (seconds) => {

        seconds =
            Math.max(
                0,
                Number(seconds || 0)
            );

        const h =
            Math.floor(seconds / 3600);

        const m =
            Math.floor(
                (seconds % 3600) / 60
            );

        const s =
            Math.floor(seconds % 60);

        return (
            String(h).padStart(2, "0") +
            ":" +
            String(m).padStart(2, "0") +
            ":" +
            String(s).padStart(2, "0")
        );
    };


    const money = (value) =>
        Number(value || 0).toLocaleString("en-PK");


    /* ==================================================
       SHIFT FILTER
    ================================================== */

    const inShift = (h, shift) => {

        if (
            !shift ||
            !shift.startMs ||
            !shift.endMs
        ) {
            return false;
        }

        const checkin =
            getTimeValue(
                h.checkin ??
                h.check_in
            );

        const checkout =
            getTimeValue(
                h.checkout ??
                h.check_out
            );

        return (
            checkin >= Number(shift.startMs) &&
            checkout <= Number(shift.endMs)
        );
    };


    const shift1History =
        history.filter(
            h => inShift(h, selectedDay.shift1)
        );


    /* ==================================================
       TOTAL CALCULATOR
    ================================================== */

    const calculateTotals = (items) => {

        const result = {

            frames: 0,
            frameAmount: 0,
            frameTime: 0,

            centuries: 0,
            centuryAmount: 0,
            centuryTime: 0,

            paidFrames: 0,
            paidFrameAmount: 0,

            paidCenturies: 0,
            paidCenturyAmount: 0,
            paidCenturyTime: 0,

            unpaidFrames: 0,
            unpaidFrameAmount: 0,

            unpaidCenturies: 0,
            unpaidCenturyAmount: 0,
            unpaidCenturyTime: 0
        };


        items.forEach(h => {

            const type =
                getType(h);

            const amount =
                getAmount(h);

            const seconds =
                getSeconds(h);

            const paid =
                isPaid(h);


            if (type === "century") {

                result.centuries++;

                result.centuryAmount +=
                    amount;

                result.centuryTime +=
                    seconds;


                if (paid) {

                    result.paidCenturies++;

                    result.paidCenturyAmount +=
                        amount;

                    result.paidCenturyTime +=
                        seconds;

                } else {

                    result.unpaidCenturies++;

                    result.unpaidCenturyAmount +=
                        amount;

                    result.unpaidCenturyTime +=
                        seconds;
                }

            } else {

                const frames =
                    getFrameCount(h);

                result.frames +=
                    frames;

                result.frameAmount +=
                    amount;

                result.frameTime +=
                    seconds;


                if (paid) {

                    result.paidFrames +=
                        frames;

                    result.paidFrameAmount +=
                        amount;

                } else {

                    result.unpaidFrames +=
                        frames;

                    result.unpaidFrameAmount +=
                        amount;
                }
            }

        });

        return result;
    };


    const s1 =
        calculateTotals(
            shift1History
        );


    const allTotals =
        calculateTotals(history);


    /* ==================================================
       UPDATE SUMMARY CARDS
    ================================================== */

    const setText = (id, value) => {

        const el =
            document.getElementById(id);

        if (el) {
            el.textContent = value;
        }
    };


    /* TOTAL FRAMES */

    setText(
        "tableHistoryShift1Frame",
        s1.frames
    );


    setText(
        "tableHistoryTotalFrame",
        allTotals.frames
    );


    setText(
        "tableHistoryShift1FrameAmount",
        `Rs. ${money(s1.frameAmount)}`
    );


    setText(
        "tableHistoryTotalFrameAmount",
        `Rs. ${money(allTotals.frameAmount)}`
    );


    /* TOTAL CENTURY */

    setText(
        "tableHistoryShift1Century",
        s1.centuries
    );



    setText(
        "tableHistoryTotalCentury",
        allTotals.centuries
    );


    setText(
        "tableHistoryShift1CenturyAmount",
        `Rs. ${money(s1.centuryAmount)}`
    );

    setText(
        "tableHistoryTotalCenturyAmount",
        `Rs. ${money(allTotals.centuryAmount)}`
    );


    setText(
        "tableHistoryShift1CenturyTime",
        formatDuration(s1.centuryTime)
    );

    setText(
        "tableHistoryTotalCenturyTime",
        formatDuration(allTotals.centuryTime)
    );


    /* PAID FRAMES */

    setText(
        "tableHistoryShift1PaidFrame",
        s1.paidFrames
    );


    setText(
        "tableHistoryTotalPaidFrame",
        allTotals.paidFrames
    );


    setText(
        "tableHistoryShift1PaidFrameAmount",
        `Rs. ${money(s1.paidFrameAmount)}`
    );

    setText(
        "tableHistoryTotalPaidFrameAmount",
        `Rs. ${money(allTotals.paidFrameAmount)}`
    );


    /* PAID CENTURIES */

    setText(
        "tableHistoryShift1PaidCentury",
        s1.paidCenturies
    );

    setText(
        "tableHistoryTotalPaidCentury",
        allTotals.paidCenturies
    );


    setText(
        "tableHistoryShift1PaidCenturyAmount",
        `Rs. ${money(s1.paidCenturyAmount)}`
    );

    setText(
        "tableHistoryTotalPaidCenturyAmount",
        `Rs. ${money(allTotals.paidCenturyAmount)}`
    );


    setText(
        "tableHistoryShift1PaidCenturyTime",
        formatDuration(s1.paidCenturyTime)
    );

    setText(
        "tableHistoryTotalPaidCenturyTime",
        formatDuration(allTotals.paidCenturyTime)
    );


    /* UNPAID FRAMES */

    setText(
        "tableHistoryShift1UnpaidFrame",
        s1.unpaidFrames
    );

    setText(
        "tableHistoryTotalUnpaidFrame",
        allTotals.unpaidFrames
    );


    setText(
        "tableHistoryShift1UnpaidFrameAmount",
        `Rs. ${money(s1.unpaidFrameAmount)}`
    );

    setText(
        "tableHistoryTotalUnpaidFrameAmount",
        `Rs. ${money(allTotals.unpaidFrameAmount)}`
    );


    /* UNPAID CENTURIES */

    setText(
        "tableHistoryShift1UnpaidCentury",
        s1.unpaidCenturies
    );

    setText(
        "tableHistoryTotalUnpaidCentury",
        allTotals.unpaidCenturies
    );


    setText(
        "tableHistoryShift1UnpaidCenturyAmount",
        `Rs. ${money(s1.unpaidCenturyAmount)}`
    );

    setText(
        "tableHistoryTotalUnpaidCenturyAmount",
        `Rs. ${money(allTotals.unpaidCenturyAmount)}`
    );


    setText(
        "tableHistoryShift1UnpaidCenturyTime",
        formatDuration(s1.unpaidCenturyTime)
    );

    setText(
        "tableHistoryTotalUnpaidCenturyTime",
        formatDuration(allTotals.unpaidCenturyTime)
    );


    /* ==================================================
       SESSION DETAILS
    ================================================== */

    history.sort(
        (a, b) =>
            getTimeValue(
                b.checkin ??
                b.check_in
            ) -
            getTimeValue(
                a.checkin ??
                a.check_in
            )
    );


    if (!history.length) {

        body.innerHTML = `
            <tr>
                <td colspan="11">
                    No history found.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        history
            .map((h, index) => {

                const player1 =
                    getPlayer1(h);

                const player2 =
                    getPlayer2(h);

                const checkoutName =
                    getCheckoutPlayer(h);

                const checkoutNumber =
                    getCheckoutNumber(h);


                const player1Checkout =
                    checkoutNumber === 1 ||
                    (
                        checkoutName &&
                        player1 &&
                        checkoutName
                            .toLowerCase() ===
                        player1
                            .toLowerCase()
                    );


                const player2Checkout =
                    checkoutNumber === 2 ||
                    (
                        checkoutName &&
                        player2 &&
                        checkoutName
                            .toLowerCase() ===
                        player2
                            .toLowerCase()
                    );


                const player1HTML =
                    player1Checkout
                        ? `<span class="checkout-player-highlight">⭐ ${player1}</span>`
                        : `<span>${player1}</span>`;


                const player2HTML =
                    player2Checkout
                        ? `<span class="checkout-player-highlight">⭐ ${player2}</span>`
                        : `<span>${player2}</span>`;


                const playersHTML = `
                    <div class="table-history-player-line">
                        ${player1HTML}
                        <b>VS</b>
                        ${player2HTML}
                    </div>
                `;


                const amount =
                    getAmount(h);

                const discount =
                    getDiscount(h);

                const canteen =
                    getCanteen(h);

                const total =
                    getTotal(h);

                const seconds =
                    getSeconds(h);

                const rate =
                    getRate(h);


                const paid =
                    isPaid(h);


                return `
                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td class="players-cell">
                            ${playersHTML}
                        </td>

                        <td>
                            ${formatClock(
                                h.checkin ??
                                h.check_in
                            )}
                        </td>

                        <td>
                            ${formatClock(
                                h.checkout ??
                                h.check_out
                            )}
                        </td>

                        <td>
                            ${formatDuration(seconds)}
                        </td>

                        <td>
                            ${rate}
                        </td>

                        <td>
                            Rs ${money(amount)}
                        </td>

                        <td>
                            Rs ${money(discount)}
                        </td>

                        <td>
                            Rs ${money(canteen)}
                        </td>

                        <td>
                            Rs ${money(total)}
                        </td>

                        <td>
                            ${
                                paid
                                    ? `<span class="paid-btn">PAID</span>`
                                    : `<span class="unpaid-btn">UNPAID</span>`
                            }
                        </td>

                    </tr>
                `;

            })
            .join("");


    console.log(
        "✅ TABLE HISTORY FINAL:",
        selectedTable.name,
        {
            sessions: history.length,
            frames: allTotals.frames,
            centuries: allTotals.centuries
        }
    );
}
/******************************************************
 * 🟢 CALCULATE TABLE SUMMARY FOR SPECIFIC SHIFT
 ******************************************************/
function getTableShiftTotalsFromDay(t, shiftData) {

    if (!shiftData || !shiftData.startMs || !shiftData.endMs) {
        return { time: 0, game: 0, canteen: 0, total: 0 };
    }

    let start = shiftData.startMs;
    let end = shiftData.endMs;

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    t.history.forEach(h => {

        if (h.checkin >= start && h.checkout <= end) {

            total += Number(h.total || 0);
            game += Number(h.amount || 0);
            canteen += Number(h.canteenAmount || 0);
            time += Number(h.playSeconds || 0);
        }
    });

    return { total, game, canteen, time };
}



/******************************************************
 * TABLE HISTORY PAGINATION
 ******************************************************/

let historyPage = 1;
let historyPerPage = 100;

function renderHistoryPage() {

    const tableId =
        document.getElementById("tableHistoryTableSelect").value;

    const t =
        tables.find(x => String(x.id) === String(tableId));

    const body =
        document.getElementById("historyTableBody");

    if (!body) return;

    body.innerHTML = "";

    if (!t || !Array.isArray(t.history) || t.history.length === 0) {

        body.innerHTML =
            "<tr><td colspan='12'>No history found.</td></tr>";

        return;
    }

    let history = [...t.history];


    // ==========================================
    // LATEST FIRST
    // ==========================================

    history.sort(
        (a, b) =>
            Number(b.checkin || 0) -
            Number(a.checkin || 0)
    );

    // ==========================================
    // PAGINATION
    // ==========================================

    const start =
        (historyPage - 1) * historyPerPage;

    const end =
        start + historyPerPage;

    const pageRows =
        history.slice(start, end);

    // ==========================================
    // BUILD ROWS
    // ==========================================

    pageRows.forEach((h, index) => {

        // -------------------------------
        // PLAYER NAMES
        // -------------------------------

        const player1 =
            h.player1Name ||
            h.player1_name ||
            "Player 1";

        const player2 =
            h.player2Name ||
            h.player2_name ||
            "Player 2";

        // -------------------------------
        // CHECKOUT PLAYER
        // -------------------------------

        const checkoutNumber =
            Number(
                h.checkoutPlayerNumber ||
                h.checkout_player_number ||
                0
            );

        const checkoutName =
            h.checkoutPlayer ||
            h.checkout_player ||
            "";

        // -------------------------------
        // PLAYER 1 HTML
        // -------------------------------

        let player1HTML = "";

        if (checkoutNumber === 1) {

            player1HTML = `
                <span class="history-player checkout-player">
                    ⭐ ${player1}
                </span>
            `;

        } else {

            player1HTML = `
                <span class="history-player">
                    ${player1}
                </span>
            `;
        }

        // -------------------------------
        // PLAYER 2 HTML
        // -------------------------------

        let player2HTML = "";

        if (checkoutNumber === 2) {

            player2HTML = `
                <span class="history-player checkout-player">
                    ⭐ ${player2}
                </span>
            `;

        } else {

            player2HTML = `
                <span class="history-player">
                    ${player2}
                </span>
            `;
        }

        // -------------------------------
        // PLAYERS ROW
        // -------------------------------

        const playersHTML = `
            <div class="history-players">
                ${player1HTML}
                <b>VS</b>
                ${player2HTML}
            </div>
        `;

        // -------------------------------
        // PAID / UNPAID
        // -------------------------------

        const paidHTML =
            h.paid

            ? `<button
                    class="paid-btn"
                    disabled
               >
                    PAID
               </button>`

            : `<button
                    class="unpaid-btn"
                    onclick="openBillFromHistory(
                        '${tableId}',
                        ${start + index}
                    )"
               >
                    UNPAID
               </button>`;

        // -------------------------------
        // ROW
        // -------------------------------

        body.innerHTML += `
            <tr>

                <td>
                    ${start + index + 1}
                </td>

                <td class="history-player-cell">
                    ${playersHTML}
                </td>

                <td>
                    ${
                        h.checkin
                            ? new Date(
                                h.checkin
                              ).toLocaleTimeString()
                            : "-"
                    }
                </td>

                <td>
                    ${
                        h.checkout
                            ? new Date(
                                h.checkout
                              ).toLocaleTimeString()
                            : "-"
                    }
                </td>

                <td>
                    ${formatSeconds(
                        h.playSeconds || 0
                    )}
                </td>

                <td>
                    ${h.rate || 0}
                </td>

                <td>
                    ${formatMoney(
                        h.amount || 0
                    )}
                </td>

                <td>
                    ${formatMoney(
                        h.discount || 0
                    )}
                </td>

                <td>
                    ${formatMoney(
                        h.canteenAmount || 0
                    )}
                </td>

                <td>
                    ${formatMoney(
                        h.total || 0
                    )}
                </td>

                <td>
                    ${paidHTML}
                </td>

                <td>
                    -
                </td>

            </tr>
        `;
    });

    // ==========================================
    // PAGE NUMBER
    // ==========================================

    const pageNumber =
        document.getElementById("pageNumber");

    if (pageNumber) {
        pageNumber.innerText =
            historyPage;
    }
}

/******************************************************
 * 🟢 RESTORE TIMERS ON PAGE LOAD
 ******************************************************/
function restoreTimers() {

    tables.forEach(t => {

        if (t.isRunning) {
            runTimer(t.id);
        }

        updateDisplay(t.id);
        if (t.isRunning) {
    updateButtons(t.id, "running");
}
else if (t.afterCheckout) {
    updateButtons(t.id, "afterCheckout");   // ✅ FIX
}
else {
    updateButtons(t.id, "idle");
}
    });
}

// ===============================================
// AUTO SYNC OFFLINE QUEUE EVERY 5 SEC
// ===============================================



// ✅ FIX: HTML BUTTON ACCESS
window.checkIn = checkIn;
window.checkOut = checkOut;
window.openHistory = openHistory;
window.editTable = editTable;
window.deleteTableOpen = deleteTableOpen;
window.openCanteen = openCanteen;
window.openTableShift = openTableShift;
window.showBill = showBill;
window.handleRateChange = handleRateChange;
// 🔥 ADD THIS
window.addItem = addItem;
window.removeItem = removeItem;
window.openBillFromHistory = openBillFromHistory;
window.softDeleteSession = softDeleteSession;


//thernal bill print 
function printThermalBill(id, historyData = null) {

    let t = tables.find(x => String(x.id) === String(id));
    let h = historyData;
    if (!t) return;

    let academy = "Rasson Snooker Academy";
    let branch = BRANCH || "rasson1";

    let checkin = h ? formatTime(h.checkin) : (t.checkinTime ? formatTime(t.checkinTime) : "--");
    let checkout = h ? formatTime(h.checkout) : (t.checkoutTime ? formatTime(t.checkoutTime) : "--");
    let playtime = h ? formatSeconds(h.playSeconds) : formatSeconds(t.finalSeconds || t.playSeconds);

    let originalAmount =
Number(
h
? (h.originalAmount || h.amount)
: (t.finalAmount || t.liveAmount)
) || 0;

let discount =
Number(
h
? (h.discount || 0)
: (t.discount || 0)
);

let gameAmount =
originalAmount - discount;

    let itemsSource = h ? h.canteenItems : t.canteenItems;

    let canteenHTML = "";
    let canteenTotal = 0;

    Object.values(itemsSource || {}).forEach(item => {

        let qty = Number(item.qty) || 0;
        let price = Number(item.price) || 0;
        let total = qty * price;

        canteenTotal += total;

        canteenHTML += `
        <div class="row">
            <span>${item.name} x${qty}</span>
            <span>Rs ${total}</span>
        </div>`;
    });

    if (!canteenHTML) {
        canteenHTML = `<div class="center">No items</div>`;
    }

    let finalTotal = gameAmount + canteenTotal;

    let win = window.open("", "", "width=300,height=600");

    win.document.write(`
<html>
<head>
<style>
body {
    font-family: monospace;
    width: 260px;
    margin:auto;
    text-align:center;
}

.line {
    border-top:1px dashed #000;
    margin:6px 0;
}

.row {
    display:flex;
    justify-content:space-between;
}

.big {
    font-size:16px;
    font-weight:bold;
}

.logo {
    width:100px;
    margin-bottom:5px;
}
</style>
</head>

<body>

<img src="${window.location.origin}/assets/bill-logo.png" class="logo">

<div class="big">${academy.toUpperCase()}</div>
<div>${branch.toUpperCase()}</div>

<div class="line"></div>

<div class="row"><span>Table</span><span>${t.name}</span></div>
<div class="row">
    <span>Players</span>
    <span>
        ${h?.player1Name || h?.player1_name || t.player1Name || "Player 1"}
        VS
        ${h?.player2Name || h?.player2_name || t.player2Name || "Player 2"}
    </span>
</div>

<div class="row">
    <span>Game Off</span>
    <span>
        ${h?.checkout_player || h?.game_off_player || t.checkoutPlayer || "--"}
    </span>
</div>
<div class="row"><span>In</span><span>${checkin}</span></div>
<div class="row"><span>Out</span><span>${checkout}</span></div>
<div class="row"><span>Time</span><span>${playtime}</span></div>
<div class="row">
<span>Play Type</span>
<span>${h ? (h.playType || 'Frame') : (t.selectedPlayType || t.playType || 'frame')}</span>
</div>

<div class="row">
<span>Rate</span>
<span>Rs ${h ? (h.rate || 0) : (t.selectedRate || 0)}</span>
</div>

<div class="line"></div>

<div class="big">GAME</div>

<div>Original: Rs ${originalAmount}</div>

<div>Discount: Rs ${discount}</div>

<div>Final: Rs ${gameAmount}</div>

<div class="line"></div>

<div class="big">CANTEEN</div>

${canteenHTML}

<div class="line"></div>

<div class="big">TOTAL</div>
<div class="big">Rs ${finalTotal}</div>

<div class="line"></div>

<img src="${window.location.origin}/assets/QR-bill.png" width="90">
<br>
Scan & Pay

<div class="line"></div>

<div>Thanks ❤️</div>

<script>
window.onload = function(){

    window.print();

    setTimeout(() => {
        window.close();
    }, 800);

}
</script>

</body>
</html>
`);

    win.document.close();
}


async function restoreRunningTables() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH),
        where("end_time", "==", null)
    );

    const snap = await getDocs(q);

    snap.forEach(docSnap => {

        const s = docSnap.data();

        let t = tables.find(x => x.name === s.table_id);
        if (!t) return;

        let start = new Date(s.start_time).getTime();


        t.isRunning = true;
t.checkinTime = start;

// 🔥 IMPORTANT RESET
t.afterCheckout = false;

runTimer(t.id);
    });

    renderTables();
}



function listenRunningSessionsRealtime() {


    const q = query(
    collection(window.db, "sessions"),
    where("branch", "==", BRANCH),
    where("end_time", "==", null),
    where("is_deleted", "==", false)
);

    onSnapshot(q, (snapshot) => {

        // 🔄 reset all tables first
        let activeTables = new Set();

snapshot.forEach(docSnap => {
    const s = docSnap.data();
    activeTables.add(s.table_id);
});

tables.forEach(t => {

    if (t.afterCheckout) return;

    if (activeTables.has(t.name)) {
        t.isRunning = true;
    } else {
        t.isRunning = false;
    }

});
        snapshot.forEach(docSnap => {

            const s = docSnap.data();

            let t = tables.find(x => x.name === s.table_id);
            if (!t) return;

            let start = new Date(s.start_time).getTime();

            // ❌ AGAR CHECKOUT HO CHUKA HAI TO IGNORE
if (t.afterCheckout) return;

t.isRunning = true;
t.checkinTime = start;

runTimer(t.id);
        });

        renderTables();

// 🔥 FORCE STATE FROM SESSIONS
setTimeout(() => {

    tables.forEach(t => {

        // 🔥 AGAR SESSION ACTIVE HAI → FORCE RUNNING
        if (activeTables.has(t.name)) {
    t.isRunning = true;
} else {
    t.isRunning = false;
}

        updateDisplay(t.id);

        if (t.afterCheckout) {
            updateButtons(t.id, "afterCheckout");
        }
        else if (t.isRunning) {
            updateButtons(t.id, "running");
        }
        else {
            updateButtons(t.id, "idle");
        }

    });

}, 100);

}); // ✅ YE MISSING THA
}


// 🔥 REALTIME HISTORY SYNC
function listenHistoryRealtime() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    onSnapshot(q, async () => {

        console.log("🔥 HISTORY REALTIME UPDATE");

        // 🔥 REBUILD HISTORY
        await rebuildHistoryFromSessions();

        // 🔥 REFRESH UI
        renderTables();

        // 🔥 AGAR HISTORY POPUP OPEN HAI
        const popup =
            document.getElementById("historyPopup");

        if (
            popup &&
            !popup.classList.contains("hidden")
        ) {

            const title =
                document.getElementById("historyTableTitle")
                ?.innerText || "";

            const tableName =
                title.replace("History - ", "").trim();

            const table =
                tables.find(t => t.name === tableName);

            if (table) {
                openHistory(table.id);
            }
        }

    });
}


function printShiftThermal(title, data, s1 = {}, s2 = {}) {

    if (!data) {
        alert("No data to print ❌");
        return;
    }

    let win = window.open("", "_blank", "width=300,height=600");

    if (!win) {
        alert("Popup blocked ❌");
        return;
    }

    let html = `
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: monospace; width: 250px; margin:auto; }
            .center { text-align:center; }
            .row { display:flex; justify-content:space-between; }
            hr { border:1px dashed #000; }
            .small { font-size:12px; }
        </style>
    </head>
    <body>

        <div class="center">
            <h3>${title}</h3>
            <small>${BRANCH}</small>
        </div>

        <hr>

        <div>
            <b>Shift 1</b><br>
            <span class="small">
                ${s1.openTime || "-"} <br>
                → ${s1.closeTime || "-"}
            </span>
        </div>

        <hr>

        <div>
            <b>Shift 2</b><br>
            <span class="small">
                ${s2.openTime || "-"} <br>
                → ${s2.closeTime || "-"}
            </span>
        </div>

        <hr>

        <div class="row"><span>Game Total</span><span>${data.gameTotal || 0}</span></div>
        <div class="row"><span>Canteen</span><span>${data.canteenTotal || 0}</span></div>

        <hr>

        <div class="row"><span>Game Collection</span><span>${data.gameCollection || 0}</span></div>
        <div class="row"><span>Canteen Collection</span><span>${data.canteenCollection || 0}</span></div>

        <hr>

        <div class="row"><span>Expenses</span><span>${data.expenses || 0}</span></div>

        <hr>

        <div class="row"><b>Closing Cash</b><b>${data.closingCash || 0}</b></div>

        <hr>

        <div class="center">
          ${new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})}
        </div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    let checkReady = setInterval(() => {
        if (win.document.readyState === "complete") {
            clearInterval(checkReady);

            win.focus();

            setTimeout(() => {
            
                win.print();
            
                setTimeout(() => {
                    win.close();
                }, 800);
            
            }, 300);
        }
    }, 50);
}

/// day history thermal print

function printDayHistoryThermal(d) {

    const tablesData = Array.isArray(d.tables)
        ? d.tables
        : [];

    const s1 = d.shift1 || {};
    const s2 = d.shift2 || {};
    const c  = d.combined || {};


    // =====================================================
    // 🔥 TIME FORMAT
    // =====================================================

    const formatPrintTime = (ms) => {

        if (!ms) return "-";

        return new Date(ms).toLocaleTimeString(
            "en-PK",
            {
                timeZone: "Asia/Karachi",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }
        );
    };


    const openTime =
        formatPrintTime(s1.startMs);

    const closeTime =
        formatPrintTime(s2.endMs);


    // =====================================================
    // 🔥 FRAME COUNT
    // SINGLE = 1
    // DOUBLE = 2
    // CENTURY = 0
    // =====================================================

    const getPrintFrameCount = (h) => {

        const rate = Number(
            h.selectedRate ??
            h.selected_rate ??
            h.frameRate ??
            h.frame_rate ??
            h.rate ??
            0
        );

        const playType = String(
            h.selectedPlayType ??
            h.selected_play_type ??
            h.playType ??
            h.play_type ??
            ""
        ).toLowerCase().trim();


        // 👑 Century
        if (playType === "century") {
            return 0;
        }


        // 🎱 Double
        if (
            rate === 200 ||
            playType.includes("double")
        ) {
            return 2;
        }


        // 🎱 Single
        return 1;
    };


    // =====================================================
    // 🔥 BUILD TABLE / ROOM DATA
    // =====================================================

    const buildResourceData = (resource) => {

        let frames = 0;
        let frameAmount = 0;
        let frameTime = 0;

        let centuries = 0;
        let centuryAmount = 0;
        let centuryTime = 0;

        const history =
            Array.isArray(resource.history)
                ? resource.history
                : [];


        history.forEach(h => {

            const type = String(
                h.selectedPlayType ??
                h.selected_play_type ??
                h.playType ??
                h.play_type ??
                ""
            ).toLowerCase().trim();


            const amount = Number(
                h.amount ??
                h.finalGameAmount ??
                h.final_game_amount ??
                h.finalAmount ??
                h.final_amount ??
                0
            );


            const seconds = Number(
                h.playSeconds ??
                h.finalSeconds ??
                h.final_seconds ??
                0
            );


            // 👑 CENTURY
            if (type === "century") {

                centuries += 1;

                centuryAmount += amount;

                centuryTime += seconds;

            }

            // 🎱 FRAME
            else {

                frames +=
                    getPrintFrameCount(h);

                frameAmount += amount;

                frameTime += seconds;
            }

        });


        // 🏠 ROOM
        if (
            String(resource.table_type || resource.tableType)
                .toLowerCase() === "room"
            ||
            String(resource.name || resource.table_id)
                .toLowerCase()
                .startsWith("room")
        ) {

            return {
                type: "room",
                name:
                    resource.name ||
                    resource.table_id ||
                    "Room",

                amount:
                    frameAmount +
                    centuryAmount
            };
        }


        // 🎱 TABLE
        return {

            type: "table",

            name:
                resource.name ||
                resource.table_id ||
                "Table",

            frames,

            frameAmount,

            frameTime,

            centuries,

            centuryAmount,

            centuryTime

        };

    };


    // =====================================================
    // 🔥 SORT
    // TABLE 1 → TABLE 9 → ROOM 1 → ROOM 2 → ROOM 3
    // =====================================================

    const resources =
        tablesData
            .map(buildResourceData)
            .sort((a, b) => {

                const getOrder = (name) => {

                    const n =
                        String(name)
                            .toLowerCase();

                    if (
                        n.startsWith("table")
                    ) return 1;

                    if (
                        n.startsWith("room")
                    ) return 2;

                    return 3;
                };


                const typeA =
                    getOrder(a.name);

                const typeB =
                    getOrder(b.name);


                if (
                    typeA !== typeB
                ) {
                    return typeA - typeB;
                }


                const numA =
                    Number(
                        (
                            String(a.name)
                                .match(/\d+/)
                            || [0]
                        )[0]
                    );


                const numB =
                    Number(
                        (
                            String(b.name)
                                .match(/\d+/)
                            || [0]
                        )[0]
                    );


                return numA - numB;

            });


    // =====================================================
    // 🔥 RESOURCE HTML
    // =====================================================

    let resourceHTML = "";


    resources.forEach(r => {

        if (r.type === "room") {

            resourceHTML += `

                <div class="section-title">
                    ${r.name.toUpperCase()}
                </div>

                <div class="row">
                    <span>Amount</span>
                    <span>Rs ${r.amount}</span>
                </div>

                <div class="line"></div>

            `;

            return;
        }


        resourceHTML += `

            <div class="section-title">
                ${r.name.toUpperCase()}
            </div>

            <div class="row">
                <span>Frames</span>
                <span>${r.frames}</span>
            </div>

            <div class="row">
                <span>Frame Amount</span>
                <span>Rs ${r.frameAmount}</span>
            </div>

            <div class="row">
                <span>Frame Time</span>
                <span>${formatSeconds(r.frameTime)}</span>
            </div>

            <div class="row">
                <span>Centuries</span>
                <span>${r.centuries}</span>
            </div>

            <div class="row">
                <span>Century Amount</span>
                <span>Rs ${r.centuryAmount}</span>
            </div>

            <div class="row">
                <span>Century Time</span>
                <span>${formatSeconds(r.centuryTime)}</span>
            </div>

            <div class="line"></div>

        `;

    });


    // =====================================================
    // 🔥 OVERALL
    // =====================================================

    const totalIncome =
        Number(c.gameCollection || 0);

    const discount =
        Number(c.discount || 0);

    const expenses =
        Number(c.expenses || 0);

    const easypaisa =
        Number(c.easypaisa || 0);

    const closingCash =
        Number(c.closingCash || 0);


    // =====================================================
    // 🔥 PRINT WINDOW
    // =====================================================

    const win =
        window.open(
            "",
            "_blank",
            "width=320,height=900"
        );


    if (!win) {

        alert("Popup blocked ❌");

        return;
    }


    // =====================================================
    // 🔥 THERMAL HTML
    // =====================================================

    const html = `

<html>

<head>

<title>Day Snapshot</title>

<style>

@page {
    size: 80mm auto;
    margin: 0;
}

* {
    box-sizing: border-box;
}

body {

    width: 72mm;

    margin: 0 auto;

    padding: 5px 0;

    font-family:
        "Courier New",
        monospace;

    color: #000;

    background: #fff;

    font-size: 12px;

    line-height: 1.35;

}

.center {

    text-align: center;

}

.title {

    font-size: 18px;

    font-weight: 900;

    margin-bottom: 2px;

}

.subtitle {

    font-size: 15px;

    font-weight: 900;

}

.date {

    font-size: 12px;

    margin-top: 4px;

}

.line {

    border-top:
        1px dashed #000;

    margin: 7px 0;

}

.row {

    display: flex;

    justify-content:
        space-between;

    gap: 8px;

    margin: 3px 0;

}

.row span:first-child {

    text-align: left;

}

.row span:last-child {

    text-align: right;

    font-weight: 700;

}

.section-title {

    text-align: center;

    font-size: 14px;

    font-weight: 900;

    margin-top: 8px;

    margin-bottom: 4px;

}

.overall {

    font-size: 13px;

}

.overall .total-income {

    font-weight: 900;

}

.overall .closing {

    font-size: 16px;

    font-weight: 900;

    margin-top: 5px;

}

.small {

    font-size: 11px;

}

</style>

</head>


<body>


<div class="center">

    <div class="title">
        RASSON SNOOKER ARENA
    </div>

    <div class="subtitle">
        DAY SNAPSHOT
    </div>

    <div class="date">
        ${d.date || "-"}
    </div>

</div>


<div class="line"></div>


<div class="row">

    <span>Open Time</span>

    <span>${openTime}</span>

</div>


<div class="row">

    <span>Close Time</span>

    <span>${closeTime}</span>

</div>


<div class="line"></div>


${resourceHTML}


<div class="section-title">
    OVERALL
</div>


<div class="line"></div>


<div class="overall">

    <div class="row total-income">

        <span>TOTAL INCOME</span>

        <span>
            Rs ${totalIncome}
        </span>

    </div>


    <div class="row">

        <span>DISCOUNT</span>

        <span>
            Rs ${discount}
        </span>

    </div>


    <div class="row">

        <span>EXPENSE</span>

        <span>
            Rs ${expenses}
        </span>

    </div>


    <div class="row">

        <span>EASYPAISA</span>

        <span>
            Rs ${easypaisa}
        </span>

    </div>


    <div class="line"></div>


    <div class="row closing">

        <span>CLOSING CASH</span>

        <span>
            Rs ${closingCash}
        </span>

    </div>

</div>


<div class="line"></div>


<div class="center small">

    ${new Date().toLocaleString(
        "en-PK",
        {
            timeZone:
                "Asia/Karachi"
        }
    )}

</div>


</body>

</html>

`;


    win.document.open();

    win.document.write(html);

    win.document.close();


    setTimeout(() => {

        win.focus();

        win.print();

        setTimeout(() => {

            win.close();

        }, 800);

    }, 400);

}


// ============================================================
// TABLE HISTORY — THERMAL PRINT
// SAME DATA / FRAME LOGIC AS TABLE HISTORY POPUP
// ============================================================

function printTableHistoryThermal() {

    const tableId =
        document.getElementById("tableHistoryTableSelect")?.value;

    const dayIndex =
        document.getElementById("tableHistoryDateSelect")?.selectedIndex;

    const t =
        tables.find(x => String(x.id) === String(tableId));

    const d =
        window._daysData?.[dayIndex];

    if (!t || !d) {
        alert("No data found ❌");
        return;
    }

    const tableData =
        d.tables?.find(
            tb => String(tb.table_id) === String(t.name)
        );

    const history =
        Array.isArray(tableData?.history)
            ? [...tableData.history]
            : [];


    // ============================================================
    // SAME FRAME COUNT LOGIC AS POPUP
    // ============================================================

    const getFrameCount = (h) => {

        return Number(
            h.frame_count ??
            h.frameCount ??
            h.frames ??
            (
                String(
                    h.play_type ??
                    h.playType ??
                    h.selected_play_type ??
                    h.selectedPlayType ??
                    ""
                )
                .toLowerCase()
                .includes("double")
                    ? 2
                    : 1
            )
        ) || 1;

    };


    // ============================================================
    // PLAY TYPE
    // ============================================================

    const getPlayType = (h) => {

        return String(
            h.selected_play_type ??
            h.selectedPlayType ??
            h.play_type ??
            h.playType ??
            ""
        )
        .toLowerCase()
        .trim();

    };


    // ============================================================
    // PAID STATUS
    // ============================================================

    const isPaid = (h) => {

        return (
            h.paid === true ||
            h.paid === "true" ||
            h.status === "paid" ||
            h.payment_status === "paid"
        );

    };


    // ============================================================
    // SHIFT FILTER
    // SAME AS POPUP
    // ============================================================

    const inShift = (h, shift) => {

        if (!shift?.startMs || !shift?.endMs) {
            return false;
        }

        return (
            Number(h.checkin || 0) >= Number(shift.startMs) &&
            Number(h.checkout || 0) <= Number(shift.endMs)
        );

    };


    const shift1 = d.shift1 || {};
    const shift2 = d.shift2 || {};


    // ============================================================
    // SUMMARY
    // ============================================================

    const summary = {

        frames: 0,
        centuries: 0,

        paidFrames: 0,
        unpaidFrames: 0,

        paidCenturies: 0,
        unpaidCenturies: 0,

        game: 0,
        canteen: 0,
        total: 0,
        time: 0

    };


    // ============================================================
    // SESSION DETAILS
    // ============================================================

    const sessionHistory = [];


    history.forEach(h => {

        const belongsToShift1 =
            inShift(h, shift1);

        const belongsToShift2 =
            inShift(h, shift2);


        // SAME FILTER AS POPUP
        if (!belongsToShift1 && !belongsToShift2) {
            return;
        }


        const type =
            getPlayType(h);


        const amount =
            Number(
                h.final_game_amount ??
                h.final_amount ??
                h.amount ??
                h.game_amount ??
                0
            );


        const canteen =
            Number(
                h.canteenAmount ??
                h.canteen_amount ??
                0
            );


        const total =
            Number(
                h.total ??
                h.final_total ??
                (amount + canteen)
            );


        const playSeconds =
            Number(
                h.playSeconds ??
                h.final_seconds ??
                h.finalSeconds ??
                0
            );


        const paid =
            isPaid(h);


        // ========================================================
        // FRAME / CENTURY SUMMARY
        // ========================================================

        if (
            type === "century" ||
            type === "centuries"
        ) {

            summary.centuries += 1;

            if (paid) {
                summary.paidCenturies += 1;
            }
            else {
                summary.unpaidCenturies += 1;
            }

        }

        else {

            const frameCount =
                getFrameCount(h);

            summary.frames += frameCount;

            if (paid) {
                summary.paidFrames += frameCount;
            }
            else {
                summary.unpaidFrames += frameCount;
            }

        }


        summary.game += amount;
        summary.canteen += canteen;
        summary.total += total;
        summary.time += playSeconds;


        // ========================================================
        // SAVE SESSION FOR PRINT
        // ========================================================

        sessionHistory.push({
            ...h,

            amount,
            canteen,
            total,
            playSeconds,
            paid
        });

    });


    // ============================================================
    // SORT SESSION DETAILS BY CHECK-IN
    // ============================================================

    sessionHistory.sort(
        (a, b) =>
            Number(a.checkin || 0) -
            Number(b.checkin || 0)
    );


    // ============================================================
    // HELPERS
    // ============================================================

    const money = (value) =>
        Number(value || 0).toLocaleString("en-PK");


    const safe = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");


    // ============================================================
    // SESSION ROWS
    // ============================================================

    let sessionRows = "";


    sessionHistory.forEach((h, index) => {

        const player1 =
            h.player1Name ||
            h.player1_name ||
            "Player 1";


        const player2 =
            h.player2Name ||
            h.player2_name ||
            "Player 2";


        const checkoutNumber =
            Number(
                h.checkoutPlayerNumber ??
                h.checkout_player_number ??
                0
            );


        const player1Html =
            checkoutNumber === 1
                ? `
                    <span class="checkout-player">
                        ⭐ ${safe(player1)}
                    </span>
                  `
                : safe(player1);


        const player2Html =
            checkoutNumber === 2
                ? `
                    <span class="checkout-player">
                        ⭐ ${safe(player2)}
                    </span>
                  `
                : safe(player2);


        const playersHtml = `
            <div class="players">
                ${player1Html}
                <span class="vs">VS</span>
                ${player2Html}
            </div>
        `;


        const checkin =
            h.checkin
                ? formatTime(h.checkin)
                : "--";


        const checkout =
            h.checkout
                ? formatTime(h.checkout)
                : "--";


        const playTime =
            formatSeconds(
                h.playSeconds || 0
            );


        const rate =
            Number(
                h.rate ??
                h.selected_rate ??
                0
            );


        const discount =
            Number(
                h.discount || 0
            );


        const paidText =
            h.paid
                ? "✓ PAID"
                : "UNPAID";


        const paidClass =
            h.paid
                ? "paid"
                : "unpaid";


        sessionRows += `

            <div class="session">

                <div class="session-number">
                    #${index + 1}
                </div>

                ${playersHtml}

                <div class="row">
                    <span>Check-in</span>
                    <span>${safe(checkin)}</span>
                </div>

                <div class="row">
                    <span>Checkout</span>
                    <span>${safe(checkout)}</span>
                </div>

                <div class="row">
                    <span>Play Time</span>
                    <span>${safe(playTime)}</span>
                </div>

                <div class="row">
                    <span>Rate</span>
                    <span>Rs ${money(rate)}</span>
                </div>

                <div class="row">
                    <span>Amount</span>
                    <span>Rs ${money(h.amount)}</span>
                </div>

                <div class="row">
                    <span>Discount</span>
                    <span>Rs ${money(discount)}</span>
                </div>

                <div class="row">
                    <span>Canteen</span>
                    <span>Rs ${money(h.canteen)}</span>
                </div>

                <div class="row total-row">
                    <span>Total</span>
                    <span>Rs ${money(h.total)}</span>
                </div>

                <div class="payment ${paidClass}">
                    ${paidText}
                </div>

            </div>

        `;

    });


    // ============================================================
    // PRINT WINDOW
    // ============================================================

    const win =
        window.open(
            "",
            "_blank",
            "width=350,height=900"
        );


    if (!win) {

        alert(
            "Please allow popups for printing ❌"
        );

        return;

    }


    // ============================================================
    // THERMAL PRINT HTML
    // ============================================================

    const html = `

<html>

<head>

<title>
Table History - ${safe(t.name)}
</title>


<style>

@page {
    size: 80mm auto;
    margin: 0;
}


* {
    box-sizing: border-box;
}


html,
body {

    width: 80mm;

    margin: 0;
    padding: 0;

    background: #fff;
    color: #000;

    font-family:
        "Courier New",
        monospace;

}


body {

    width: 72mm;

    margin: 0 auto;

    padding: 5px 0;

    font-size: 12px;

    line-height: 1.35;

}


.center {
    text-align: center;
}


.title {

    font-size: 19px;

    font-weight: 900;

}


.branch {

    font-size: 14px;

    font-weight: 900;

}


.table-name {

    font-size: 16px;

    font-weight: 900;

}


.date {

    font-size: 12px;

    margin-top: 2px;

}


.line {

    border-top:
        1px dashed #000;

    margin:
        7px 0;

}


.section {

    text-align: center;

    font-size: 14px;

    font-weight: 900;

    margin:
        6px 0;

}


.row {

    display: flex;

    justify-content:
        space-between;

    gap: 8px;

    margin:
        3px 0;

}


.row span:first-child {
    text-align: left;
}


.row span:last-child {

    text-align: right;

    font-weight: 700;

}


.summary-row {

    font-size: 12px;

}


.summary-total {

    font-size: 15px;

    font-weight: 900;

}


.session {

    border:
        1px solid #000;

    padding:
        6px;

    margin:
        6px 0;

    break-inside:
        avoid;

    page-break-inside:
        avoid;

}


.session-number {

    text-align: center;

    font-weight: 900;

    font-size: 13px;

    border-bottom:
        1px solid #000;

    padding-bottom:
        3px;

    margin-bottom:
        4px;

}


.players {

    text-align: center;

    font-weight: 900;

    margin:
        4px 0 6px;

    white-space: nowrap;

}


.players .vs {

    margin:
        0 6px;

}


.checkout-player {

    background:
        #d4af37;

    color:
        #000;

    padding:
        2px 5px;

    border-radius:
        3px;

    font-weight:
        900;

}


.total-row {

    border-top:
        1px dashed #000;

    padding-top:
        4px;

    font-weight:
        900;

}


.payment {

    text-align:
        center;

    font-weight:
        900;

    border:
        1px solid #000;

    margin-top:
        5px;

    padding:
        2px;

}


.payment.paid {

    font-weight:
        900;

}


.payment.unpaid {

    font-weight:
        900;

}


.big-total {

    text-align:
        center;

    font-size:
        18px;

    font-weight:
        900;

}


.footer {

    text-align:
        center;

    font-size:
        10px;

    margin-top:
        8px;

}


</style>

</head>


<body>


<!-- HEADER -->

<div class="center">

    <div class="title">
        TABLE HISTORY
    </div>

    <div class="branch">
        ${safe(BRANCH).toUpperCase()}
    </div>

    <div class="table-name">
        ${safe(t.name)}
    </div>

    <div class="date">
        ${safe(d.date || "-")}
    </div>

</div>


<div class="line"></div>


<!-- SUMMARY -->

<div class="section">
    SUMMARY
</div>


<div class="row summary-row">
    <span>TOTAL FRAMES</span>
    <span>${summary.frames}</span>
</div>


<div class="row summary-row">
    <span>TOTAL CENTURY</span>
    <span>${summary.centuries}</span>
</div>


<div class="row summary-row">
    <span>PAID FRAMES</span>
    <span>${summary.paidFrames}</span>
</div>


<div class="row summary-row">
    <span>PAID CENTURY</span>
    <span>${summary.paidCenturies}</span>
</div>


<div class="row summary-row">
    <span>UNPAID FRAMES</span>
    <span>${summary.unpaidFrames}</span>
</div>


<div class="row summary-row">
    <span>UNPAID CENTURY</span>
    <span>${summary.unpaidCenturies}</span>
</div>


<div class="line"></div>


<div class="section">
    AMOUNT
</div>


<div class="row summary-row">
    <span>GAME</span>
    <span>Rs ${money(summary.game)}</span>
</div>


<div class="row summary-row">
    <span>CANTEEN</span>
    <span>Rs ${money(summary.canteen)}</span>
</div>


<div class="row summary-total">
    <span>TOTAL</span>
    <span>Rs ${money(summary.total)}</span>
</div>


<div class="row">
    <span>PLAY TIME</span>
    <span>${formatSeconds(summary.time)}</span>
</div>


<div class="line"></div>


<!-- SESSION DETAILS -->

<div class="section">
    SESSION DETAILS
</div>


${sessionRows || `
    <div class="center">
        No session details found
    </div>
`}


<div class="line"></div>


<div class="big-total">

    TOTAL<br>

    Rs ${money(summary.total)}

</div>


<div class="line"></div>


<div class="footer">

    ${new Date().toLocaleString(
        "en-PK",
        {
            timeZone:
                "Asia/Karachi"
        }
    )}

</div>


</body>

</html>

`;


    win.document.open();

    win.document.write(html);

    win.document.close();


    setTimeout(() => {

        win.focus();

        win.print();

        setTimeout(() => {

            win.close();

        }, 800);

    }, 400);

}


async function rebuildHistoryFromSessions() {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    // 🔥 RESET ALL HISTORY
    tables.forEach(t => t.history = []);

    snap.forEach(docSnap => {

        const s = docSnap.data();
      // 🔥 skip deleted
if (s.is_deleted === true) {
    return;
}

        console.log("🔥 SESSION:", s);

        // ❌ ignore running sessions
        if (!s.end_time) return;

        const currentDayId = String(window.currentDayId || "").trim();
        const sessionDayId = String(s.day_id || "").trim();

        // ✅ current day filter
// old sessions without day_id bhi allow karo

if (sessionDayId && sessionDayId !== currentDayId) {
    return;
}

let t = tables.find(x => x.name === s.table_id);

if (!t) {
    console.log("⛔ TABLE NOT FOUND:", s.table_id);
    return;
}

// 🔥 EXACT FIREBASE SESSION ID
const sessionId = docSnap.id;

// 🔥 DUPLICATE SESSION PROTECTION
const alreadyExists = t.history.some(
    h => String(h.sessionId) === String(sessionId)
);

if (alreadyExists) {
    console.warn(
        "⚠️ DUPLICATE SESSION SKIPPED:",
        sessionId,
        t.name
    );
    return;
}

t.history.push({

    // 🔥 VERY IMPORTANT
    sessionId: sessionId,

    // 🔥 SHIFT
    shiftNumber:
        Number(s.shift_number || 1),

    checkin:
        new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),

            playSeconds: s.final_seconds || 0,
            originalAmount:
s.original_game_amount ||
s.final_amount ||
0,

discount:
s.discount || 0,

amount:
s.final_game_amount ||
s.final_amount ||
0,

            canteenAmount: s.canteen_total || 0,

            total: (s.final_amount || 0) + (s.canteen_total || 0),

            paid: s.paid === true,

            paidTime: s.paid_time
                ? new Date(s.paid_time).getTime()
                : null,

rate:
    s.selected_rate ||
    (
        s.play_type === "century"
            ? s.century_rate
            : s.frame_rate
    ),

playType:
    s.selected_play_type ||
    s.play_type ||
    "frame",

  // 🔥 PLAYERS
player1Name:
    s.player1_name || "",

player2Name:
    s.player2_name || "",

checkoutPlayer:
    s.checkout_player || "",

checkoutPlayerNumber:
    s.checkout_player_number || null,

canteenItems: s.canteen_items || {}
        });

        console.log("✅ HISTORY PUSHED:", t.name);

    });

    console.log("🔥 ONLY TODAY HISTORY LOADED");
}

// 🔥 LOAD ALL HISTORY FOR DAY RECALC
async function rebuildSpecificDayHistory(dayId) {

    const q = query(
        collection(window.db, "sessions"),
        where("branch", "==", BRANCH)
    );

    const snap = await getDocs(q);

    // 🔥 RESET
    tables.forEach(t => t.history = []);

    snap.forEach(docSnap => {

        const s = docSnap.data();

        // 🔥 SKIP DELETED
        if (s.is_deleted === true) return;

        // 🔥 SKIP RUNNING
        if (!s.end_time) return;

        // 🔥 IMPORTANT
        if (String(s.day_id) !== String(dayId)) return;

        let t = tables.find(x => x.name === s.table_id);

        if (!t) return;

        t.history.push({

          sessionId: docSnap.id,

            checkin: new Date(s.start_time).getTime(),
            checkout: new Date(s.end_time).getTime(),

            playSeconds: s.final_seconds || 0,
            originalAmount:
s.original_game_amount ||
s.final_amount ||
0,

discount:
s.discount || 0,

amount:
s.final_game_amount ||
s.final_amount ||
0,

            canteenAmount: s.canteen_total || 0,

            total:
                (s.final_amount || 0)
                + (s.canteen_total || 0),

            paid: s.paid === true,

            paidTime: s.paid_time
                ? new Date(s.paid_time).getTime()
                : null,

rate:
    s.selected_rate ||
    (
        s.play_type === "century"
        ? s.century_rate
        : s.frame_rate
    ),

playType:
    s.selected_play_type ||
    s.play_type ||
    "frame",


          // 🔥 PLAYERS
player1Name:
    s.player1_name || "",

player2Name:
    s.player2_name || "",

checkoutPlayer:
    s.checkout_player || "",

checkoutPlayerNumber:
    s.checkout_player_number || null,

          
            canteenItems: s.canteen_items || {}
        });

    });

    console.log("✅ SPECIFIC DAY HISTORY LOADED:", dayId);
}


/******************************************************
 * SOFT DELETE SESSION
 ******************************************************/
async function softDeleteSession(tableId, historyIndex) {

   if (ROLE !== "admin" && ROLE !== "superadmin") {
        alert("Only admin can delete ❌");
        return;
    }


    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;

    let h = t.history[historyIndex];

    if (!h) return;

    try {

        const q = query(
    collection(window.db, "sessions"),
    where("table_id", "==", t.name),
    where("branch", "==", BRANCH)
);

        const snap = await getDocs(q);

        let targetSession = null;
let smallestDiff = Infinity;

snap.forEach(d => {

    const data = d.data();

    // 🔥 skip already deleted
    if (data.is_deleted === true) {
        return;
    }

    // ❌ skip running session
    if (!data.end_time) return;

    // 🔥 DAY FILTER
    const firebaseDayId = String(data.day_id || "").trim();
    const historyDayId = String(window.currentDayId || "").trim();

    // old sessions allow
    if (firebaseDayId && firebaseDayId !== historyDayId) {
        return;
    }

    const startDiff = Math.abs(
        new Date(data.start_time).getTime() - h.checkin
    );

    const endDiff = Math.abs(
        new Date(data.end_time).getTime() - h.checkout
    );

    const totalDiff = startDiff + endDiff;

    if (totalDiff < smallestDiff) {

        smallestDiff = totalDiff;

        targetSession = d;
    }
});
      console.log("🔥 TARGET SESSION:", targetSession?.data());
console.log("🔥 HISTORY:", h);

        if (!targetSession) {
            alert("Session not found ❌");
            return;
        }

        // 🔥 SOFT DELETE
        await updateDoc(
            doc(window.db, "sessions", targetSession.id),
            {
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: ROLE
            }
        );

        // 🔥 LOCAL REMOVE
        t.history.splice(historyIndex, 1);



      

    } catch (err) {

        console.error("❌ Delete failed:", err);

        alert("Delete failed ❌");
    }
}
 

function playWarningBeep() {

    try {

        // 🔊 Har alarm ke liye NEW audio object
        const alarmAudio =
            new Audio("/assets/audio/warning.mp3");

        alarmAudio.preload = "auto";
        alarmAudio.volume = 1;

        const playPromise = alarmAudio.play();

        if (playPromise !== undefined) {

            playPromise
                .then(() => {

                    console.log("🔊 Warning beep played");

                })
                .catch(err => {

                    console.log(
                        "⚠️ Warning sound blocked:",
                        err
                    );

                });
        }

        // Sound khatam hone ke baad memory release
        alarmAudio.addEventListener(
            "ended",
            () => {
                alarmAudio.remove();
            },
            { once: true }
        );

    } catch (err) {

        console.log(
            "⚠️ Warning audio error:",
            err
        );
    }
}
// 🔥 USER INTERACTION ENABLE

window.userInteracted = false;

document.addEventListener("pointerdown", () => {
    window.userInteracted = true;
    unlockAudio();
});

document.addEventListener("keydown", () => {
    window.userInteracted = true;
    unlockAudio();
});

function showTable15MinuteAlert(t) {

    if (!t) return;

    const tableBox =
        document.querySelector(
            `button[onclick="checkIn('${t.id}')"]`
        )?.closest(".table-box");

    if (!tableBox) return;

    // Purana alert hatao
    const oldAlert =
        tableBox.querySelector(".table-15-alert");

    if (oldAlert) {
        oldAlert.remove();
    }

    // 🔔 NEW ALERT
    const alertBox =
        document.createElement("div");

    alertBox.className = "table-15-alert";

    alertBox.innerHTML = `
        🔔 ATTENTION<br>
        <strong>${t.name}</strong><br>
        <span>${Math.floor(t.playSeconds / 60)} MINUTES</span>
    `;

    tableBox.appendChild(alertBox);

    // 5 seconds baad sirf ye message remove
    setTimeout(() => {

        alertBox.remove();

    }, 5000);
}



function showTableWarning(id) {

    const el =
    document.getElementById(
        `warning-${id}`
    );

    const textEl =
    document.getElementById(
        `warning-text-${id}`
    );

    const table =
    tables.find(
        t => String(t.id) === String(id)
    );

    if (el) {
        el.classList.remove("hidden");
    }

    if (textEl && table) {

        if (table.tableType === "room") {

            textEl.innerText =
            "⚠️ ROOM TIME ALERT";

        } else {

            textEl.innerText =
            "⚠️ GRACE TIME";
        }
    }
}

function hideTableWarning(id) {

    const el =
    document.getElementById(
        `warning-${id}`
    );

    if (el) {
        el.classList.add("hidden");
    }
}

function playTableVoice(message) {

    try {

        window.speechSynthesis.cancel();

        const msg =
        new SpeechSynthesisUtterance(
            message
        );

        msg.volume = 1;

        // 🔥 Slow & clear voice
        msg.rate = 0.7;

        msg.pitch = 1;

        window.speechSynthesis.speak(msg);

    } catch (err) {

        console.log("Voice error:", err);
    }
}


let audioUnlocking = false;

function unlockAudio() {

    if (audioUnlocked) return;
    if (audioUnlocking) return;

    audioUnlocking = true;

    try {

        // Browser ke audio engine ko initialize karo
        if (!warningAudio) {

            warningAudio =
                new Audio("/assets/audio/warning.mp3");

            warningAudio.preload = "auto";
        }

        warningAudio.volume = 0;

        const playPromise =
            warningAudio.play();

        if (playPromise !== undefined) {

            playPromise
                .then(() => {

                    audioUnlocked = true;
                    audioUnlocking = false;

                    console.log(
                        "✅ Audio unlocked"
                    );

                })
                .catch(err => {

                    audioUnlocking = false;

                    console.log(
                        "⚠️ Audio unlock failed:",
                        err
                    );

                });
        }

    } catch (err) {

        audioUnlocking = false;

        console.log(
            "⚠️ Audio unlock error:",
            err
        );
    }
}
//fix deployment issues

// ==========================================
// 👤 PLAYER HISTORY - FINAL CLEAN VERSION
// ==========================================

window.openPlayerHistory = async function () {

    const popup =
        document.getElementById("playerHistoryPopup");

    if (!popup) {
        console.error("❌ PLAYER HISTORY POPUP NOT FOUND");
        return;
    }

    popup.classList.remove("hidden");

    console.log("✅ PLAYER HISTORY OPENED");

    await loadPlayerHistory();
};


// ==========================================
// 🔥 LOAD PLAYER HISTORY
// ==========================================

async function loadPlayerHistory() {

    const body =
        document.getElementById("playerHistoryBody");

    const input =
        document.getElementById("playerSearchInput");

    if (!body || !input) {
        console.error("❌ PLAYER HISTORY ELEMENTS NOT FOUND");
        return;
    }

    const search =
        input.value
            .trim()
            .toLowerCase();


    body.innerHTML = `
        <tr>
            <td colspan="8">
                Loading...
            </td>
        </tr>
    `;


    try {

        const q = query(
            collection(window.db, "sessions"),
            where("branch", "==", BRANCH)
        );


        const snap =
            await getDocs(q);


        let html = "";
        let count = 0;


        snap.forEach(docSnap => {

            const h =
                docSnap.data();


            // Deleted sessions skip
            if (h.is_deleted === true) {
                return;
            }


            // ======================================
            // PLAYER NAMES
            // ======================================

            const player1 =
                h.player1_name ||
                h.player1Name ||
                h.player1 ||
                "";

            const player2 =
                h.player2_name ||
                h.player2Name ||
                h.player2 ||
                "";


            const checkoutPlayer =
                h.checkout_player ||
                h.game_off_player ||
                "";


            // ======================================
            // SEARCH
            // ======================================

            const p1 =
                String(player1)
                    .toLowerCase();

            const p2 =
                String(player2)
                    .toLowerCase();

            const cp =
                String(checkoutPlayer)
                    .toLowerCase();


            if (
                search &&
                !p1.includes(search) &&
                !p2.includes(search) &&
                !cp.includes(search)
            ) {
                return;
            }


            count++;


            // ======================================
            // DATE
            // ======================================

            let date = "-";


            if (h.start_time) {

                const d =
                    new Date(h.start_time);

                if (!isNaN(d.getTime())) {

                    date =
                        d.toLocaleDateString(
                            "en-PK",
                            {
                                timeZone:
                                    "Asia/Karachi"
                            }
                        );
                }
            }


            // ======================================
            // PLAY TYPE
            // ======================================

            const play =
                h.selected_play_type ||
                h.selectedPlayType ||
                h.play_type ||
                h.playType ||
                "-";


            // ======================================
            // AMOUNT
            // ======================================

            const amount =
                Number(
                    h.final_amount ??
                    h.final_game_amount ??
                    h.total ??
                    0
                );


            // ======================================
            // STATUS
            // ======================================

            const status =
                h.paid === true
                    ? "Paid"
                    : "Unpaid";


            // ======================================
            // ROW
            // ======================================

            html += `
                <tr>

                    <td>${count}</td>

                    <td>${date}</td>

                    <td>
                        ${player1 || "-"}
                    </td>

                    <td>
                        ${player2 || "-"}
                    </td>

                    <td>
                        ${h.table_id || "-"}
                    </td>

                    <td>
                        ${play}
                    </td>

                    <td>
                        Rs ${amount}
                    </td>

                    <td>
                        ${status}
                    </td>

                </tr>
            `;
        });


        // ======================================
        // NOTHING FOUND
        // ======================================

        if (count === 0) {

            html = `
                <tr>
                    <td colspan="8">
                        No player history found
                    </td>
                </tr>
            `;
        }


        body.innerHTML =
            html;


        console.log(
            "✅ PLAYER HISTORY RESULTS:",
            count
        );


    } catch (error) {

        console.error(
            "❌ PLAYER HISTORY ERROR:",
            error
        );


        body.innerHTML = `
            <tr>
                <td colspan="8">
                    Error Loading Data
                </td>
            </tr>
        `;
    }
}


// ==========================================
// 👤 PLAYER HISTORY EVENTS
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        const target =
            event.target;


        // ======================================
        // OPEN
        // ======================================

        if (
            target &&
            target.closest &&
            target.closest("#playerHistoryBtn")
        ) {

            event.preventDefault();

            window.openPlayerHistory();

            return;
        }


        // ======================================
        // SEARCH
        // ======================================

        if (
            target &&
            target.closest &&
            target.closest("#searchPlayerBtn")
        ) {

            event.preventDefault();

            loadPlayerHistory();

            return;
        }


        // ======================================
        // CLOSE
        // ======================================

        if (
            target &&
            target.closest &&
            target.closest("#closePlayerHistoryBtn")
        ) {

            event.preventDefault();


            const popup =
                document.getElementById(
                    "playerHistoryPopup"
                );


            if (popup) {

                popup.classList.add("hidden");

                console.log(
                    "✅ PLAYER HISTORY CLOSED"
                );
            }

            return;
        }

    }
);


// ==========================================
// 🔥 ENTER = SEARCH
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter" &&
            document.activeElement &&
            document.activeElement.id ===
                "playerSearchInput"
        ) {

            event.preventDefault();

            loadPlayerHistory();
        }

    }
);
