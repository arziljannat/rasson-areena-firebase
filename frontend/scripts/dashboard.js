import {
    collection,
    getDocs
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
document.addEventListener("DOMContentLoaded", async () => {

    const branch = (localStorage.getItem("branch") || "").toLowerCase();

    const snap = await getDocs(
    collection(window.db, "system")
);

    snap.forEach(d => {

        let data = d.data();

        if (
            data.type === "current_day" &&
            (data.branch || "").toLowerCase() === branch
        ) {
            window.currentDayId = data.day_id;
        }
    });

console.log("🔥 DASHBOARD CURRENT DAY:", window.currentDayId);

await loadOperationalDays();

loadDashboardRealtime();

// ✅ MONTH FILTER
const monthInput = document.getElementById("dashboardMonthFilter");

    // ✅ MONTH FILTER
const monthInput = document.getElementById("dashboardMonthFilter");

if(monthInput){

    let operationalCurrent =
        operationalDays[String(window.currentDayId)];

    if(operationalCurrent){

        selectedMonth =
            operationalCurrent.month;

        selectedYear =
            operationalCurrent.year;

        monthInput.value =
`${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}`;

    }else{

        let now = new Date();

        monthInput.value =
`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    }

    monthInput.addEventListener("change", (e)=>{

        let value = e.target.value;

        if(!value) return;

        let parts = value.split("-");

        selectedYear = Number(parts[0]);
        selectedMonth = Number(parts[1]) - 1;

        updateDashboard();
    });
}
});

const role = (localStorage.getItem("role") || "").toLowerCase();


let tablesData = [];
let sessionsData = [];
let canteenData = [];
let expenseData = [];
let realtimeTodayEasy = 0;
let realtimeMonthlyEasy = 0;
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();

let operationalDays = {};

function setText(id, value){

    const el = document.getElementById(id);

    if(el){

        el.innerText = value ?? 0;
    }
}

async function loadOperationalDays(){

    operationalDays = {};

    const snap = await getDocs(
        collection(window.db, "days")
    );

    snap.forEach(doc => {

        let d = doc.data();

        let dayId =
            String(d.day_id || "");

       let rawDate =
            d.start_time ||
            d.created_at ||
            d.date;

// 🔥 FIX FOR OLD DAYS
if (!d.start_time && d.shift1?.startMs) {
    rawDate = d.shift1.startMs;
}

if(!rawDate) return;

let date = new Date(rawDate);
        console.log("DAY DEBUG:", {
    dayId,
    raw: d,
    parsed: date,
    closed:
        d.is_closed ||
        d.closed ||
        d.day_closed ||
        d.close_time ||
        d.closeTime
});

        if(isNaN(date.getTime())) return;

        // 🔥 ONLY CLOSED DAYS
// 🔥 SKIP ONLY CURRENT RUNNING DAY

operationalDays[dayId] = {

    raw: {

        ...d,

// 🔥 AUTO FIX OLD DAYS
is_closed:
    d.is_closed === true ||
    d.closed === true ||
    d.day_closed === true ||
    !!d.close_time ||
    !!d.closeTime ||
    !!d.end_time ||
    !!d.endTime ||
    !!d.shift2?.close_time ||
    !!d.shift2?.closeTime ||
    !!d.shift1?.close_time ||
    !!d.shift1?.closeTime
    },

    startDate: date,

    month: date.getMonth(),

    year: date.getFullYear(),

    day: date.getDate(),

    isCurrent:
        String(d.day_id) ===
        String(window.currentDayId)
};
    });
}



function loadDashboardRealtime() {

    const branch = (localStorage.getItem("branch") || "").toLowerCase();
    if (!branch) return;

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    getDocs(collection(window.db, "tables")).then(snap => {

    tablesData = [];

    let uniqueTables = {};

    snap.forEach(d => {

        let t = d.data();

        // ONLY CURRENT BRANCH
        if ((t.branch || "").toLowerCase() !== branch) return;

        // TABLE NAME
        let tableName =
            (t.table_id || t.name || "")
            .toLowerCase()
            .trim();

        // SKIP DUPLICATES
        if (uniqueTables[tableName]) return;

        uniqueTables[tableName] = true;

        tablesData.push(t);
    });

    updateDashboard();
});

    getDocs(collection(window.db, "sessions")).then(snap => {
        sessionsData=[];
        snap.forEach(d=>{
            let s=d.data();
            if((s.branch || "").toLowerCase() === branch) sessionsData.push(s);
        });
        updateDashboard();
    });

    getDocs(collection(window.db, "canteen_logs")).then(snap => {
        canteenData=[];
        snap.forEach(d=>{
            let c=d.data();
            if((c.branch || "").toLowerCase() === branch) canteenData.push(c);
        });
        updateDashboard();
    });

    getDocs(collection(window.db, "expenses")).then(snap => {
        expenseData=[];
        snap.forEach(d=>{
            let e=d.data();
            if((e.branch || "").toLowerCase() === branch) expenseData.push(e);
        });
  updateDashboard();
          });

    
// ✅ EASYPAISA
getDocs(collection(window.db, "easypaisa")).then(snap => {

    window.latestEasyDocs = [];

    let todayEasy = 0;
    let monthlyEasy = 0;

    let now = new Date();
    const currentDayId = window.currentDayId;

    snap.forEach(d => {

        let e = d.data();

        // 🔥 SKIP DELETED EASYPAISA
if (e.is_deleted === true) return;
        
        window.latestEasyDocs.push(e);

        if ((e.branch || "").toLowerCase() !== branch) return;

        let amount = Number(e.amount || 0);

        let date;

        let rawDate =
    e.created_at?.seconds
    ? e.created_at.seconds * 1000
    : e.created_at;

if (!rawDate) return;

date = new Date(rawDate);

if (isNaN(date.getTime())) return;

        // TODAY
// TODAY
let operational =
    operationalDays[String(e.day_id)];

if (
    String(e.day_id) === String(currentDayId) &&
    !operational?.raw?.is_closed
) {
    todayEasy += amount;
}
        // MONTHLY
// MONTHLY
let operationalMonthly =
    operationalDays[String(e.day_id)];

// MONTHLY

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){

    monthlyEasy += amount;

}
    });

    setText("todayEasyPaisa", todayEasy);
    
    realtimeTodayEasy = todayEasy;
    realtimeMonthlyEasy = monthlyEasy;
    updateDashboard();
    

});
}
        
      

async function updateDashboard() {

    let now = new Date();
    const currentDayId = window.currentDayId;
    let todayStart = new Date();
    todayStart.setHours(0,0,0,0);

    let today_game_total=0, today_paid=0, today_unpaid=0;
    let today_sessions=0, completed_sessions=0;
    let today_canteen_total=0;
    let today_expense=0;

    let monthly_income=0;

    let today_easy = realtimeTodayEasy || 0;
    // 🔥 RESET TODAY VALUES FOR OPERATIONAL DAY
            today_sessions = 0;
            completed_sessions = 0;
            today_game_total = 0;
            today_paid = 0;
            today_unpaid = 0;
            today_canteen_total = 0;
            today_expense = 0;
            let monthly_easy = 0;

(window.latestEasyDocs || []).forEach(e => {

    // 🔥 SKIP DELETED EASYPAISA
if (e.is_deleted === true) return;
    
    let rawDate =
    e.created_at?.seconds
    ? e.created_at.seconds * 1000
    : e.created_at;

if (!rawDate) return;

let date = new Date(rawDate);

if (isNaN(date.getTime())) return;

if (
    (e.branch || "").toLowerCase() !==
    (localStorage.getItem("branch") || "").toLowerCase()
) return;

    if (!e.created_at) return;
    const easyMonth =
    date.getMonth();

const easyYear =
    date.getFullYear();

    let operational =
    operationalDays[String(e.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){

    monthly_easy += Number(e.amount || 0);

}
});

    let monthly_canteen=0;
    let monthly_expense=0;
    let shift1Monthly = 0;
    let shift2Monthly = 0;
    // ================= SESSIONS =================
    sessionsData.forEach(s=>{
        // 🔥 SKIP DELETED SESSIONS
if (s.is_deleted === true) return;

    let date = new Date(s.start_time || s.startTime || s.created_at);
    let amount = Number(
    s.final_amount ||
    s.total_amount ||
    s.amount ||
    0
);

    // 🔥 CURRENT DAY ONLY

let sessionDayId =
    s.day_id ||
    s.dayId ||
    s.current_day_id ||
    0;

 let operational =
    operationalDays[String(sessionDayId)];       

if(String(sessionDayId) === String(currentDayId)){

    if(
    operational &&
    operational.raw?.is_closed === true
){
    return;
}

    if (isNaN(date.getTime())) return;

    today_sessions++;
    today_game_total += amount;

    if(s.paid){
        today_paid++;
    } else {
        today_unpaid++;
    }

    if(s.end_time){
        completed_sessions++;
    }
}

    // 🔥 MONTHLY (NO DAY FILTER)
    // 🔥 MONTHLY OPERATIONAL LOGIC
if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){

    monthly_income += amount;

// 🔥 SHIFT SPLIT USING SESSION START TIME

let sessionHour = date.getHours();

// 🔥 9 AM → 8 PM = SHIFT 1
// 🔥 8 PM → NEXT MORNING = SHIFT 2

if(sessionHour >= 9 && sessionHour < 20){

    shift1Monthly += amount;

}else{

    shift2Monthly += amount;
}

}
});

    // ================= CANTEEN =================

// 🔥 FROM CANTEEN LOGS
canteenData.forEach(c=>{
    let date = new Date(c.time || c.created_at || c.date);
let amount = Number(c.total || c.amount || 0);

// 🔥 CURRENT DAY


// 🔥 CURRENT DAY

let todayOperational =
    operationalDays[String(c.day_id)];

if(
    todayOperational &&
    todayOperational.raw?.is_closed === true
){
    return;
}
    
if(String(c.day_id) === String(currentDayId)){
    if(date>=todayStart){
        today_canteen_total+=amount;
    }
}

// 🔥 MONTHLY (NO FILTER)
let operational =
    operationalDays[String(c.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){
    monthly_canteen += amount;
}
});

// 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
    // 🔥 ALSO FROM SESSIONS (VERY IMPORTANT)
sessionsData.forEach(s=>{

    // 🔥 SKIP DELETED SESSIONS
    if (s.is_deleted === true) return;

    let date = new Date(
        s.start_time ||
        s.startTime ||
        s.created_at
    );

    let canteen =
        Number(s.canteen_total || 0);

    // 🔥 CURRENT DAY
    if(String(s.day_id) === String(currentDayId)){

        let operational =
    operationalDays[String(s.day_id)];

if(
    operational &&
    operational.raw?.is_closed === true
){
    return;
}

        if(date >= todayStart){
            today_canteen_total += canteen;
        }
    }

    // 🔥 MONTHLY
    let operational =
        operationalDays[String(s.day_id)];

    if(
        operational &&
        operational.month === selectedMonth &&
        operational.year === selectedYear &&
        operational.raw?.is_closed === true
    ){
        monthly_canteen += canteen;
    }
});

    // ================= EXPENSE =================
    expenseData.forEach(e=>{
        // 🔥 SKIP DELETED EXPENSES
if (e.is_deleted === true) return;

    let date;

    if (e.created_at?.seconds) {
        date = new Date(e.created_at.seconds * 1000);
    } else {
        date = new Date(e.created_at);
    }

    if(isNaN(date.getTime())) return;

    let amount = Number(e.amount || 0);


// TODAY

let todayOperational =
    operationalDays[String(e.day_id)];

if(
    String(e.day_id) === String(currentDayId) &&
    !todayOperational?.raw?.is_closed
){
    today_expense += amount;
}

    // MONTHLY
    let operational =
    operationalDays[String(e.day_id)];

if(
    operational &&
    operational.month === selectedMonth &&
    operational.year === selectedYear &&
    operational.raw?.is_closed === true
){

    monthly_expense += amount;

}
});

    // ================= EASYPAISA =================


    // ================= UI =================
    setText("totalTables", tablesData.length);
const activeTablesCount = sessionsData.filter(s => {

    // 🔥 SKIP DELETED
    if (s.is_deleted === true) return false;

    // 🔥 ONLY CURRENT OPERATIONAL DAY
    const sameDay =
        String(
            s.day_id ||
            s.dayId ||
            s.current_day_id ||
            ""
        ) === String(currentDayId);

    // 🔥 RUNNING SESSION
    const running =
        !s.end_time &&
        !s.endTime &&
        !s.checkout_time &&
        !s.checkoutTime &&
        !s.closeTime &&
        !s.close_time;

    // 🔥 IGNORE OLD CLOSED DAYS
    const operational =
        operationalDays[
            String(
                s.day_id ||
                s.dayId ||
                s.current_day_id ||
                ""
            )
        ];

   if (
    operational &&
    operational.raw?.is_closed === true &&
    !operational.isCurrent
) {
    return false;
}

    return sameDay && running;

}).length;
    
setText("activeTables", activeTablesCount);
setText("freeTables", tablesData.length - activeTablesCount);

    setText("todaySessions", today_sessions);
    setText("completedSessions", completed_sessions);

    setText("todayIncome", today_game_total);
    setText("todayCanteen", today_canteen_total);
    setText("todayExpenses", today_expense);

    const finalTodayNet =
    Number(today_game_total || 0)
    + Number(today_canteen_total || 0)
    - Number(today_expense || 0)
    - Number(today_easy || 0);

setText("netIncome", finalTodayNet);

    setText("paidBills", today_paid);
    setText("unpaidBills", today_unpaid);

    setText("monthlyIncome", monthly_income);
    setText("monthlycanteen", monthly_canteen);
    setText("monthlyExpenses", monthly_expense);
    setText(
    "monthlyEasyPaisa",
    realtimeMonthlyEasy || monthly_easy || 0
);

    const finalMonthlyProfit =
    Number(monthly_income || 0)
    + Number(monthly_canteen || 0)
    - Number(monthly_expense || 0)
    - Number(monthly_easy || 0);

setText("netProfit", finalMonthlyProfit);
    setText("shift1Monthly", shift1Monthly);
    setText("shift2Monthly", shift2Monthly);

let operationalMonthDays =
    Object.values(operationalDays).filter(d=>{

        return (
            d.month === selectedMonth &&
            d.year === selectedYear &&
            d.raw?.is_closed === true
        );

    }).length;

if(operationalMonthDays <= 0){
    operationalMonthDays = 1;
}

let monthlyAvg =
    Number(monthly_income || 0)
    / operationalMonthDays;

setText(
    "monthlyAverage",
    Math.round(monthlyAvg)
);

renderTableSalesBoxes();

    // 🔥 ROLE CONTROL
    if(role==="staff"){
        document.querySelectorAll(".admin-only")
            .forEach(el=>el.style.display="none");
    }

            console.log({
        today_canteen_total,
        monthly_canteen,
        shift1Monthly,
        shift2Monthly
        });
}

function renderTableSalesBoxes(){

    // =========================
    // STAFF CONTAINER
    // =========================

    const staffContainer =
        document.getElementById(
            "staffTableSalesContainer"
        );

    // =========================
    // ADMIN CONTAINER
    // =========================

    const adminContainer =
        document.getElementById(
            "tableSalesContainer"
        );

    if(staffContainer){
        staffContainer.innerHTML = "";
    }

    if(adminContainer){
        adminContainer.innerHTML = "";
    }

    let staffStats = {};
    let adminStats = {};

    // =========================
    // TABLE CREATE
    // =========================

    tablesData.forEach(t=>{

        let tableName =
            t.table_id ||
            t.name ||
            "Unknown Table";

        staffStats[tableName] = {
            shift1:0,
            shift2:0,
            total:0
        };

        adminStats[tableName] = {
            shift1:0,
            shift2:0,
            total:0
        };
    });

    // =========================
    // SESSION LOOP
    // =========================

    sessionsData.forEach(s=>{

        if(s.is_deleted === true) return;

        let tableName =
            s.table_id ||
            s.table ||
            s.table_name ||
            "Unknown Table";

        if(!staffStats[tableName]){

            staffStats[tableName] = {
                shift1:0,
                shift2:0,
                total:0
            };
        }

        if(!adminStats[tableName]){

            adminStats[tableName] = {
                shift1:0,
                shift2:0,
                total:0
            };
        }

        let amount = Number(
            s.final_amount ||
            s.total_amount ||
            s.amount ||
            0
        );

        let sessionDate = new Date(
            s.start_time ||
            s.startTime ||
            s.created_at
        );

        if(isNaN(sessionDate.getTime())) return;

        let hour = sessionDate.getHours();

        let shiftKey =
            (hour >= 9 && hour < 20)
            ? "shift1"
            : "shift2";

        let dayId =
            s.day_id ||
            s.dayId ||
            s.current_day_id;

        let operational =
            operationalDays[String(dayId)];

        // =========================
        // STAFF = CURRENT RUNNING DAY
        // =========================

        if(
            String(dayId) ===
            String(window.currentDayId)
        ){

            if(
                !operational?.raw?.is_closed
            ){

                staffStats[tableName][shiftKey]
                    += amount;

                staffStats[tableName].total
                    += amount;
            }
        }

        // =========================
        // ADMIN = OPERATIONAL MONTH
        // =========================

        if(
            operational &&
            operational.month === selectedMonth &&
            operational.year === selectedYear &&
            operational.raw?.is_closed === true
        ){

            adminStats[tableName][shiftKey]
                += amount;

            adminStats[tableName].total
                += amount;
        }
    });

    // =========================
    // SORT FUNCTION
    // =========================

    function sortTables(obj){

        return Object.keys(obj).sort((a,b)=>{

            const aIsRoom =
                a.toLowerCase()
                .includes("room");

            const bIsRoom =
                b.toLowerCase()
                .includes("room");

            if(aIsRoom && !bIsRoom)
                return 1;

            if(!aIsRoom && bIsRoom)
                return -1;

            let aNum =
                parseInt(
                    a.match(/\d+/)?.[0] || 0
                );

            let bNum =
                parseInt(
                    b.match(/\d+/)?.[0] || 0
                );

            return aNum - bNum;
        });
    }

    // =========================
    // STAFF UI
    // =========================

    if(staffContainer){

        sortTables(staffStats)
        .forEach(table=>{

            let t = staffStats[table];

            staffContainer.innerHTML += `

            <div class="table-sale-box">

                <h2>${table}</h2>

                <p>Shift1 : ${t.shift1}</p>

                <p>Shift2 : ${t.shift2}</p>

                <p>Total : ${t.total}</p>

            </div>
            `;
        });
    }

    // =========================
    // ADMIN UI
    // =========================

    if(adminContainer){

        sortTables(adminStats)
        .forEach(table=>{

            let t = adminStats[table];

            adminContainer.innerHTML += `

            <div class="table-sale-box">

                <h2>${table}</h2>

                <p>Shift1 : ${t.shift1}</p>

                <p>Shift2 : ${t.shift2}</p>

                <p>Total : ${t.total}</p>

            </div>
            `;
        });
    }
}
