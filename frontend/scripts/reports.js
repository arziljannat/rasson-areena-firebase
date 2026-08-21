import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const REPORT_BRANCH = "areena";

function getDates() {
    let fromInput = document.getElementById("fromDate").value;
    let toInput = document.getElementById("toDate").value;

    if (!fromInput || !toInput) {
        alert("Select date range");
        return null;
    }

    let from = new Date(fromInput);
    let to = new Date(toInput);

    from.setHours(0,0,0,0);
    to.setHours(23,59,59,999);

    return { from, to };
}

const buttons = document.querySelectorAll(".report-btn");

let currentReport = "game";

buttons.forEach(btn => btn.classList.remove("active"));
buttons[0].classList.add("active");

buttons[0].onclick = () => {
    currentReport = "game";
    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[0].classList.add("active");
};

buttons[1].onclick = () => {
    currentReport = "canteen";
    buttons.forEach(btn => btn.classList.remove("active"));
    buttons[1].classList.add("active");
};


let operationalDays = {};

async function loadOperationalDays() {

    operationalDays = {};

const branch = REPORT_BRANCH;

    const snap =
        await getDocs(
            collection(window.db, "days")
        );

    snap.forEach(docSnap => {

        const d =
            docSnap.data();

        // ==============================
        // BRANCH FILTER
        // ==============================

        if (
            String(d.branch || "").trim() !==
            String(branch || "").trim()
        ) {
            return;
        }

        const dayId =
            String(
                d.day_id ||
                docSnap.id ||
                ""
            );

        if (!dayId) return;

        // ==============================
        // OPERATIONAL DAY DATE
        // SHIFT 1 START PRIMARY
        // ==============================

        let rawDate =
            d.shift1?.startMs ||
            d.shift1?.start_ms ||
            d.start_time ||
            d.startTime ||
            d.created_at ||
            d.date;

        if (!rawDate) return;

        let date;

        if (
            typeof rawDate === "object" &&
            rawDate?.seconds
        ) {

            date =
                new Date(
                    rawDate.seconds * 1000
                );

        } else {

            date =
                new Date(rawDate);
        }

        if (
            isNaN(date.getTime())
        ) {
            return;
        }

        operationalDays[dayId] = {

            raw: d,

            startDate: date,

            month: date.getMonth(),

            year: date.getFullYear(),

            day: date.getDate()
        };
    });
}



buttons[2].onclick = () => {

    currentReport = "inventory";

    buttons.forEach(btn =>
        btn.classList.remove("active")
    );

    buttons[2].classList.add("active");
};

document.getElementById("viewReportBtn").onclick = async () => {

    await loadOperationalDays();

    if (currentReport === "game") {

        loadReport();

    } else if (currentReport === "canteen") {

        loadCanteenReport();

    } else {

        loadInventoryReport();
    }
};

