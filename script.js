
// State
let currentPage = 1;
const ITEMS_PER_PAGE = 25;
const TOTAL_PAGES = 2; // Fixed for 50 slots
let inventoryData = []; // Sparse array of items
let activeSlotIndex = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Generate empty grid for Page 1 initial
    renderGrid();
    setupEventListeners();
});

if (window.cef) {
    cef.on("inventory:setItems", setItems);
    cef.on("inventory:setAccessories", setAccessories);
    cef.on("inventory:setStats", updateStats);
    cef.on("inventory:clear", () => setItems("[]")); // Legacy clear
}

function renderGrid() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    // Create 25 fixed slots
    for (let i = 0; i < ITEMS_PER_PAGE; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';

        // Calculate actual inventory index based on page
        const actualIndex = ((currentPage - 1) * ITEMS_PER_PAGE) + i;
        slot.dataset.index = actualIndex;

        slot.onclick = () => onSlotClick(actualIndex);
        slot.oncontextmenu = (e) => onSlotRightClick(e, actualIndex);

        // Content placeholder
        grid.appendChild(slot);
    }

    // Update Page Indicator
    document.getElementById('page-indicator').innerText = `PAGE ${currentPage} / ${TOTAL_PAGES}`;

    // Fill with data if available
    fillGridWithData();
}

function fillGridWithData() {
    // Loop through current page slots
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    const slots = document.getElementById('inventory-grid').children;

    for (let i = 0; i < ITEMS_PER_PAGE; i++) {
        const slotIndex = start + i;
        const item = inventoryData[slotIndex];
        const uiSlot = slots[i];

        // Clear UI slot
        uiSlot.innerHTML = '';
        uiSlot.className = 'slot';
        delete uiSlot.dataset.model;

        if (item) {
            // Render Item
            const img = document.createElement('img');
            img.src = `assets/items/${item.model}.png`;
            img.onerror = () => { img.src = 'https://img.icons8.com/fluency/96/open-box.png'; };
            uiSlot.appendChild(img);

            if (item.amount > 1) {
                const count = document.createElement('div');
                count.className = 'slot-count';
                count.innerText = `x${item.amount}`;
                uiSlot.appendChild(count);
            }

            const name = document.createElement('div');
            name.className = 'slot-name';
            name.innerText = item.name;
            uiSlot.appendChild(name);

            uiSlot.dataset.model = item.model;
        }
    }
}

function setItems(jsonString) {
    inventoryData = []; // Clear current data
    let totalItems = 0;

    try {
        const items = JSON.parse(jsonString);
        items.forEach(item => {
            inventoryData[item.slot] = item;
            totalItems++;
        });
    } catch (e) {
        console.error("JSON Parse error", e);
    }

    // Refresh View
    fillGridWithData();
    updateWeight(totalItems);
}

function setAccessories(jsonString) {
    const grid = document.getElementById('accessories-grid');
    grid.innerHTML = '';

    // Pre-generate 4-6 equip slots? Or just fill?
    // Let's make fixed 4 slots for equipment preview
    for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        grid.appendChild(slot);
    }

    try {
        const accs = JSON.parse(jsonString);
        accs.forEach((item, index) => {
            if (index < 4) { // Limit to 4 visual slots for now
                const uiSlot = grid.children[index];
                if (uiSlot) {
                    const img = document.createElement('img');
                    img.src = `assets/items/${item.model}.png`;
                    uiSlot.appendChild(img);
                }
            }
        });
    } catch (e) { console.error(e); }
}

function updateStats(skin, name, health, armour, money) {
    document.getElementById('player-money').innerText = '$' + money.toLocaleString();
    if (document.getElementById('player-id'))
        document.getElementById('player-id').innerText = 'ID: ' + name;
}

function updateWeight(itemCount) {
    // 0-64 KG. 
    // Logic: itemCount * 1.5? Or just count.
    const weight = itemCount * 2; // Placeholder logic
    document.getElementById('weight-text').innerText = `${weight} / 64 KG`;

    const percent = Math.min((weight / 64) * 100, 100);
    const bar = document.getElementById('weight-bar');
    bar.style.width = `${percent}%`;

    if (percent > 90) bar.style.background = '#e74c3c';
    else bar.style.background = '#3498db';
}

// Pagination
window.prevPage = function () {
    if (currentPage > 1) {
        currentPage--;
        renderGrid();
    }
}

window.nextPage = function () {
    if (currentPage < TOTAL_PAGES) {
        currentPage++;
        renderGrid();
    }
}

// Interactions
function onSlotClick(index) {
    hideContextMenu();
}

function onSlotRightClick(e, index) {
    e.preventDefault();
    const item = inventoryData[index];
    if (!item) return;

    activeSlotIndex = index;

    // Highlight active
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.remove('active-context'));
    e.currentTarget.classList.add('active-context');

    showContextMenu(e.clientX, e.clientY, item);
}

function showContextMenu(x, y, item) {
    const menu = document.getElementById('context-menu');
    menu.style.display = 'flex';

    // Bounds check
    if (x + 140 > window.innerWidth) x -= 140;
    if (y + 120 > window.innerHeight) y -= 120;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    document.getElementById('context-item-name').innerText = item.name;
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.remove('active-context'));
    activeSlotIndex = null;
}

window.useItem = function () {
    if (activeSlotIndex !== null) {
        if (window.cef) cef.emit("inventory:useItem", activeSlotIndex);
        hideContextMenu();
    }
}

window.dropItem = function () {
    if (activeSlotIndex !== null) {
        if (window.cef) cef.emit("inventory:dropItem", activeSlotIndex);
        hideContextMenu();
    }
}

window.giveItem = function () {
    // Todo
    hideContextMenu();
}

// Close
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
