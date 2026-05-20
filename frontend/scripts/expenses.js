import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("EXPENSES FIREBASE LOADED");

const db = window.db;

const branch = (localStorage.getItem("branch") || "")
    .toLowerCase()
    .replace(/\s+/g, "");
const role = (localStorage.getItem("role") || "").toLowerCase();

let expenseData = [];
let operationalDayMap = {};
let editId = null;

let selectedType = "all";
let selectedDay = "all";
let fromDate = null;
let toDate = null;

// =========================
// LOAD CURRENT DAY ID
// =========================
async function loadCurrentDayId() {

    const snap = await getDocs(collection(db, "system"));

    snap.forEach(d => {
        const data = d.data();

if (data.type === "current_day" && data.branch === branch) {

    window.currentDayId =
        data.day_id;

    window.currentDayCreatedAt =
        data.created_at || null;
}
    });

    console.log("✅ CURRENT DAY ID LOADED:", window.currentDayId);
}

async function loadOperationalDays() {

    const snap =
        await getDocs(
            collection(db, "day_history")
        );

    snap.forEach(doc => {

        const data = doc.data();

        if (
            (data.branch || "")
            .toLowerCase()
            .replace(/\s+/g, "")
            !== branch
        ) return;

operationalDayMap[
    String(data.day_id)
] = data;
    });

    console.log(
        "✅ OPERATIONAL DAYS:",
        operationalDayMap
    );
}
// =========================
// TIME FORMAT
// =========================
function formatTime(timestamp) {

    if (!timestamp) return "-";

    let date;

    if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }

    return date.toLocaleString("en-PK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Karachi"
    });
}

// =========================
// POPUP
// =========================
window.openAddPopup = () => {
    document.getElementById("addPopup").classList.remove("hide");
};

window.closeAddPopup = () => {
    document.getElementById("addPopup").classList.add("hide");
};

window.closeEditPopup = () => {
    document.getElementById("editPopup").classList.add("hide");
};

// =========================
// SAVE EXPENSE
// =========================
window.saveExpense = async () => {

    const type = document.getElementById("newType").value;
    const title = document.getElementById("newTitle").value;
    const amount = Number(document.getElementById("newAmount").value);
    const selectedDate =
    document.getElementById("newDate").value;
    const shift =
document.getElementById("newShift").value;

    if (!title || !amount) {
        alert("Fill all fields");
        return;
    }

await addDoc(collection(db, "expenses"), {
    type,
    title,
    amount,
    shift,

    branch: String(branch)
        .toLowerCase()
        .replace(/\s+/g, ""),

    day_id: window.currentDayId,

    // operational day opening date
    day_created_at:
        window.currentDayCreatedAt || null,

    operational_month:
    (() => {

        let d =
            new Date(
                window.currentDayCreatedAt
            );

        return `${d.getFullYear()}-${String(
            d.getMonth() + 1
        ).padStart(2, "0")}`;

    })(),

    created_at: selectedDate
        ? new Date(selectedDate).toISOString()
        : new Date().toISOString()
});

    document.getElementById("newTitle").value = "";
    document.getElementById("newAmount").value = "";
    document.getElementById("newDate").value = "";

    closeAddPopup();
};

// =========================
// EDIT
// =========================
window.editExpense = (
    id,
    title,
    amount,
    type,
    shift,
    created_at
) => {

    editId = id;

    document.getElementById("editTitle").value = title;
    document.getElementById("editAmount").value = amount;
    document.getElementById("editType").value = type;
    document.getElementById("editShift").value =
    shift || "shift1";
    if (created_at) {

    let d;

    if (created_at.seconds) {

        d = new Date(created_at.seconds * 1000);

    } else {

        d = new Date(created_at);
    }

    // ✅ INVALID DATE FIX
    if (!isNaN(d.getTime())) {

        const localDate =
            new Date(d.getTime() - d.getTimezoneOffset() * 60000);

        document.getElementById("editDate").value =
            localDate.toISOString().slice(0, 16);

    } else {

        document.getElementById("editDate").value = "";
    }
}

    document.getElementById("editPopup").classList.remove("hide");
};

// =========================
// UPDATE
// =========================
window.updateExpense = async () => {

    const title = document.getElementById("editTitle").value;
    const amount = Number(document.getElementById("editAmount").value);
    const type = document.getElementById("editType").value;
    const shift =
document.getElementById("editShift").value;
    const editDate =
    document.getElementById("editDate").value;

    await updateDoc(doc(db, "expenses", editId), {
    title,
    amount,
    type,
    shift,
    created_at: editDate
        ? new Date(editDate).toISOString()
        : new Date().toISOString()
});

    editId = null;
    closeEditPopup();
};

