import {
    collection,
    getDocs,
    query,
    where
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const branches = [

    "rasson1",
    "rasson2",
    "rasson3",
    "rasson4",
    "rasson5",
    "rasson6",
    "rasson7",
    "rasson8"
];

document.addEventListener(
    "DOMContentLoaded",
    async ()=>{

    const container =
        document.getElementById(
            "overviewContainer"
        );

    if(!container) return;

    // =====================
    // LOAD TABLES
    // =====================

    const tablesSnap =
        await getDocs(
            collection(window.db,"tables")
        );

const sessionsQuery = query(
    collection(window.db, "sessions"),
    where("is_deleted", "==", false)
);

const sessionsSnap =
    await getDocs(sessionsQuery);
    const systemSnap =
        await getDocs(
            collection(window.db,"system")
        );

        
    let tables = [];
    let sessions = [];
    let operationalDays = [];

    tablesSnap.forEach(doc=>{

        let t = doc.data();

        tables.push(t);
    });

    sessionsSnap.forEach(doc=>{

        let s = doc.data();

        if(s.is_deleted === true)
            return;

        sessions.push(s);
    });

let currentOperationalMap = {};

systemSnap.forEach(doc=>{

    let d = doc.data();

    if(d.type !== "current_day")
        return;

    let branch =
        (d.branch || "")
        .toLowerCase();

    if(!branch) return;

    currentOperationalMap[branch] =
        String(d.day_id || "");
});

   

    // =====================
    // RENDER BRANCHES
    // =====================

    branches.forEach(branch=>{

let rawBranchTables =
    tables.filter(t=>

        (t.branch || "")
        .toLowerCase() === branch
    );

// REMOVE DUPLICATES
let uniqueTablesMap = {};

rawBranchTables.forEach(t=>{

    let tableName =
        (
            t.table_id ||
            t.name ||
            ""
        ).trim().toLowerCase();

    if(!tableName) return;

    uniqueTablesMap[tableName] = t;
});

let branchTables =
    Object.values(uniqueTablesMap);

        let activeTables = 0;

        let html = "";

        branchTables.sort((a,b)=>{

            let aName =
                a.table_id || "";

            let bName =
                b.table_id || "";

            let aRoom =
                aName.toLowerCase()
                .includes("room");

            let bRoom =
                bName.toLowerCase()
                .includes("room");

            if(aRoom && !bRoom)
                return 1;

            if(!aRoom && bRoom)
                return -1;

            let aNum =
                parseInt(
                    aName.match(/\d+/)?.[0]
                    || 0
                );

            let bNum =
                parseInt(
                    bName.match(/\d+/)?.[0]
                    || 0
                );

            return aNum - bNum;
        });

        branchTables.forEach(table=>{

            let tableName =
                table.table_id ||
                table.name ||
                "Table";

let running =
    sessions.some(s=>{

        return (

            (s.branch || "")
            .toLowerCase()
            === branch

            &&

            (
                s.table_id === tableName
                ||
                s.table === tableName
            )

            &&

            (
                s.check_in_time
                ||
                s.start_time
            )

            &&

            !s.end_time
            &&
            !s.checkout_time
            &&
            !s.close_time

        );
    });
            if(running)
                activeTables++;

            html += `

            <div class="table-box
                ${running
                    ? "table-active"
                    : "table-free"}">

                <h2>${tableName}</h2>

                <p>
                ${running
                    ? "ACTIVE"
                    : "FREE"}
                </p>

            </div>
            `;
        });

        let freeTables =
            branchTables.length
            - activeTables;

        container.innerHTML += `

        <div class="branch-card">

            <div class="branch-title">

                ${branch.toUpperCase()}

            </div>

            <div class="branch-stats">

                <div class="stat-box">

                    <h3>Total Tables</h3>

                    <p>
                    ${branchTables.length}
                    </p>

                </div>

                <div class="stat-box">

                    <h3>Active Tables</h3>

                    <p>
                    ${activeTables}
                    </p>

                </div>

                <div class="stat-box">

                    <h3>Free Tables</h3>

                    <p>
                    ${freeTables}
                    </p>

                </div>

            </div>

            <div class="tables-grid">

                ${html}

            </div>

        </div>
        `;
    });
});