function getCombinedTiming(s1, s2, combined) {

    let s1Open =
        s1.openTime ||
        s1.start_time ||
        s1.start_ms;

    let s1Close =
        s1.closeTime ||
        s1.end_time ||
        s1.end_ms;

    let s2Open =
        s2.openTime ||
        s2.start_time ||
        s2.start_ms;

    let s2Close =
        s2.closeTime ||
        s2.end_time ||
        s2.end_ms;


    function formatTime(value) {

        if (!value) return null;

        let date;

        if (typeof value === "number") {

            date = new Date(value);

        } else if (value?.seconds) {

            date =
                new Date(value.seconds * 1000);

        } else {

            date = new Date(value);
        }

        if (isNaN(date.getTime())) {
            return null;
        }

        return date.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    const open1 = formatTime(s1Open);
    const close1 = formatTime(s1Close);

    const open2 = formatTime(s2Open);
    const close2 = formatTime(s2Close);


    if (open1 && close2) {

        return `
            ${open1}
            —
            ${close2}
        `;
    }


    if (combined?.openTime && combined?.closeTime) {

        return `
            ${formatTime(combined.openTime)}
            —
            ${formatTime(combined.closeTime)}
        `;
    }


    return "-";
}


// ======================================================
// GAME INCOME REPORT
// RASSON ARENA DAY HISTORY CALCULATION
// ======================================================

async function loadReport() {

    const dates =
        getDates();

    if (!dates) return;

    const box =
        document.getElementById(
            "reportOutput"
        );

    box.innerHTML =
        "Loading...";

    try {

        const fromKey =
            document.getElementById(
                "fromDate"
            ).value;

        const toKey =
            document.getElementById(
                "toDate"
            ).value;

        const rows = [];

        // ==========================================
        // LOAD DAYS
        // ==========================================

        Object.values(
            operationalDays
        ).forEach(day => {

            const d =
                day.raw || {};

            const s1 =
                d.shift1 || {};

            const s2 =
                d.shift2 || {};

            const combined =
                d.combined || {};

            // ======================================
            // OPERATIONAL DATE
            // ======================================

            let operationalDate =
                day.startDate;

            if (
                !operationalDate ||
                isNaN(
                    operationalDate.getTime()
                )
            ) {
                return;
            }

            // ======================================
            // PAKISTAN DATE
            // ======================================

            const operationalKey =
                new Intl.DateTimeFormat(
                    "en-CA",
                    {
                        timeZone:
                            "Asia/Karachi",

                        year:
                            "numeric",

                        month:
                            "2-digit",

                        day:
                            "2-digit"
                    }
                ).format(
                    operationalDate
                );

            // ======================================
            // DATE FILTER
            // ======================================

            if (
                operationalKey <
                fromKey ||
                operationalKey >
                toKey
            ) {
                return;
            }

            // ======================================
            // SHIFT 1
            // ======================================

            const shift1Collection =
                Number(
                    s1.gameCollection || 0
                );

            const shift1Balance =
                Number(
                    s1.gameBalance || 0
                );

            const shift1Discount =
                Number(
                    s1.discount || 0
                );

            const shift1Expense =
                Number(
                    s1.expenses || 0
                );

            // ======================================
            // SHIFT 2
            // ======================================

            const shift2Collection =
                Number(
                    s2.gameCollection || 0
                );

            const shift2Balance =
                Number(
                    s2.gameBalance || 0
                );

            const shift2Discount =
                Number(
                    s2.discount || 0
                );

            const shift2Expense =
                Number(
                    s2.expenses || 0
                );

            // ======================================
            // TOTALS
            // ======================================

            const totalCollection =
                shift1Collection +
                shift2Collection;

            const totalBalance =
                shift1Balance +
                shift2Balance;

            const totalDiscount =
                shift1Discount +
                shift2Discount;

            const totalExpense =
                shift1Expense +
                shift2Expense;

            // ======================================
            // EASYPAISA
            // ======================================

            const easypaisa =
                Number(
                    combined.easypaisa || 0
                );

            // ======================================
            // FINAL CLOSING CASH
            //
            // SAME AS ARENA DAY HISTORY
            // ======================================

            const finalClosingCash =
                totalCollection -
                totalBalance -
                totalDiscount -
                totalExpense -
                easypaisa;

            // ======================================
            // COMBINED TIMING
            // SHIFT 1 START → SHIFT 2 CLOSE
            // ======================================

            let combinedTiming = "-";

            if (
                s1.startMs &&
                s2.endMs
            ) {

                combinedTiming =
                    `${formatTime(
                        s1.startMs
                    )} → ${formatTime(
                        s2.endMs
                    )}`;
            }

            // ======================================
            // PUSH REPORT ROW
            // ======================================

            rows.push({

                date:
                    formatReportDate(
                        operationalDate
                    ),

                dateMs:
                    operationalDate.getTime(),

                shift1Collection,

                shift2Collection,

                totalCollection,

                shift1Balance,

                shift2Balance,

                totalBalance,

                shift1Discount,

                shift2Discount,

                totalDiscount,

                shift1Expense,

                shift2Expense,

                totalExpense,

                easypaisa,

                finalClosingCash,

                combinedTiming
            });
        });

        // ==========================================
        // SORT OLD → NEW
        // ==========================================

        rows.sort(
            (a, b) =>
                a.dateMs -
                b.dateMs
        );

        // ==========================================
        // NO DATA
        // ==========================================

        if (!rows.length) {

            box.innerHTML = `
                <div class="empty-report">
                    No report data found
                    for selected date range.
                </div>
            `;

            return;
        }

        // ==========================================
        // GRAND TOTALS
        // ==========================================

        const totals = {

            shift1Collection: 0,
            shift2Collection: 0,
            totalCollection: 0,

            shift1Balance: 0,
            shift2Balance: 0,
            totalBalance: 0,

            shift1Discount: 0,
            shift2Discount: 0,
            totalDiscount: 0,

            shift1Expense: 0,
            shift2Expense: 0,
            totalExpense: 0,

            easypaisa: 0,
            finalClosingCash: 0
        };

        rows.forEach(r => {

            Object.keys(totals)
                .forEach(key => {

                    totals[key] +=
                        Number(
                            r[key] || 0
                        );
                });
        });

        // ==========================================
        // TABLE HTML
        // ==========================================

        let tableRows = "";

        rows.forEach(r => {

            tableRows += `

                <tr>

                    <td>
                        ${r.date}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift1Collection
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift2Collection
                        )}
                    </td>

                    <td class="total-cell">
                        Rs ${formatMoney(
                            r.totalCollection
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift1Balance
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift2Balance
                        )}
                    </td>

                    <td class="total-cell">
                        Rs ${formatMoney(
                            r.totalBalance
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift1Discount
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift2Discount
                        )}
                    </td>

                    <td class="total-cell">
                        Rs ${formatMoney(
                            r.totalDiscount
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift1Expense
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.shift2Expense
                        )}
                    </td>

                    <td class="total-cell">
                        Rs ${formatMoney(
                            r.totalExpense
                        )}
                    </td>

                    <td>
                        Rs ${formatMoney(
                            r.easypaisa
                        )}
                    </td>

                    <td class="closing-cell">
                        Rs ${formatMoney(
                            r.finalClosingCash
                        )}
                    </td>

                    <td>
                        ${r.combinedTiming}
                    </td>

                </tr>
            `;
        });

        // ==========================================
        // REPORT OUTPUT
        // ==========================================

        box.innerHTML = `

            <div class="report-section-title">
                🎱 Game Report
            </div>

            <div class="report-table-wrapper">

                <table class="report-table">

                    <thead>

                        <tr>

                            <th>Date</th>

                            <th>Shift 1<br>Collection</th>

                            <th>Shift 2<br>Collection</th>

                            <th>Total<br>Collection</th>

                            <th>Shift 1<br>Balance</th>

                            <th>Shift 2<br>Balance</th>

                            <th>Total<br>Balance</th>

                            <th>Shift 1<br>Discount</th>

                            <th>Shift 2<br>Discount</th>

                            <th>Total<br>Discount</th>

                            <th>Shift 1<br>Expense</th>

                            <th>Shift 2<br>Expense</th>

                            <th>Total<br>Expense</th>

                            <th>EasyPaisa</th>

                            <th>Final<br>Closing Cash</th>

                            <th>Combined<br>Timing</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${tableRows}

                    </tbody>

                    <tfoot>

                        <tr>

                            <th>
                                Total Summary
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift1Collection
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift2Collection
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.totalCollection
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift1Balance
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift2Balance
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.totalBalance
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift1Discount
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift2Discount
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.totalDiscount
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift1Expense
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.shift2Expense
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.totalExpense
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.easypaisa
                                )}
                            </th>

                            <th>
                                Rs ${formatMoney(
                                    totals.finalClosingCash
                                )}
                            </th>

                            <th>
                                —
                            </th>

                        </tr>

                    </tfoot>

                </table>

            </div>

        `;
    }

    catch (error) {

        console.error(
            "❌ GAME REPORT ERROR:",
            error
        );

        box.innerHTML = `
            <div class="empty-report">
                Error loading Game Report.
                Check Console.
            </div>
        `;
    }
}

// ======================================================
// REPORT HELPERS
// ======================================================

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PK"
    );
}


