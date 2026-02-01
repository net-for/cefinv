
// State
let activeSlot = null;
let inventoryData = [];
const TOTAL_SLOTS = 25;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    generateSlots();
    generateAccessorySlots();
    setupEventListeners();
});

if (window.cef) {
    // New bulk events
    cef.on("inventory:setItems", setItems);
    cef.on("inventory:setAccessories", setAccessories);
    cef.on("inventory:setStats", updateStats);
    // Legacy support if needed, but we use bulk now
    cef.on("inventory:clear", clearInventory);
}

function generateSlots() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        slot.onclick = () => onSlotClick(i);
        slot.oncontextmenu = (e) => onSlotRightClick(e, i);
        grid.appendChild(slot);
    }

    // Quick Slots
    const quickGrid = document.getElementById('quick-slots');
    quickGrid.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i; // Map to first 5 slots based on index

        const num = document.createElement('div');
        num.className = 'quick-slot-number';
        num.innerText = i + 1;
        slot.appendChild(num);

        quickGrid.appendChild(slot);
    }

    inventoryData = new Array(TOTAL_SLOTS).fill(null);
}

function generateAccessorySlots() {
    const grid = document.getElementById('accessories-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // 8 Accessory slots
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot accessory-slot';
        slot.dataset.accIndex = i;
        grid.appendChild(slot);
    }
}

function updateStats(skin, name, health, armour, money) {
    document.getElementById('player-money').innerText = '$' + money.toLocaleString();
    if (document.getElementById('player-id'))
        document.getElementById('player-id').innerText = name;
}

function clearInventory() {
    const slots = document.querySelectorAll('#inventory-grid .slot');
    slots.forEach(s => clearSlot(s));

    const quickSlots = document.querySelectorAll('#quick-slots .slot');
    quickSlots.forEach(s => clearSlot(s));

    inventoryData = new Array(TOTAL_SLOTS).fill(null);
    document.getElementById('current-weight').innerText = 0;
    const bar = document.getElementById('weight-bar');
    if (bar) bar.style.width = '0%';
}

function clearSlot(slot) {
    const num = slot.querySelector('.quick-slot-number');
    slot.innerHTML = '';
    if (num) slot.appendChild(num);
    slot.classList.remove('active');
    delete slot.dataset.model;
}

function setItems(jsonString) {
    clearInventory();
    let totalItems = 0;

    try {
        const items = JSON.parse(jsonString);
        items.forEach(item => {
            if (item.slot < TOTAL_SLOTS) {
                // Render in main grid
                renderItemInSlot('inventory-grid', item.slot, item.model, item.amount, item.name);

                // Render in quick slots if applicable
                if (item.slot < 5) {
                    renderItemInSlot('quick-slots', item.slot, item.model, item.amount, item.name);
                }

                inventoryData[item.slot] = item;
                totalItems++;
            }
        });
    } catch (e) {
        console.error("JSON Parse error", e);
    }

    updateWeight();
}

function setAccessories(jsonString) {
    const grid = document.getElementById('accessories-grid');
    if (!grid) return;

    Array.from(grid.children).forEach(s => s.innerHTML = '');

    try {
        const accs = JSON.parse(jsonString);
        accs.forEach(item => {
            if (grid.children[item.slot]) {
                const slot = grid.children[item.slot];
                updateSlotContent(slot, item.model, 1, "");
            }
        });
    } catch (e) { console.error(e); }
}

function renderItemInSlot(gridId, index, model, amount, name) {
    const grid = document.getElementById(gridId);
    if (!grid || !grid.children[index]) return;

    const slot = grid.children[index];
    updateSlotContent(slot, model, amount, name);
}

function updateSlotContent(slot, model, amount, name) {
    let img = document.createElement('img');
    img.src = `assets/items/${model}.png`;
    img.onerror = () => { img.src = 'https://img.icons8.com/fluency/96/open-box.png'; };
    slot.appendChild(img);

    if (amount > 1) {
        let count = document.createElement('div');
        count.className = 'slot-count';
        count.innerText = `x${amount}`;
        slot.appendChild(count);
    }

    if (name) {
        let nameEl = document.createElement('div');
        nameEl.className = 'slot-name';
        nameEl.innerText = name;
        slot.appendChild(nameEl);
    }

    slot.dataset.model = model;
}

function updateWeight() {
    const filledSlots = inventoryData.filter(x => x).length;
    const weight = filledSlots * 2; // placeholder weight calc

    document.getElementById('current-weight').innerText = weight;

    const percent = Math.min((weight / 64) * 100, 100);
    const bar = document.getElementById('weight-bar');
    if (bar) {
        bar.style.width = `${percent}%`;

        if (percent > 90) bar.style.background = '#e74c3c'; // Red
        else if (percent > 70) bar.style.background = '#f1c40f'; // Yellow
        else bar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)'; // Green
    }
}

function onSlotClick(index) {
    hideContextMenu();
}

function onSlotRightClick(e, index) {
    e.preventDefault();
    const item = inventoryData[index];
    if (!item) return;

    activeSlot = index;
    showContextMenu(e.clientX, e.clientY, item);
}

function showContextMenu(x, y, item) {
    const menu = document.getElementById('context-menu');
    menu.style.display = 'flex';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    document.getElementById('context-item-name').innerText = item.name;
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
    activeSlot = null;
}

function useItem() {
    if (activeSlot !== null) {
        if (window.cef) cef.emit("inventory:useItem", activeSlot);
        hideContextMenu();
    }
}

function dropItem() {
    if (activeSlot !== null) {
        if (window.cef) cef.emit("inventory:dropItem", activeSlot);
        hideContextMenu();
    }
}

function giveItem() {
    hideContextMenu();
}

function closeInventory() {
    if (window.cef) cef.emit("inventory:close");
}

function setupEventListeners() {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.slot')) {
            hideContextMenu();
        }
    });

    document.onkeydown = (e) => {
        if (e.key === "Escape" || e.key === "m") {
            closeInventory();
        }
    };
}