// =========================
// DELETE
// =========================
window.deleteExpense = async (id) => {

    if (!confirm("Delete this expense?")) return;

    await deleteDoc(doc(db, "expenses", id));
};

// =========================
// RENDER
// =========================
function renderTable() {

    const body = document.getElementById("expensesBody");
    body.innerHTML = "";

    let total = 0;

    expenseData.forEach(e => {

        // FILTER TYPE
        if (selectedType !== "all" && e.type !== selectedType) return;

        // FILTER DAY
        if (selectedDay === "current" && e.day_id !== window.currentDayId) return;

let expenseDate;

if (e.created_at?.seconds) {

    expenseDate =
        new Date(
            e.created_at.seconds * 1000
        );

} else {

    expenseDate =
        new Date(e.created_at);
}

// FROM DATE FILTER
if (fromDate) {

    let from =
        new Date(fromDate);

    from.setHours(0,0,0,0);

    if (expenseDate < from) return;
}

// TO DATE FILTER
if (toDate) {

    let to =
        new Date(toDate);

    to.setHours(23,59,59,999);

    if (expenseDate > to) return;
}
        
        total += Number(e.amount || 0);

let actions = "";

        if (
    role === "admin" ||
    role === "super_admin"
)
{
            actions = `
                <button class="btn-green"onclick="editExpense(
'${e.id}',
'${e.title}',
${e.amount},
'${e.type}',
'${e.shift || "shift1"}',
'${e.created_at || ""}'
)">Edit</button>
                <button class="btn-red" onclick="deleteExpense('${e.id}')">Delete</button>
            `;
        }

body.innerHTML += `
    <tr>
        <td>${e.title || "-"}</td>

        <td>${e.amount || 0}</td>

        <td>${e.type || "-"}</td>

        <td>
            ${
                e.shift === "shift2"
                ? "Shift 2"
                : "Shift 1"
            }
        </td>

        <td>
            ${formatTime(e.created_at)}
        </td>

        <td>
            ${actions}
        </td>
    </tr>
`;
    });

    document.getElementById("todayTotal").innerText = total + " PKR";
}

// =========================
// FILTERS
// =========================
window.filterByType = function () {
    selectedType = document.getElementById("filterType").value;
    renderTable();
};

window.filterByDay = function () {
    selectedDay = document.getElementById("dayFilter").value;
    renderTable();
};

window.filterByDateRange = function () {

    fromDate =
        document.getElementById("fromDate").value;

    toDate =
        document.getElementById("toDate").value;

    renderTable();
};


// =========================
// SEARCH
// =========================
window.searchExpenses = function () {

    const search =
        document.getElementById("searchInput")
        .value
        .toLowerCase();

    const rows =
        document.querySelectorAll("#expensesBody tr");

    rows.forEach(row => {

        const text =
            row.innerText.toLowerCase();

        if (text.includes(search)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
};

// =========================
// LISTENER START
// =========================
function startExpensesListener() {

    if (!window.currentDayId) {
        console.log("⏳ Waiting for currentDayId...");
        setTimeout(startExpensesListener, 500);
        return;
    }

    console.log("✅ DAY ID READY:", window.currentDayId);

    const q = query(
    collection(db, "expenses"),
    where("branch", "==", branch),
    orderBy("created_at", "desc")
);

    onSnapshot(q, (snap) => {

        expenseData = [];

        const now = new Date();

        // ✅ DEFAULT CURRENT MONTH FILTER

if (!fromDate && !toDate) {

    fromDate =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}-01`;

    toDate =
        `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}-${new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        ).getDate()}`;

    const fromInput =
        document.getElementById("fromDate");

    const toInput =
        document.getElementById("toDate");

    if (fromInput)
        fromInput.value = fromDate;

    if (toInput)
        toInput.value = toDate;
}


snap.forEach(d => {

    let data = d.data();

    expenseData.push({
        id: d.id,
        ...data
    });
});

        renderTable();
    });
}

// =========================
// INIT
// =========================
if (
    role !== "admin" &&
    role !== "super_admin"
) {

    // HIDE MONTH FILTER
    const monthBox =
        document.getElementById("monthFilterBox");

    if (monthBox) {
        monthBox.style.display = "none";
    }

    // HIDE DATE INPUT
    const newDate =
        document.getElementById("newDate");

    if (newDate) {
        newDate.style.display = "none";
    }

    // HIDE EDIT DATE INPUT
    const editDate =
        document.getElementById("editDate");

    if (editDate) {
        editDate.style.display = "none";
    }
}

await loadCurrentDayId();
await loadOperationalDays();
startExpensesListener();