function formatReportDate(date) {

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Karachi"
        }
    );
}


function formatTime(value) {

    if (!value) return "-";

    let date;

    if (
        typeof value === "number"
    ) {

        date =
            new Date(value);

    }

    else if (
        value?.seconds
    ) {

        date =
            new Date(
                value.seconds * 1000
            );

    }

    else {

        date =
            new Date(value);
    }

    if (
        isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Karachi"
        }
    );
}




async function loadCanteenReport() {

    let dates = getDates();
    if (!dates) return;

let branch = REPORT_BRANCH;

    let box =
        document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        const snap = await getDocs(

            query(
                collection(window.db, "canteen_logs"),
                where("branch", "==", branch)
            )
        );

        let total = 0;

        let itemsHtml = "";

        snap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {

                date = new Date(
                    d.created_at.seconds * 1000
                );

            } else {

                date = new Date(d.created_at);
            }

            if (
                date < dates.from ||
                date > dates.to
            ) return;

            total += Number(d.total || 0);

            itemsHtml += `
                <tr>
                    <td>${d.item_name || "-"}</td>
                    <td>${d.qty || 0}</td>
                    <td>${d.total || 0}</td>
                </tr>
            `;
        });

        box.innerHTML = `

            <h2>Canteen Report</h2>

            <div class="report-card">
                <b>Total Canteen Income:</b>
                Rs ${total}
            </div>

            <hr>

            <table class="report-table">

                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Total</th>
                </tr>

                ${itemsHtml}

            </table>
        `;

    } catch (err) {

        console.error(err);

        box.innerHTML =
            "Error loading canteen report";
    }
}

