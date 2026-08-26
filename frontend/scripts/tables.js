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

let shift1 = null;   // ✅ ADD
let shift2 = null;   // ✅ ADD
function loadShiftsFromFirebase() {

const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);

onSnapshot(q, (snapshot) => {

    shift1 = null;
    shift2 = null;

    snapshot.forEach(docSnap => {
        const d = docSnap.data();

        if (d.shift_number === 1 && !shift1) {
            shift1 = {
                openTime: d.open_time,
                closeTime: d.close_time,
                startMs: Number(d.start_ms) || 0,
                endMs: Number(d.end_ms) || 0,
                gameTotal: d.game_total,
                canteenTotal: d.canteen_total,
                gameCollection: d.game_collection,
                canteenCollection: d.canteen_collection,
                expenses: d.expenses,
                easypaisa: d.easypaisa || 0,
                discount: d.discount || 0,
                closingCash: d.closing_cash,
                gameBalance: d.game_balance || 0,
               canteenBalance: d.canteen_balance || 0
            };
        }

        if (d.shift_number === 2 && !shift2) {
            shift2 = {
                openTime: d.open_time,
                closeTime: d.close_time,
                startMs: Number(d.start_ms) || 0,
                endMs: Number(d.end_ms) || 0,
                gameTotal: d.game_total,
                canteenTotal: d.canteen_total,
                gameCollection: d.game_collection,
                canteenCollection: d.canteen_collection,
                expenses: d.expenses,
                easypaisa: d.easypaisa || 0,
                discount: d.discount || 0,
                closingCash: d.closing_cash,
                gameBalance: d.game_balance || 0,
                canteenBalance: d.canteen_balance || 0
            };
        }
    });

    // 🔥 BUTTON AUTO UPDATE
    const btn = document.getElementById("shiftCloseBtn");

    if (!shift1) {
        btn.innerText = "Shift 1 Close";
    }
    else if (!shift2) {
        btn.innerText = "Shift 2 Close";
    }
    else {
        btn.innerText = "Day Close";
    }

    console.log("🔥 REALTIME SHIFTS:", shift1, shift2);

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

// 🔥 PLAYERS PRESERVE
player1Name: old?.player1Name || "",
player2Name: old?.player2Name || "",
checkoutPlayer: old?.checkoutPlayer || "",
checkoutPlayerNumber:
    old?.checkoutPlayerNumber || null,

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

                <input
                    id="player1Input"
                    type="text"
                    placeholder="Player 1 name"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        margin-bottom:18px;
                        border-radius:8px;
                        border:1px solid #555;
                    "
                >

                <label style="
                    display:block;
                    color:#fff;
                    margin-bottom:6px;
                ">
                    PLAYER 2
                </label>

                <input
                    id="player2Input"
                    type="text"
                    placeholder="Player 2 name"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        margin-bottom:20px;
                        border-radius:8px;
                        border:1px solid #555;
                    "
                >

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
    // 🔥 UPDATE TOP CARDS
    // =====================================================

    document.getElementById(
        "historyShift1Game"
    ).textContent = shift1Game;

    document.getElementById(
        "historyShift2Game"
    ).textContent = shift2Game;

    document.getElementById(
        "historyShift1Guest"
    ).textContent = shift1Guest;

    document.getElementById(
        "historyShift2Guest"
    ).textContent = shift2Guest;

    document.getElementById(
        "historyShift1Booking"
    ).textContent = shift1Booking;

    document.getElementById(
        "historyShift2Booking"
    ).textContent = shift2Booking;

    document.getElementById(
        "historyShift1Paid"
    ).textContent = shift1Paid;

    document.getElementById(
        "historyShift2Paid"
    ).textContent = shift2Paid;

    document.getElementById(
        "historyShift1PaidAmount"
    ).textContent =
        `Rs. ${shift1PaidAmount.toLocaleString()}`;

    document.getElementById(
        "historyShift2PaidAmount"
    ).textContent =
        `Rs. ${shift2PaidAmount.toLocaleString()}`;

    document.getElementById(
        "historyShift1Unpaid"
    ).textContent = shift1Unpaid;

    document.getElementById(
        "historyShift2Unpaid"
    ).textContent = shift2Unpaid;

    document.getElementById(
        "historyShift1UnpaidAmount"
    ).textContent =
        `Rs. ${shift1UnpaidAmount.toLocaleString()}`;

    document.getElementById(
        "historyShift2UnpaidAmount"
    ).textContent =
        `Rs. ${shift2UnpaidAmount.toLocaleString()}`;

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
 * SHIFT BUTTON BINDING
 ******************************************************/
function bindShiftButtons() {

    // 🔥 SHIFT START TRACKER
    document.getElementById("shiftCloseBtn").onclick = openShiftSummary;

    document.getElementById("confirmShiftCloseBtn").onclick = () => {

        let btn = document.getElementById("shiftCloseBtn");

        if (btn.innerText.includes("Day")) {
            closeDay();
        }
        else if (btn.innerText.includes("1")) {
            closeShift1();
        }
        else {
            closeShift2();
        }
    };

    document.getElementById("cancelShiftSummaryBtn").onclick =
        () => hidePopup("shiftSummaryPopup");
    hidePopup("shiftSummaryPopup");

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
 * 🔥 HABIB STYLE LIVE SHIFT SNAPSHOT
 ******************************************************/
async function openShiftSummary() {

    const btn =
        document.getElementById("shiftCloseBtn");

    const summaryBody =
        document.getElementById("shiftSummaryBody");

    const title =
        document.getElementById("shiftSummaryTitle");

    // ==========================================
    // TITLE
    // ==========================================

    if (btn.innerText.includes("Day")) {

        title.innerText = "DAY SNAPSHOT";

        document.getElementById(
            "confirmShiftCloseBtn"
        ).innerText = "Close Day";

    } else {

        title.innerText = "SHIFT SNAPSHOT";

        document.getElementById(
            "confirmShiftCloseBtn"
        ).innerText = "Close Shift";
    }


    // ==========================================
    // 🔥 ALWAYS REBUILD CURRENT HISTORY FIRST
    // ==========================================

    await rebuildHistoryFromSessions();


    // ==========================================
    // 🔥 CURRENT TIME
    // ==========================================

    const now = Date.now();


    // ==========================================
    // 🔥 GET SHIFT DATA
    // ==========================================

    let s1 = shift1
        ? { ...shift1 }
        : null;

    let s2 = shift2
        ? { ...shift2 }
        : null;


// ==========================================
// 🔥 LIVE SHIFT 1
// Shift 1 is running when no closed Shift 1
// exists for current operational day.
// ==========================================

if (!s1) {

    // 🔥 SHIFT 1 START = CURRENT OPERATIONAL DAY START
    let startMs =
        Number(window.currentDayId) || 0;

    // Safety fallback
    if (!startMs || startMs < 1000000000000) {
        startMs = now;
    }

    const liveData =
        calculateShiftSnapshot(
            startMs,
            now,
            1
        );

    s1 = {

        shift: 1,

        startMs: startMs,

        // 🔥 IMPORTANT:
        // running shift ka end time nahi hota
        endMs: null,

        openTime:
            new Date(startMs)
                .toLocaleString(
                    "en-PK",
                    {
                        timeZone:
                            "Asia/Karachi"
                    }
                ),

        // 🔥 RUNNING
        closeTime: "RUNNING",

        ...liveData
    };

}


    // ==========================================
    // 🔥 COMBINED
    // ==========================================

    let combined = null;

    if (s1 && s2) {

        combined = {

            gameTotal:
                Number(s1.gameTotal || 0) +
                Number(s2.gameTotal || 0),

            canteenTotal:
                Number(s1.canteenTotal || 0) +
                Number(s2.canteenTotal || 0),

            gameCollection:
                Number(s1.gameCollection || 0) +
                Number(s2.gameCollection || 0),

            canteenCollection:
                Number(s1.canteenCollection || 0) +
                Number(s2.canteenCollection || 0),

            gameBalance:
                Number(s1.gameBalance || 0) +
                Number(s2.gameBalance || 0),

            canteenBalance:
                Number(s1.canteenBalance || 0) +
                Number(s2.canteenBalance || 0),

            discount:
                Number(s1.discount || 0) +
                Number(s2.discount || 0),

            expenses:
                Number(s1.expenses || 0) +
                Number(s2.expenses || 0),

            easypaisa:
                Number(s1.easypaisa || 0) +
                Number(s2.easypaisa || 0)
        };


        combined.closingCash =

            Number(
                combined.gameCollection || 0
            ) +

            Number(
                combined.canteenCollection || 0
            ) -

            Number(
                combined.expenses || 0
            ) -

            Number(
                combined.easypaisa || 0
            );

    }


    // ==========================================
    // 🔥 HABIB STYLE ROW
    // ==========================================

    const value = v =>
        Number(v || 0)
            .toLocaleString();


    const makeRow = (
        shiftName,
        data,
        combinedRow = false
    ) => {

        if (!data) {

            return `
                <tr>
                    <td>
                        ${shiftName}
                    </td>

                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            `;
        }


        return `
            <tr class="
                ${combinedRow
                    ? "combined-row"
                    : ""}
            ">

                <td>
                    ${shiftName}
                </td>

                <td>
                    ${value(data.gameTotal)}
                </td>

                <td>
                    ${value(data.canteenTotal)}
                </td>

                <td>
                    ${value(data.gameCollection)}
                </td>

                <td>
                    ${value(data.canteenCollection)}
                </td>

                <td>
                    ${value(data.gameBalance)}
                </td>

                <td>
                    ${value(data.canteenBalance)}
                </td>

                <td>
                    ${value(data.discount)}
                </td>

                <td>
                    ${value(data.expenses)}
                </td>

                <td>
                    ${value(data.easypaisa)}
                </td>

                <td>
                    ${value(data.closingCash)}
                </td>

                <td>
                    ${data.openTime || "-"}
                </td>

                <td>
                    ${data.closeTime || "-"}
                </td>

            </tr>
        `;
    };


    // ==========================================
    // 🔥 HABIB STYLE TABLE
    // ==========================================

    summaryBody.innerHTML = `

        ${makeRow(
            "Shift 1",
            s1
        )}

        ${makeRow(
            "Shift 2",
            s2
        )}

        ${
            combined
            ?
            makeRow(
                "Combined",
                combined,
                true
            )
            :
            ""
        }

    `;


    // ==========================================
    // 🔥 SHOW POPUP
    // ==========================================

    showPopup("shiftSummaryPopup");

}

/******************************************************
 * SHIFT 1 CLOSE (running tables allowed)
 ******************************************************/
async function closeShift1() {
  const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("shift_number", "==", 1),
    where("day_id", "==", window.currentDayId) // 🔥 MAIN FIX
);

const snap = await getDocs(q);

if (!snap.empty) {
    alert("Shift 1 already closed ❌");
    return;
}


let now = Date.now();

// 🔥 FORCE SAFE TIME
let endMs = now;

// 🔥 SHIFT 1 START = CURRENT OPERATIONAL DAY START
let startMs = Number(window.currentDayId) || 0;

// Safety fallback
if (!startMs || startMs < 1000000000000) {
    startMs = now;
}

// ❗ HARD PROTECTION
if (!endMs || endMs < 100000) {
    endMs = Date.now();
}

// ❗ DOUBLE SAFETY
if (!startMs || startMs <= 0) {
    startMs = endMs - 1000;
}

// 🔥 STEP 1: FIRST REBUILD HISTORY
await rebuildHistoryFromSessions();


// 🔥 STEP 3: CALCULATE
let shiftData = calculateShiftSnapshot(startMs, endMs);

    shift1 = {
        shift: 1,
        openTime: new Date(startMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        closeTime: new Date(endMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        startMs: startMs,
        endMs: endMs,
        ...shiftData
    };

    

    document.getElementById("shiftCloseBtn").innerText = "Shift 2 Close";
    hidePopup("shiftSummaryPopup");


  console.log("🔥 SHIFT1 SAVE CHECK:", {
    startMs,
    endMs
});

// ✅ BACKEND SAVE

// 🔥 FIREBASE SAVE SHIFT 1
// 🔥 FIREBASE SAVE SHIFT 1
const docRef = await addDoc(collection(window.db, "shifts"), {
    tables: tables.map(t => ({
        table_id: t.name,
        total: t.history.reduce((sum, h) => sum + (h.total || 0), 0)
    })),
    shift_number: 1,
    branch: BRANCH,

    day_id: window.currentDayId,

    open_time: shift1.openTime,
    close_time: shift1.closeTime,

    start_ms: shift1.startMs,
    end_ms: shift1.endMs,

    game_total: shiftData.gameTotal,
    canteen_total: shiftData.canteenTotal,

    game_collection: shiftData.gameCollection,
    canteen_collection: shiftData.canteenCollection,

    expenses: shiftData.expenses,
easypaisa: shiftData.easypaisa,

discount: shiftData.discount || 0,

closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});

// ✅ CHECK AFTER SAVE (YAHAN LAGAO)
if (!docRef?.id) {
    alert("Shift1 save failed ❌");
    return;
}
alert("Shift 1 closed successfully ✅");
  loadShiftsFromFirebase();
}




/******************************************************
 * SHIFT 2 CLOSE (no running tables allowed)
 ******************************************************/
async function closeShift2() {

  const q = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("shift_number", "==", 2),
    where("day_id", "==", window.currentDayId)
);

const snap = await getDocs(q);

if (!snap.empty) {
    alert("Shift 2 already closed ❌");
    return;
}

  // ======================================================
// 🔥 SHIFT 2 CLOSE — UNPAID BILL CHECK
// Running tables allowed hain.
// Sirf COMPLETED + UNPAID bills Shift 2 Close ko block karenge.
// ======================================================

const unpaidBillsQuery = query(
    collection(window.db, "sessions"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);

const unpaidBillsSnap = await getDocs(unpaidBillsQuery);

const unpaidBills = [];

unpaidBillsSnap.forEach(docSnap => {

    const data = docSnap.data();

    // Deleted session ignore
    if (data.is_deleted === true) {
        return;
    }

    // 🔥 Running game hai → ignore
    if (!data.end_time) {
        return;
    }

    // 🔥 Explicit Shift 1 bill → Shift 2 ko block nahi karega
    if (Number(data.shift_number) === 1) {
        return;
    }

    // Paid bill → ignore
    if (data.paid === true) {
        return;
    }

unpaidBills.push({
    id: docSnap.id,

    tableId:
        data.table_id ||
        data.tableId ||
        "Unknown",

    player1:
        data.player1_name ||
        data.player1Name ||
        "Player 1",

    player2:
        data.player2_name ||
        data.player2Name ||
        "Player 2",

    // 🔥 FULL BILL
    total:
        Number(
            data.total_bill_amount ??
            (
                Number(
                    data.final_game_amount ||
                    data.final_amount ||
                    0
                ) +
                Number(
                    data.canteen_total ||
                    data.canteen_amount ||
                    0
                )
            )
        ),

    // 🔥 REMAINING / DUE
    remaining:
        Number(
            data.remaining_payment ??
            data.total_bill_amount ??
            (
                Number(
                    data.final_game_amount ||
                    data.final_amount ||
                    0
                ) +
                Number(
                    data.canteen_total ||
                    data.canteen_amount ||
                    0
                )
            )
        )
});
});


// ======================================================
// 🔴 UNPAID BILLS MIL GAYE → SHIFT 2 CLOSE BLOCK
// ======================================================

if (unpaidBills.length > 0) {

    let message =
        "Shift 2 Close nahi ho sakti ❌\n\n" +
        "Pehle ye unpaid bills paid karein:\n\n";

unpaidBills.forEach(bill => {

    message +=
        `Table ${bill.tableId} — ` +
        `${bill.player1} VS ${bill.player2}\n` +
        `Total: Rs.${Number(bill.total || 0)} | ` +
        `Remaining: Rs.${Number(bill.remaining || 0)}\n\n`;

});

    alert(message);

    return;
}

console.log(
    "✅ SHIFT 2 CLOSE — No unpaid completed bills"
);


    let now = Date.now();

    // Shift1 snapshot required
    let s1 = shift1 || {};

    let startMs = shift1?.endMs;

// 🔥 HARD FIX (NO FAIL SYSTEM)
if (!startMs) {

    console.log("⚠️ shift1 missing → forcing reload");

    // ✅ STEP 1: reload shifts
    loadShiftsFromFirebase();

    startMs = shift1?.endMs;

    // ✅ STEP 2: STILL MISSING → WAIT + FETCH
    if (!startMs) {

        await new Promise(res => setTimeout(res, 800)); // 🔥 WAIT

        const q = query(
            collection(window.db, "shifts"),
            where("branch", "==", BRANCH),
            where("shift_number", "==", 1),
            where("day_id", "==", window.currentDayId)
        );

        const snap = await getDocs(q);

        snap.forEach(doc => {
            const d = doc.data();
            startMs = d.end_ms;
        });
    }

    if (!startMs) {
    console.log("🔥 FALLBACK ACTIVATED");

    // 🔥 NEVER FAIL SYSTEM
    startMs = Date.now() - (60 * 60 * 1000); // 1 hour back
}
}
    let endMs = now;

    
    let shiftData = calculateShiftSnapshot(startMs, endMs);

    shift2 = {
        shift: 2,
        openTime: new Date(startMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        closeTime: new Date(endMs).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        startMs: startMs,
        endMs: endMs,
        ...shiftData
    };

    

    document.getElementById("shiftCloseBtn").innerText = "Day Close";
    hidePopup("shiftSummaryPopup");

// ✅ BACKEND SAVE

// 🔥 FIREBASE SAVE SHIFT 2
await addDoc(collection(window.db, "shifts"), {
    tables: tables.map(t => ({
        table_id: t.name,
        total: t.history.reduce((sum, h) => sum + (h.total || 0), 0)
    })),
    shift_number: 2,
    branch: BRANCH,

    day_id: window.currentDayId,

    open_time: shift2.openTime,
    close_time: shift2.closeTime,
    start_ms: shift2.startMs,
    end_ms: shift2.endMs,

    game_total: shiftData.gameTotal,
canteen_total: shiftData.canteenTotal,

game_collection: shiftData.gameCollection,
canteen_collection: shiftData.canteenCollection,

expenses: shiftData.expenses,
easypaisa: shiftData.easypaisa,

discount: shiftData.discount || 0,

closing_cash: shiftData.closingCash,

    created_at: new Date().toISOString()
});

alert("Shift 2 closed successfully ✅");
  loadShiftsFromFirebase();
}



/******************************************************
 * DAY CLOSE — RESET EVERYTHING + NEW DAY START
 ******************************************************/
async function closeDay() {

   const today = new Date().toLocaleDateString("en-CA"); // ✅ FIX
    let s1 = shift1;
    let s2 = shift2;

    if (!s1 || !s2) {
        alert("Please close Shift 1 and Shift 2 before Day Close.");
        return;
    }

    // --------------- BUILD COMBINED SUMMARY --------------------
    let combined = {
        gameTotal: (s1.gameTotal || 0) + (s2.gameTotal || 0),
        canteenTotal: (s1.canteenTotal || 0) + (s2.canteenTotal || 0),

        gameCollection: (s1.gameCollection || 0) + (s2.gameCollection || 0),
        canteenCollection: (s1.canteenCollection || 0) + (s2.canteenCollection || 0),

        gameBalance: (s1.gameBalance || 0) + (s2.gameBalance || 0),
        canteenBalance: (s1.canteenBalance || 0) + (s2.canteenBalance || 0),

        expenses: (s1.expenses || 0) + (s2.expenses || 0),
        
      
        discount:(s1.discount || 0)+(s2.discount || 0),
      
        easypaisa: (s1.easypaisa || 0) + (s2.easypaisa || 0),
    };

    combined.closingCash =
    (combined.gameCollection + combined.canteenCollection)
    - combined.expenses
    - (combined.easypaisa || 0);


    // 🔥🔥🔥 STEP 1: SAVE SNAPSHOT BEFORE RESET (MAIN FIX)
    const tablesSnapshot = tables.map(t => ({
    table_id: t.name,
    history: t.history.map(h => ({ ...h }))
}));


    // 🔥🔥🔥 STEP 2: FIREBASE SAVE (PEHLE SAVE KARO)
    try {

       
// ==========================
// 🔥 DUPLICATE SHIFT CHECK (ADD THIS)
// ==========================


// 👉 identify shift (simple logic)


// 🔥 SAFE DATA CLEAN (VERY IMPORTANT)
const safeShift1 = JSON.parse(JSON.stringify(s1 || {}));
const safeShift2 = JSON.parse(JSON.stringify(s2 || {}));
const safeTables = JSON.parse(JSON.stringify(tablesSnapshot || {}));
const safeCombined = JSON.parse(JSON.stringify(combined || {}));

const q = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH),
    where("day_id", "==", window.currentDayId)
);

const snap = await getDocs(q);

// 🔥 ONLY BLOCK IF DAY REALLY EXISTS
let alreadyClosed = false;

snap.forEach(docSnap => {

    const d = docSnap.data();

    // ✅ SAME DAY ONLY
    if (String(d.day_id) === String(window.currentDayId)) {
        alreadyClosed = true;
    }
});

if (alreadyClosed) {

    // 🔥 BUTTON RESET
    document.getElementById("shiftCloseBtn").innerText = "Shift 1 Close";

    // 🔥 RESET LOCAL SHIFTS
    shift1 = null;
    shift2 = null;

    // 🔥 FORCE NEW DAY
    const newDayId = Date.now();

    const systemQ = query(
        collection(window.db, "system"),
        where("branch", "==", BRANCH),
        where("type", "==", "current_day")
    );

    const systemSnap = await getDocs(systemQ);

    for (const d of systemSnap.docs) {

        await updateDoc(doc(window.db, "system", d.id), {
            day_id: newDayId,
            created_at: new Date().toISOString()
        });
    }

    window.currentDayId = newDayId;

    alert("Previous day already closed ✅ New day started.");

    hidePopup("shiftSummaryPopup");

    return;
}

await addDoc(collection(window.db, "days"), {
    tables: safeTables,
    date: today,
    day_id: window.currentDayId, // 🔥 ADD THIS
    branch: BRANCH,
    shift: "day",

    shift1: safeShift1,
    shift2: safeShift2,
    combined: safeCombined,

    created_at: new Date().toISOString()
});

// 🔥 FINAL SAFE DATA (DIRECT FROM SHIFT OBJECTS)
let printData = {
    gameTotal: (s1?.gameTotal || 0) + (s2?.gameTotal || 0),
    canteenTotal: (s1?.canteenTotal || 0) + (s2?.canteenTotal || 0),

    gameCollection: (s1?.gameCollection || 0) + (s2?.gameCollection || 0),
    canteenCollection: (s1?.canteenCollection || 0) + (s2?.canteenCollection || 0),

    expenses: (s1?.expenses || 0) + (s2?.expenses || 0),
  easypaisa: (s1?.easypaisa || 0) + (s2?.easypaisa || 0),
};

printData.closingCash =
    (printData.gameCollection + printData.canteenCollection)
    - printData.expenses
    - (printData.easypaisa || 0);

// 🔥 DEBUG (optional)
console.log("🔥 DAY PRINT DATA:", printData);

// 🔥 PRINT FORMAT AS DAY HISTORY PRINT
printDayHistoryThermal({
    date: today,
    shift1: shift1,
    shift2: shift2,
    combined: {
        gameTotal: printData.gameTotal,
        canteenTotal: printData.canteenTotal,
        gameCollection: printData.gameCollection,
        canteenCollection: printData.canteenCollection,
        gameBalance: (shift1?.gameBalance || 0) + (shift2?.gameBalance || 0),
        canteenBalance: (shift1?.canteenBalance || 0) + (shift2?.canteenBalance || 0),
        expenses: printData.expenses,
        closingCash: printData.closingCash
    }
});
} catch (err) {
    alert("Error saving day data ❌");
    return;
}


    // 🔥 UPDATE CENTRAL DAY (FIREBASE)
const q = query(
    collection(window.db, "system"),
    where("branch", "==", BRANCH),
    where("type", "==", "current_day")
);

const snap = await getDocs(q);

// ======================================================
// 🔥 DAY CLOSE → NEW DAY
// ======================================================

// OLD DAY ID save karo
const oldDayId = window.currentDayId;

// NEW DAY ID
const newDayId = Date.now();


// ======================================================
// 🔥 UPDATE CENTRAL CURRENT DAY
// ======================================================

for (const d of snap.docs) {

    await updateDoc(
        doc(window.db, "system", d.id),
        {
            day_id: newDayId,
            created_at: new Date().toISOString()
        }
    );

}


// ======================================================
// 🔥 FIND ALL CURRENTLY RUNNING SESSIONS
// ======================================================

const runningSessionsQuery = query(
    collection(window.db, "sessions"),
    where("branch", "==", BRANCH),
    where("end_time", "==", null)
);

const runningSessionsSnap =
    await getDocs(runningSessionsQuery);


// ======================================================
// 🔥 MOVE RUNNING SESSIONS → NEW DAY
// ======================================================

for (const sessionDoc of runningSessionsSnap.docs) {

    const sessionData = sessionDoc.data();

    // Deleted session ignore
    if (sessionData.is_deleted === true) {
        continue;
    }

    console.log(
        "🔥 DAY CLOSE → CARRY FORWARD:",
        sessionData.table_id,
        sessionData.start_time
    );


    await updateDoc(
        doc(window.db, "sessions", sessionDoc.id),
        {

            // NEW DAY
            day_id: newDayId,

            // NEW DAY = SHIFT 1
            shift_number: 1,

            // 🔥 ORIGINAL CHECK-IN TIME SAME
            start_time: sessionData.start_time,

            // 🔥 STILL RUNNING
            end_time: null,

            // Information for debugging/history
            carried_forward: true,
            carried_from_day_id: oldDayId,
            carried_at: new Date().toISOString()
        }
    );
}


// ======================================================
// 🔥 UPDATE LOCAL TABLES
// ======================================================

window.currentDayId = newDayId;


tables.forEach(t => {

    // 🔥 RUNNING TABLE KO RESET NAHI KARNA
    if (t.isRunning) {

        console.log(
            "🔥 TABLE CARRIED TO NEW DAY:",
            t.name
        );

        // History clear karni hai,
        // lekin running session preserve karna hai.
        t.history = [];

        t.checkoutTime = null;

        // Timer/session information preserve
        // t.isRunning remains true
        // t.checkinTime remains same
        // t.playSeconds will continue

        return;
    }


    // ==================================================
    // FREE TABLE → NORMAL RESET
    // ==================================================

    t.history = [];
    t.isRunning = false;
    t.checkinTime = null;
    t.checkoutTime = null;
    t.playSeconds = 0;
    t.liveAmount = 0;
    t.canteenTotal = 0;
    t.canteenItems = {};
});

     
    renderTables();

    document.getElementById("shiftCloseBtn").innerText = "Shift 1 Close";

    hidePopup("shiftSummaryPopup");

    shift1 = null;
    shift2 = null;

    alert("Day Closed Successfully & Saved in Day History!");
  setTimeout(autoRefreshUI, 1200);
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


// 🔥 REFRESH CURRENT DAY HISTORY
async function refreshCurrentDayHistory(dayId = null) {

    try {

        console.log("🔥 Refreshing current day history...");
window.historyData = [];
window.combinedHistoryData = [];

        // 🔥 GET CURRENT DAY
dayId = dayId || window.currentDayId;

const q = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH),
    where("day_id", "==", Number(dayId))
);

        const snap = await getDocs(q);

if (snap.empty) {

    console.log("⏳ Day history not created yet:", dayId);

    return;
}

        // 🔥 REBUILD TABLE HISTORY
        await rebuildSpecificDayHistory(dayId);

        // 🔥 GET SHIFTS
const shiftsQ = query(
    collection(window.db, "shifts"),
    where("branch", "==", BRANCH),
    where("day_id", "==", Number(dayId))
);

        const shiftsSnap = await getDocs(shiftsQ);

        let latestShift1 = null;
        let latestShift2 = null;

        shiftsSnap.forEach(docSnap => {

            const d = docSnap.data();

            if (d.shift_number === 1) {
                latestShift1 = d;
            }

            if (d.shift_number === 2) {
                latestShift2 = d;
            }
        });

        if (!latestShift1 || !latestShift2) {
            console.log("⚠️ Shift data missing");
            return;
        }

        // 🔥 RECALCULATE
        const newShift1 = calculateShiftSnapshot(
            latestShift1.start_ms,
            latestShift1.end_ms
        );

        const newShift2 = calculateShiftSnapshot(
            latestShift2.start_ms,
            latestShift2.end_ms
        );

        // 🔥 COMBINED
        const combined = {

            gameTotal:
                newShift1.gameTotal + newShift2.gameTotal,

            canteenTotal:
                newShift1.canteenTotal + newShift2.canteenTotal,

            gameCollection:
                newShift1.gameCollection + newShift2.gameCollection,

            canteenCollection:
                newShift1.canteenCollection + newShift2.canteenCollection,

            gameBalance:
                newShift1.gameBalance + newShift2.gameBalance,

            canteenBalance:
                newShift1.canteenBalance + newShift2.canteenBalance,

            expenses:
                newShift1.expenses + newShift2.expenses,

            easypaisa:
            newShift1.easypaisa + newShift2.easypaisa,
            
            discount:
            (newShift1.discount || 0)
            +
            (newShift2.discount || 0),
            
            closingCash:
            newShift1.closingCash + newShift2.closingCash
        };

        // 🔥 TABLE SNAPSHOT
        const tablesSnapshot = tables.map(t => ({
            table_id: t.name,
            history: t.history.map(h => ({ ...h }))
        }));

        // 🔥 UPDATE DAY HISTORY
        snap.forEach(async (d) => {

            await updateDoc(
                doc(window.db, "days", d.id),
                {

                    tables: tablesSnapshot,

                    shift1: {
                        ...latestShift1,
                        ...newShift1
                    },

                    shift2: {
                        ...latestShift2,
                        ...newShift2
                    },

                    combined
                }
            );

          // 🔥 UPDATE LIVE SHIFT VARIABLES
                shift1 = {
                      ...shift1,
                      ...newShift1
                              };

                shift2 = {
                      ...shift2,
                      ...newShift2
                              };
        });

        console.log("✅ Day history updated");
      await loadShiftsFromFirebase();
      // 🔥 REFRESH DAY HISTORY CACHE
const latestDaysQ = query(
    collection(window.db, "days"),
    where("branch", "==", BRANCH)
);

const latestDaysSnap = await getDocs(latestDaysQ);

window._daysData = [];

latestDaysSnap.forEach(docSnap => {
    window._daysData.push(docSnap.data());
});

    } catch (err) {

        console.error("❌ refreshCurrentDayHistory:", err);
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

    let closeTime = d.shift2?.endMs 
        ? new Date(d.shift2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

sel.innerHTML += `<option>${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime} → ${closeTime})</option>`;
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

    loadDaySummaryFirebase();

    document.getElementById("dayHistoryDateSelect").onchange = loadDaySummaryFirebase;

    showPopup("dayHistoryPopup");
}
function loadDaySummaryFirebase() {

    let index = document.getElementById("dayHistoryDateSelect").selectedIndex;
    let d = window._daysData[index];

    if (!d) return;

    let s1 = d.shift1 || {};
    let s2 = d.shift2 || {};
    let c = d.combined || {};

document.getElementById("dayShift1Body").innerHTML = `
<tr>
<td colspan="7">
    <div class="summary-box">

        <div class="summary-row">
            <span>🎮 Game</span>
            <span>${s1.gameTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>🍔 Canteen</span>
            <span>${s1.canteenTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>💰 Game Collection</span>
            <span>${s1.gameCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>🧾 Canteen Collection</span>
            <span>${s1.canteenCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>⚖️ Balance</span>
            <span>${(s1.gameBalance || 0) + (s1.canteenBalance || 0)}</span>
        </div>

        <div class="summary-row">
            <span>💸 Expenses</span>
            <span>${s1.expenses || 0}</span>
        </div>

        <div class="summary-row">
            <span>📲 EasyPaisa</span>
            <span>${s1.easypaisa || 0}</span>
        </div>
      
              <div class="summary-row">
          <span>🎁 Discount</span>
          <span>${s1.discount || 0}</span>
      </div>

        <div class="summary-row total">
            <span>💵 Cash</span>
            <span>${s1.closingCash || 0}</span>
        </div>

    </div>
</td>
</tr>
`;

document.getElementById("dayShift2Body").innerHTML = `
<tr>
<td colspan="7">
    <div class="summary-box">

        <div class="summary-row">
            <span>🎮 Game</span>
            <span>${s2.gameTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>🍔 Canteen</span>
            <span>${s2.canteenTotal || 0}</span>
        </div>

        <div class="summary-row">
            <span>💰 Game Collection</span>
            <span>${s2.gameCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>🧾 Canteen Collection</span>
            <span>${s2.canteenCollection || 0}</span>
        </div>

        <div class="summary-row">
            <span>⚖️ Balance</span>
            <span>${(s2.gameBalance || 0) + (s2.canteenBalance || 0)}</span>
        </div>

        <div class="summary-row">
            <span>💸 Expenses</span>
            <span>${s2.expenses || 0}</span>
        </div>

        <div class="summary-row">
            <span>📲 EasyPaisa</span>
            <span>${s2.easypaisa || 0}</span>
        </div>

        <div class="summary-row">
    <span>🎁 Discount</span>
    <span>${s2.discount || 0}</span>
</div>

        <div class="summary-row total">
            <span>💵 Cash</span>
            <span>${s2.closingCash || 0}</span>
        </div>

    </div>
</td>
</tr>
`;

document.getElementById("dayCombinedBody").innerHTML = `
<tr>
    <td colspan="7">

        <div class="summary-box">

            <div class="summary-row">
                <span>🎮 Game</span>
                <span>${c.gameTotal || 0}</span>
            </div>

            <div class="summary-row">
                <span>🍔 Canteen</span>
                <span>${c.canteenTotal || 0}</span>
            </div>

            <div class="summary-row">
                <span>💰 Game Collection</span>
                <span>${c.gameCollection || 0}</span>
            </div>

            <div class="summary-row">
                <span>🧾 Canteen Collection</span>
                <span>${c.canteenCollection || 0}</span>
            </div>

            <div class="summary-row">
                <span>⚖️ Balance</span>
                <span>
                    ${
                        Number(c.gameBalance || 0) +
                        Number(c.canteenBalance || 0)
                    }
                </span>
            </div>

            <div class="summary-row">
                <span>💸 Expenses</span>
                <span>${c.expenses || 0}</span>
            </div>

            <div class="summary-row">
                <span>📲 EasyPaisa</span>
                <span>${c.easypaisa || 0}</span>
            </div>

            <div class="summary-row">
                <span>🎁 Discount</span>
                <span>${c.discount || 0}</span>
            </div>

            <div class="summary-row total">
                <span>💵 Cash</span>
                <span>${c.closingCash || 0}</span>
            </div>

        </div>

    </td>
</tr>
`;
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

let closeTime = d.shift2?.endMs 
    ? new Date(d.shift2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
    : "-";

dateSel.innerHTML += `<option value="${i}">${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, "0")}-${String(operationalDate.getDate()).padStart(2, "0")} (${openTime} → ${closeTime})</option>`;
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

    document.getElementById("tableHistoryDateSelect").onchange = loadSelectedTableHistory;
    document.getElementById("tableHistoryTableSelect").onchange = loadSelectedTableHistory;
}

/******************************************************
 * 🟢 LOAD SUMMARY FOR SELECTED TABLE
 ******************************************************/
function loadSelectedTableHistory() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    if (!t) return;


let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;

if (!window._daysData || dayIndex < 0 || !window._daysData[dayIndex]) {
    console.log("⚠️ No day data found");
    return;
}

let selectedDay = window._daysData[dayIndex];

if (!selectedDay) return;

// 🔥 find table from firebase day data
let tableData = selectedDay.tables?.find(tb => tb.table_id === t.name);

// agar data na mile
if (!tableData) {
    document.getElementById("tableShift1Body").innerHTML = buildTableHistoryRow(t, {});
    document.getElementById("tableShift2Body").innerHTML = buildTableHistoryRow(t, {});
    document.getElementById("tableCombinedBody").innerHTML = buildTableHistoryRow(t, {});
    return;
}

// 🔥 calculate from history
let t1 = { time:0, game:0, canteen:0, total:0 };
let t2 = { time:0, game:0, canteen:0, total:0 };

// 👉 simple version (full day same data)
let s1 = selectedDay.shift1;
let s2 = selectedDay.shift2;

// 🔥 SHIFT 1 CALC
tableData.history.forEach(h => {
    if (s1 && h.checkin >= s1.startMs && h.checkout <= s1.endMs) {
        t1.time += h.playSeconds || 0;
        t1.game += h.amount || 0;
        t1.canteen += h.canteenAmount || 0;
        t1.total += h.total || 0;
    }
});

// 🔥 SHIFT 2 CALC
tableData.history.forEach(h => {
    if (s2 && h.checkin >= s2.startMs && h.checkout <= s2.endMs) {
        t2.time += h.playSeconds || 0;
        t2.game += h.amount || 0;
        t2.canteen += h.canteenAmount || 0;
        t2.total += h.total || 0;
    }
});

let combined = {
    time: t1.time + t2.time,
    game: t1.game + t2.game,
    canteen: t1.canteen + t2.canteen,
    total: t1.total + t2.total
};

document.getElementById("tableShift1Body").innerHTML = buildTableHistoryRow(t, t1);
document.getElementById("tableShift2Body").innerHTML = buildTableHistoryRow(t, t2);
document.getElementById("tableCombinedBody").innerHTML = buildTableHistoryRow(t, combined);
    
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
 * 🟢 BUILD TABLE HISTORY ROW
 ******************************************************/
function buildTableHistoryRow(t, d) {
    return `
    <tr>
    <td colspan="4">
        <div class="history-box">

            <div class="history-title">
                🎱 ${t.name}
            </div>

            <div class="history-row">
                <span>⏱ Play Time</span>
                <span>${formatSeconds(d.time || 0)}</span>
            </div>

            <div class="history-row">
                <span>🎮 Game</span>
                <span>${d.game || 0}</span>
            </div>

            <div class="history-row">
                <span>🍔 Canteen</span>
                <span>${d.canteen || 0}</span>
            </div>

            <div class="history-row total">
                <span>💵 Total</span>
                <span>${d.total || 0}</span>
            </div>

        </div>
    </td>
    </tr>
    `;
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
            "<tr><td colspan='11'>No history found.</td></tr>";

        return;
    }

    let history =
        [...t.history];

    // SHIFT FILTER
    const shiftSelect =
        document.getElementById("tableHistoryShiftSelect");

    const selectedShift =
        shiftSelect ? shiftSelect.value : "all";

    if (selectedShift === "1") {

        history =
            history.filter(
                h => Number(h.shiftNumber) === 1
            );

    } else if (selectedShift === "2") {

        history =
            history.filter(
                h => Number(h.shiftNumber) === 2
            );
    }

    // LATEST FIRST
    history.sort(
        (a, b) =>
            Number(b.checkout || 0) -
            Number(a.checkout || 0)
    );

    const start =
        (historyPage - 1) * historyPerPage;

    const end =
        start + historyPerPage;

    const pageRows =
        history.slice(start, end);

    pageRows.forEach((h, index) => {

        /*
         * IMPORTANT:
         * Firebase sessionId is the REAL ID.
         * Never pass array index to openBillFromHistory().
         */

        const sessionId =
            String(h.sessionId || "");

        const rowNumber =
            start + index + 1;

        body.innerHTML += `
            <tr>

                <td>${rowNumber}</td>

                <td>
    <div style="
        display:flex;
        flex-direction:column;
        gap:4px;
    ">

        <div style="
            font-weight:bold;
            ${
                Number(h.checkoutPlayerNumber) === 1
                ? "background:#d4af37;color:#000;padding:4px 7px;border-radius:5px;"
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
            font-weight:bold;
            ${
                Number(h.checkoutPlayerNumber) === 2
                ? "background:#d4af37;color:#000;padding:4px 7px;border-radius:5px;"
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
                </td>

                <td>
                    ${formatTime(h.checkout)}
                </td>

                <td>
                    ${formatSeconds(h.playSeconds || 0)}
                </td>

                <td>
                    ${h.rate || 0}
                </td>

                <td>
                    ${h.amount || 0}
                </td>

                <td>
                    ${h.canteenAmount || 0}
                </td>

                <td>
                    ${h.total || 0}
                </td>

                <td>

                    ${
                        h.paid
                        ?
                        `
                        <button
                            class="paid-btn"
                            disabled>
                            PAID
                        </button>
                        `
                        :
                        `
                        <button
                            class="unpaid-btn"
                            onclick="window.openBillFromHistory(
                                '${tableId}',
                                '${sessionId}'
                            )">
                            UNPAID
                        </button>
                        `
                    }

                </td>

            </tr>
        `;
    });
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

        // 🔥 FIX: if time is too old (more than 12 hours), ignore
        let now = Date.now();
        let diffHours = (now - start) / (1000 * 60 * 60);

        if (diffHours > 12) {
            console.log("⚠️ OLD SESSION IGNORED:", s);
            return;
        }

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

            let now = Date.now();
            let diffHours = (now - start) / (1000 * 60 * 60);

            if (diffHours > 12){
                console.log("⚠️ OLD SESSION IGNORED:", s);
                return;
            }

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

    let s1 = d.shift1 || {};
    let s2 = d.shift2 || {};
    let c = d.combined || {};

    let openTime = s1.startMs 
        ? new Date(s1.startMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    let closeTime = s2.endMs 
        ? new Date(s2.endMs).toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
}) 
        : "-";

    let win = window.open("", "_blank", "width=300,height=600");

    let html = `
    <html>
    <head>
        <style>
            body { 
                font-family: monospace; 
                width: 250px; 
                margin:auto; 
                text-align:center;
            }
            .row { text-align:center; margin:3px 0; }
.line { border-top:1px dashed #000; margin:6px 0; }
.big { font-size:16px; font-weight:bold; }
            hr { border:1px dashed #000; }
        </style>
    </head>
    <body>

    <div class="big">DAY HISTORY</div>
    <div>${BRANCH.toUpperCase()}</div>

    <hr>

    <div>
        ${d.date}<br>
        (${openTime} → ${closeTime})
    </div>

    <hr>

<b>Shift 1</b>
<div class="row">
    <span>${s1.startMs ? new Date(s1.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s1.endMs ? new Date(s1.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row">Game : Rs ${s1.gameTotal || 0}</div>
<div class="row">Canteen : Rs ${s1.canteenTotal || 0}</div>
<div class="row">Game Collection : Rs ${s1.gameCollection || 0}</div>
<div class="row">Canteen Collection : Rs ${s1.canteenCollection || 0}</div>
<div class="row">Balance : Rs ${(s1.gameBalance || 0)+(s1.canteenBalance || 0)}</div>
<div class="row">Expenses : Rs ${s1.expenses || 0}</div>
<div class="row">EasyPaisa : Rs ${s1.easypaisa || 0}</div>

<div class="row">Discount : Rs ${s1.discount || 0}</div>

<div class="row"><b>Cash</b><b>Rs ${s1.closingCash || 0}</b></div>

<hr>

<b>Shift 2</b>
<div class="row">
    <span>${s2.startMs ? new Date(s2.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s2.endMs ? new Date(s2.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row">Game : Rs ${s2.gameTotal || 0}</div>
<div class="row">Canteen : Rs ${s2.canteenTotal || 0}</div>
<div class="row">Game Collection : Rs ${s2.gameCollection || 0}</div>
<div class="row">Canteen Collection : Rs ${s2.canteenCollection || 0}</div>
<div class="row">Balance : Rs ${(s2.gameBalance || 0)+(s2.canteenBalance || 0)}</div>
<div class="row">Expenses : Rs ${s2.expenses || 0}</div>
<div class="row">EasyPaisa : Rs ${s2.easypaisa || 0}</div>

<div class="row">Discount : Rs ${s2.discount || 0}</div>

<div class="row"><b>Cash</b><b>Rs ${s2.closingCash || 0}</b></div>

<hr>

<b>Combined</b>
<div class="row">
    <span>${s1.startMs ? new Date(s1.startMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
    <span>To</span>
    <span>${s2.endMs ? new Date(s2.endMs).toLocaleTimeString('en-PK',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}) : "-"}</span>
</div>
<div class="row"><span>Game : Rs ${c.gameTotal || 0}</div>
<div class="row"><span>Canteen : Rs ${c.canteenTotal || 0}</div>
<div class="row"><span>Collection : Rs ${(c.gameCollection||0)+(c.canteenCollection||0)}</div>
<div class="row"><span>Balance : Rs ${(c.gameBalance||0)+(c.canteenBalance||0)}</div>
<div class="row"><span>Expenses : Rs ${c.expenses || 0}</div>
<div class="row"><span>EasyPaisa : Rs ${c.easypaisa || 0}</div>

<div class="row"><span>Discount : Rs ${c.discount || 0}</div>

<hr>

<div class="line"></div>
<div class="big">FINAL CASH<br>Rs ${c.closingCash || 0}</div>
<div class="line"></div>

    <hr>

    <div>${new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi'
})}</div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
    
        win.print();
    
        setTimeout(() => {
            win.close();
        }, 800);
    
    }, 300);
}

/// table history thermal print

function printTableHistoryThermal() {

    let tableId = document.getElementById("tableHistoryTableSelect").value;
    let t = tables.find(x => String(x.id) === String(tableId));

    let dayIndex = document.getElementById("tableHistoryDateSelect").selectedIndex;
    let d = window._daysData[dayIndex];

    if (!t || !d) {
        alert("No data found ❌");
        return;
    }

    let tableData = d.tables?.find(tb => tb.table_id === t.name);

    let total = 0;
    let game = 0;
    let canteen = 0;
    let time = 0;

    (tableData?.history || []).forEach(h => {
        total += Number(h.total || 0);
        game += Number(h.amount || 0);
        canteen += Number(h.canteenAmount || 0);
        time += Number(h.playSeconds || 0);
    });

    let win = window.open("", "_blank", "width=300,height=600");

    let html = `
    <html>
    <head>
        <style>
            body { 
                font-family: monospace; 
                width: 250px; 
                margin:auto; 
                text-align:center;
            }
            .line { border-top:1px dashed #000; margin:6px 0; }
            .big { font-size:18px; font-weight:bold; }
        </style>
    </head>
    <body>

    <div class="big">TABLE HISTORY</div>
    <div>${BRANCH.toUpperCase()}</div>

    <div class="line"></div>

    <div>
        ${t.name}<br>
        ${d.date}
    </div>

    <div class="line"></div>

    <div>Play Time : ${formatSeconds(time)}</div>
    <div>Game : Rs ${game}</div>
    <div>Canteen : Rs ${canteen}</div>

    <div class="line"></div>

    <div class="big">TOTAL<br>Rs ${total}</div>

    <div class="line"></div>

    <div>
        ${new Date().toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi'
        })}
    </div>

    </body>
    </html>
    `;

    win.document.write(html);
    win.document.close();

      setTimeout(() => {
      
          win.print();
      
          setTimeout(() => {
              win.close();
          }, 800);
      
      }, 300);
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
// 👤 PLAYER HISTORY - FINAL
// ==========================================

window.openPlayerHistory = async function () {

    console.log("✅ PLAYER HISTORY CLICKED");

    const popup =
        document.getElementById("playerHistoryPopup");

    if (!popup) {
        console.error("❌ playerHistoryPopup NOT FOUND");
        return;
    }

    popup.classList.remove("hidden");

    await loadPlayerHistory();
};


// ==========================================
// 🔎 LOAD / SEARCH PLAYER HISTORY
// ==========================================

window.loadPlayerHistory = async function () {

    const body =
        document.getElementById("playerHistoryBody");

    const searchInput =
        document.getElementById("playerSearchInput");

    if (!body || !searchInput) {
        console.error("❌ Player History elements missing");
        return;
    }

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    body.innerHTML = `
        <tr>
            <td colspan="8">
                Loading...
            </td>
        </tr>
    `;

    try {

        // 🔥 ACTUAL DATA COLLECTION
        const q = query(
            collection(window.db, "sessions"),
            where("branch", "==", BRANCH)
        );

        const snap =
            await getDocs(q);

        body.innerHTML = "";

        let count = 0;

        snap.forEach(docSnap => {

            const h = docSnap.data();

            // Deleted sessions skip
            if (h.is_deleted === true) {
                return;
            }


            // ==================================
            // 🔥 PLAYER NAME - ALL VERSIONS
            // ==================================

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


            const p1 =
                String(player1)
                    .toLowerCase()
                    .trim();

            const p2 =
                String(player2)
                    .toLowerCase()
                    .trim();


            // ==================================
            // 🔎 SEARCH
            // ==================================

            if (
                search &&
                !p1.includes(search) &&
                !p2.includes(search)
            ) {
                return;
            }


            count++;


            // ==================================
            // DATE
            // ==================================

            let date = "-";

            if (h.start_time) {

                const d =
                    new Date(h.start_time);

                if (!isNaN(d.getTime())) {
                    date =
                        d.toLocaleDateString();
                }
            }


            // ==================================
            // AMOUNT
            // ==================================

            const amount =
                Number(
                    h.final_amount ??
                    h.final_game_amount ??
                    h.total ??
                    0
                );


            // ==================================
            // PLAY TYPE
            // ==================================

            const playType =
                h.selected_play_type ||
                h.play_type ||
                "-";


            // ==================================
            // STATUS
            // ==================================

            const status =
                h.paid === true
                    ? "Paid"
                    : "Unpaid";


            // ==================================
            // TABLE ROW
            // ==================================

            body.innerHTML += `
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
                        ${
                            h.table_id ||
                            h.tableId ||
                            "-"
                        }
                    </td>

                    <td>
                        ${playType}
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


        // ==================================
        // NOTHING FOUND
        // ==================================

        if (count === 0) {

            body.innerHTML = `
                <tr>
                    <td colspan="8">
                        No player history found
                    </td>
                </tr>
            `;

        }


        console.log(
            "✅ PLAYER HISTORY RESULTS:",
            count
        );

    }

    catch (error) {

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
};


// ==========================================
// 👤 PLAYER HISTORY EVENTS
// ==========================================

// 🔥 EVENT DELEGATION
// Is se DOM timing ka masla nahi hoga.

document.addEventListener(
    "click",
    function (e) {

        const target =
            e.target.closest(
                "#playerHistoryBtn, #searchPlayerBtn, #closePlayerHistoryBtn"
            );

        if (!target) {
            return;
        }


        // ==============================
        // OPEN
        // ==============================

        if (
            target.id ===
            "playerHistoryBtn"
        ) {

            window.openPlayerHistory();

            return;
        }


        // ==============================
        // SEARCH
        // ==============================

        if (
            target.id ===
            "searchPlayerBtn"
        ) {

            window.loadPlayerHistory();

            return;
        }


        // ==============================
        // CLOSE
        // ==============================

        if (
            target.id ===
            "closePlayerHistoryBtn"
        ) {

            const popup =
                document.getElementById(
                    "playerHistoryPopup"
                );

            if (popup) {

                popup.classList.add(
                    "hidden"
                );

                console.log(
                    "✅ PLAYER HISTORY CLOSED"
                );
            }

            return;
        }

    }
);


// ==========================================
// ⌨️ ENTER KEY SEARCH
// ==========================================

document.addEventListener(
    "keydown",
    function (e) {

        if (
            e.key === "Enter" &&
            e.target &&
            e.target.id ===
            "playerSearchInput"
        ) {

            window.loadPlayerHistory();
        }

    }
);


console.log(
    "✅ FINAL PLAYER HISTORY CODE LOADED"
);
