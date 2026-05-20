import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("INVENTORY JS LOADED");

const currentBranch = localStorage.getItem("branch") || "rasson1";
let inventoryData = [];
let selectedItemId = null;

// ==========================
// LOAD INVENTORY
// ==========================
document.addEventListener("DOMContentLoaded", loadInventory);

async function loadInventory() {
    try {
        const q = query(
            collection(window.db, "inventory"),
            where("branch", "==", currentBranch)
        );

        const snap = await getDocs(q);

        inventoryData = [];

        snap.forEach(docSnap => {
            inventoryData.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        renderInventory();

    } catch (err) {
        console.error("LOAD ERROR:", err);
    }
}

// ==========================
// RENDER
// ==========================
function renderInventory() {
    const body = document.getElementById("inventoryBody");
    body.innerHTML = "";

    inventoryData.forEach(item => {
        body.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.stock}</td>
                <td>${item.price}</td>
                <td>${item.selling_price}</td>
                <td>
                    <button class="btn-green" onclick="openEditPopup('${item.id}')">Edit</button>
                    <button class="btn-red" onclick="openDeletePopup('${item.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// ==========================
// POPUPS (GLOBAL)
// ==========================
window.openAddPopup = function () {
    document.getElementById("addPopup").classList.remove("hide");
};

window.closeAddPopup = function () {
    document.getElementById("addPopup").classList.add("hide");
};

window.openEditPopup = function (id) {
    selectedItemId = id;

    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    document.getElementById("editName").value = item.name;
    document.getElementById("editQty").value = item.stock;
    document.getElementById("editCost").value = item.price;
    document.getElementById("editSell").value = item.selling_price;

    document.getElementById("editPopup").classList.remove("hide");
};

window.closeEditPopup = function () {
    document.getElementById("editPopup").classList.add("hide");
};

window.openDeletePopup = function (id) {
    selectedItemId = id;
    document.getElementById("deletePopup").classList.remove("hide");
};

window.closeDeletePopup = function () {
    document.getElementById("deletePopup").classList.add("hide");
};

// ==========================
// CRUD
// ==========================
window.saveNewItem = async function () {
    try {
        const name = document.getElementById("newName").value.trim();
        const qty = Number(document.getElementById("newQty").value);

        if (!name || qty <= 0) {
            alert("Invalid item data");
            return;
        }

        await addDoc(collection(window.db, "inventory"), {
    name,
    stock: qty,
    price: Number(document.getElementById("newCost").value),
    selling_price: Number(document.getElementById("newSell").value),
    branch: currentBranch
});

// ✅ INVENTORY LOG
await addDoc(collection(window.db, "inventory_logs"), {

    item_name: name,
    qty: qty,
    type: "add",
    price: Number(document.getElementById("newCost").value),
    selling_price: Number(document.getElementById("newSell").value),
    branch: currentBranch,
    created_at: new Date().toISOString()
});

        closeAddPopup();
        loadInventory();

    } catch (err) {
        console.error("ADD ERROR:", err);
    }
};

window.updateItem = async function () {

    try {

        const itemName =
            document.getElementById("editName").value;

        const newQty =
            Number(document.getElementById("editQty").value);

        await updateDoc(
            doc(window.db, "inventory", selectedItemId),
            {
                name: itemName,
                stock: newQty,
                price: Number(document.getElementById("editCost").value),
                selling_price: Number(document.getElementById("editSell").value)
            }
        );

        // ✅ INVENTORY LOG
        await addDoc(collection(window.db, "inventory_logs"), {

            item_name: itemName,
            qty: newQty,
            type: "edit",
            branch: currentBranch,
            created_at: new Date().toISOString()
        });

        closeEditPopup();
        loadInventory();

    } catch (err) {

        console.error("UPDATE ERROR:", err);
    }
};

window.confirmDelete = async function () {

    try {

        const item =
            inventoryData.find(i => i.id === selectedItemId);

        // ✅ INVENTORY LOG
        if (item) {

            await addDoc(collection(window.db, "inventory_logs"), {

                item_name: item.name,
                qty: item.stock,
                type: "delete",
                branch: currentBranch,
                created_at: new Date().toISOString()
            });
        }

        await deleteDoc(
            doc(window.db, "inventory", selectedItemId)
        );

        closeDeletePopup();
        loadInventory();

    } catch (err) {

        console.error("DELETE ERROR:", err);
    }
};