/// PRINTING FUNCTION report thermal printer

function printReportThermal() {

    let content = document.getElementById("reportOutput").innerHTML;

    let win = window.open("", "", "width=300,height=600");

    win.document.write(`
    <html>
    <head>
        <title>Print</title>
        <style>
            body { font-family: monospace; width: 250px; margin:auto; }
            .center { text-align:center; }
            hr { border:1px dashed #000; margin:5px 0; }
            .report-card { margin-bottom:10px; }
        </style>
    </head>
    <body>

        <div class="center">
            <h3>Rasson Snooker Areena</h3>
            <small>${REPORT_BRANCH}</small>
        </div>

        <hr>

        ${content}

        <hr>

        <div class="center">
            ${new Date().toLocaleString()}
        </div>

        <script>
            window.onload = function() {
                window.print();
                window.close();
            }
        </script>

    </body>
    </html>
    `);

    win.document.close();
}
async function loadInventoryReport() {

    let dates = getDates();
    if (!dates) return;

let branch = REPORT_BRANCH;

    let box =
        document.getElementById("reportOutput");

    box.innerHTML = "Loading...";

    try {

        const snap = await getDocs(

            query(
                collection(window.db, "inventory_logs"),
                where("branch", "==", branch)
            )
        );

        let added = 0;
        let sold = 0;
        let deleted = 0;

        let addItems = [];
        let soldItems = [];

        snap.forEach(doc => {

            let d = doc.data();

            let date;

            if (d.created_at?.seconds) {

                date = new Date(
                    d.created_at.seconds * 1000
                );

            } else {

                date = new Date(d.created_at);
            }

            if (
                date < dates.from ||
                date > dates.to
            ) return;

            // =====================
            // ADD
            // =====================

            if (d.type === "add") {

                added += Number(d.qty || 0);

                addItems.push(`
                    <tr>
                        <td>${d.item_name}</td>
                        <td>${d.qty}</td>
                    </tr>
                `);
            }

            // =====================
            // DELETE
            // =====================

            if (d.type === "delete") {

                deleted += Number(d.qty || 0);
            }

            // =====================
            // SALE
            // =====================

            if (d.type === "sale") {

                sold += Number(d.qty || 0);

                soldItems.push(`
                    <tr>
                        <td>${d.item_name}</td>
                        <td>${d.qty}</td>
                    </tr>
                `);
            }
        });

        let remaining =
            added - sold - deleted;

        box.innerHTML = `

            <h2>Inventory Report</h2>

            <div class="report-card">
                <b>Total Added:</b>
                ${added}
            </div>

            <div class="report-card">
                <b>Total Sold:</b>
                  ${sold}
            </div>

            <div class="report-card">
                <b>Total Deleted:</b>
                ${deleted}
            </div>

            <div class="report-card">
                <b>Remaining Stock:</b>
                ${remaining}
            </div>

            <hr>

            <h3>Added Items</h3>

            <table class="report-table">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                </tr>

                ${addItems.join("")}
            </table>

            <hr>

            <h3>Sold Items</h3>

            <table class="report-table">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                </tr>

                ${soldItems.join("")}
            </table>
        `;

    } catch (err) {

        console.error(err);

        box.innerHTML =
            "Error loading inventory report";
    }
}

document.getElementById("printReportBtn").onclick = printReportThermal;
