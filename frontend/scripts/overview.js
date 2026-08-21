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

        // =====================================
        // RASSON AREENA - SINGLE BRANCH
        // =====================================

        const branch = "areena";

        // =====================================
        // LOAD TABLES
        // =====================================

        const tablesSnap =
            await getDocs(
                collection(window.db, "tables")
            );

        // =====================================
        // LOAD SESSIONS
        // =====================================

        const sessionsQuery = query(
            collection(window.db, "sessions"),
            where("is_deleted", "==", false)
        );

        const sessionsSnap =
            await getDocs(sessionsQuery);

        // =====================================
        // STORE DATA
        // =====================================

        const tables = [];
        const sessions = [];

        tablesSnap.forEach(doc => {

            tables.push(doc.data());

        });

        sessionsSnap.forEach(doc => {

            const s = doc.data();

            if (s.is_deleted === true)
                return;

            sessions.push(s);

        });

        // =====================================
        // GET THIS BRANCH TABLES
        // =====================================

        const rawBranchTables =
            tables.filter(t => {

                return (
                    (t.branch || "")
                        .toLowerCase()
                        .trim()
                    ===
                    branch
                );

            });

        // =====================================
        // REMOVE DUPLICATES
        // =====================================

        const uniqueTablesMap = {};

        rawBranchTables.forEach(t => {

            const tableName =
                (
                    t.table_id ||
                    t.name ||
                    ""
                )
                .trim();

            if (!tableName)
                return;

            uniqueTablesMap[
                tableName.toLowerCase()
            ] = t;

        });

        const branchTables =
            Object.values(uniqueTablesMap);

        // =====================================
        // SEPARATE TABLES / ROOMS
        // =====================================

        const normalTables =
            branchTables.filter(t => {

                const name =
                    (
                        t.table_id ||
                        t.name ||
                        ""
                    )
                    .toLowerCase();

                return !name.includes("room");

            });

        const rooms =
            branchTables.filter(t => {

                const name =
                    (
                        t.table_id ||
                        t.name ||
                        ""
                    )
                    .toLowerCase();

                return name.includes("room");

            });

        // =====================================
        // SORT FUNCTION
        // =====================================

        const sortResources = (a, b) => {

            const aName =
                a.table_id ||
                a.name ||
                "";

            const bName =
                b.table_id ||
                b.name ||
                "";

            const aNum =
                parseInt(
                    aName.match(/\d+/)?.[0] || 0
                );

            const bNum =
                parseInt(
                    bName.match(/\d+/)?.[0] || 0
                );

            return aNum - bNum;

        };

        normalTables.sort(sortResources);
        rooms.sort(sortResources);

        // =====================================
        // ACTIVE CHECK
        // =====================================

        const isRunning = (resource) => {

            const resourceName =
                resource.table_id ||
                resource.name ||
                "";

            return sessions.some(s => {

                return (

                    (s.branch || "")
                        .toLowerCase()
                        .trim()
                    ===
                    branch

                    &&

                    (
                        s.table_id === resourceName
                        ||
                        s.table === resourceName
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

        };

        // =====================================
        // TABLE COUNTS
        // =====================================

        let activeTables = 0;
        let activeRooms = 0;

        // =====================================
        // RENDER TABLES
        // =====================================

        let tablesHTML = "";

        normalTables.forEach(table => {

            const tableName =
                table.table_id ||
                table.name ||
                "Table";

            const running =
                isRunning(table);

            if (running)
                activeTables++;

            tablesHTML += `

                <div class="overview-resource-box
                    ${running
                        ? "resource-active"
                        : "resource-free"}">

                    <h2>${tableName}</h2>

                    <p>
                        ${running
                            ? "ACTIVE"
                            : "FREE"}
                    </p>

                </div>

            `;

        });

        // =====================================
        // RENDER ROOMS
        // =====================================

        let roomsHTML = "";

        rooms.forEach(room => {

            const roomName =
                room.table_id ||
                room.name ||
                "Room";

            const running =
                isRunning(room);

            if (running)
                activeRooms++;

            roomsHTML += `

                <div class="overview-resource-box
                    ${running
                        ? "resource-active"
                        : "resource-free"}">

                    <h2>${roomName}</h2>

                    <p>
                        ${running
                            ? "ACTIVE"
                            : "FREE"}
                    </p>

                </div>

            `;

        });

        // =====================================
        // FREE COUNTS
        // =====================================

        const freeTables =
            normalTables.length -
            activeTables;

        const freeRooms =
            rooms.length -
            activeRooms;

        // =====================================
        // FINAL OVERVIEW
        // =====================================

        container.innerHTML = `

            <div class="overview-page">

                <div class="overview-header">

                    <h1>RASSON SNOOKER AREENA</h1>

                    <p>BRANCH OVERVIEW</p>

                </div>


                <div class="overview-stats">

                    <div class="stat-box">

                        <h3>TOTAL TABLES</h3>

                        <p>
                            ${normalTables.length}
                        </p>

                    </div>


                    <div class="stat-box">

                        <h3>ACTIVE TABLES</h3>

                        <p>
                            ${activeTables}
                        </p>

                    </div>


                    <div class="stat-box">

                        <h3>FREE TABLES</h3>

                        <p>
                            ${freeTables}
                        </p>

                    </div>

                </div>


                <section class="overview-section">

                    <h2 class="section-heading">
                        TABLES
                    </h2>

                    <div class="overview-tables-grid">

                        ${tablesHTML}

                    </div>

                </section>


                <section class="overview-section rooms-section">

                    <h2 class="section-heading">
                        ROOMS
                    </h2>

                    <div class="overview-rooms-grid">

                        ${roomsHTML}

                    </div>

                </section>

            </div>

        `;

    }
);
