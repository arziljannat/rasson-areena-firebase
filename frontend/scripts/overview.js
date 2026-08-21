import {
    collection,
    getDocs,
    query,
    where
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const container =
            document.getElementById("overviewContainer");

        if (!container) return;

        // =========================
        // SINGLE BRANCH
        // =========================

        const branch = "rasson1";

        // =========================
        // LOAD TABLES
        // =========================

        const tablesSnap =
            await getDocs(
                collection(window.db, "tables")
            );

        // =========================
        // LOAD SESSIONS
        // =========================

        const sessionsQuery = query(
            collection(window.db, "sessions"),
            where("is_deleted", "==", false)
        );

        const sessionsSnap =
            await getDocs(sessionsQuery);

        // =========================
        // STORE DATA
        // =========================

        let tables = [];
        let sessions = [];

        tablesSnap.forEach(doc => {

            const t = doc.data();

            tables.push(t);

        });

        sessionsSnap.forEach(doc => {

            const s = doc.data();

            if (s.is_deleted === true)
                return;

            sessions.push(s);

        });

        // =========================
        // GET RASSON1 TABLES
        // =========================

        let rawBranchTables =
            tables.filter(t =>

                (t.branch || "")
                    .toLowerCase() === branch

            );

        // =========================
        // REMOVE DUPLICATES
        // =========================

        let uniqueTablesMap = {};

        rawBranchTables.forEach(t => {

            const tableName =
                (
                    t.table_id ||
                    t.name ||
                    ""
                )
                .trim()
                .toLowerCase();

            if (!tableName)
                return;

            uniqueTablesMap[tableName] = t;

        });

        let branchTables =
            Object.values(uniqueTablesMap);

        // =========================
        // SORT TABLES / ROOMS
        // =========================

        branchTables.sort((a, b) => {

            const aName =
                a.table_id ||
                a.name ||
                "";

            const bName =
                b.table_id ||
                b.name ||
                "";

            const aRoom =
                aName
                    .toLowerCase()
                    .includes("room");

            const bRoom =
                bName
                    .toLowerCase()
                    .includes("room");

            if (aRoom && !bRoom)
                return 1;

            if (!aRoom && bRoom)
                return -1;

            const aNum =
                parseInt(
                    aName.match(/\d+/)?.[0] || 0
                );

            const bNum =
                parseInt(
                    bName.match(/\d+/)?.[0] || 0
                );

            return aNum - bNum;

        });

        // =========================
        // COUNT ACTIVE TABLES
        // =========================

        let activeTables = 0;

        let html = "";

        branchTables.forEach(table => {

            const tableName =
                table.table_id ||
                table.name ||
                "Table";

            const running =
                sessions.some(s => {

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

            if (running)
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

        // =========================
        // FREE TABLES
        // =========================

        const freeTables =
            branchTables.length -
            activeTables;

        // =========================
        // SINGLE BRANCH OVERVIEW
        // =========================

        container.innerHTML = `

            <div class="overview-page">

                <div class="overview-header">

                    <h1>Rasson Snooker Areena</h1>

                    <p>Branch Overview</p>

                </div>


                <div class="branch-card">

                    <div class="branch-title">
                        RASSON SNOOKER AREENA
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

            </div>

        `;

    }
);
