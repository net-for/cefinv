
// State
let activeSlot = null;
let inventoryData = [];
const TOTAL_SLOTS = 25; // Main grid size (5x5)

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    generateSlots();
    setupEventListeners();

    // Test Mode (Remove in production)
    // testFill(); 
});

if (window.cef) {
    cef.on("inventory:clear", clearInventory);
    cef.on("inventory:setStats", updateStats);
    cef.on("inventory:addItem", addItem);
    cef.on("inventory:addUsedItem", addUsedItem);
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

    // Quick Slots (first 5 or separate?)
    // In design quick slots are at bottom.
    // Let's assume Quick Slots are slots 0-4, or separate indices.
    // For now, I'll generate visual placeholders for quick slots 1-5
    const quickGrid = document.getElementById('quick-slots');
    quickGrid.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = 100 + i; // Special index for quick slots if needed
        // But usually Quick slots *map* to inventory slots.
        // Let's assume indices 0-4 are quick slots.
        // So I'll just clone or reference them?
        // Actually, let's treat them as separate visual slots but maybe mapping to id 0-4.

        const num = document.createElement('div');
        num.className = 'quick-slot-number';
        num.innerText = i + 1;
        slot.appendChild(num);

        quickGrid.appendChild(slot);
    }
}

function clearInventory() {
    console.log("Clearing inventory");
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        // Clear content except quick slot number
        const num = slot.querySelector('.quick-slot-number');
        slot.innerHTML = '';
        if (num) slot.appendChild(num);

        slot.classList.remove('active');
        delete slot.dataset.model;
    });
    inventoryData = [];
    document.getElementById('current-weight').innerText = 0;
}

function updateStats(skin, name, health, armour, money) {
    document.getElementById('player-money').innerText = '$' + money.toLocaleString();
    document.getElementById('player-id').innerText = 'ID'; // Or pass ID if available
    // Could update visual character preview if capable
}

function addItem(slotIndex, model, amount, name, useText) {
    // console.log(`Add item: ${name} at ${slotIndex}`);

    // Determine if it's in quick slots range (e.g. 0-4) or main grid
    // If we map 0-4 to Quick Slots, and 5-24 to Grid?
    // The PAWN loop goes 0 to 50.
    // If the grid shows 0-24, and Quick slots are 0-4 (duplicated?)
    // Let's render 0-24 in the MAIN grid.

    // Main Grid Slot
    if (slotIndex < TOTAL_SLOTS) {
        renderItemInSlot('inventory-grid', slotIndex, model, amount, name);
    }

    // Check if it should also appear in Quick Slots (if 0-4)
    if (slotIndex < 5) {
        // renderItemInSlot('quick-slots', slotIndex, model, amount, name);
        // Quick slots logic might need specific targeting since quick-slots children are 0-4
        const quickContainer = document.getElementById('quick-slots');
        if (quickContainer.children[slotIndex]) {
            const slot = quickContainer.children[slotIndex];
            updateSlotContent(slot, model, amount, name);
        }
    }

    inventoryData[slotIndex] = { model, amount, name, useText };
    updateWeight();
}

function addUsedItem(slotIndex, model) {
    // Render in Accessories grid
    // We haven't generated accessories grid yet, let's just log or ignore for MVP
    // Or generate on fly
}

function renderItemInSlot(gridId, index, model, amount, name) {
    const grid = document.getElementById(gridId);
    if (!grid || !grid.children[index]) return;

    const slot = grid.children[index];
    updateSlotContent(slot, model, amount, name);
}

function updateSlotContent(slot, model, amount, name) {
    // Image
    let img = slot.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        slot.appendChild(img);
    }
    img.src = `assets/items/${model}.png`;
    // Fallback to a generic box icon if specific item image is missing
    img.onerror = () => { img.src = 'https://img.icons8.com/fluency/96/open-box.png'; };

    // Count
    let count = slot.querySelector('.slot-count');
    if (!count) {
        count = document.createElement('div');
        count.className = 'slot-count';
        slot.appendChild(count);
    }
    count.innerText = amount > 1 ? `x${amount}` : '';

    // Name
    let nameEl = slot.querySelector('.slot-name');
    if (!nameEl) {
        nameEl = document.createElement('div');
        nameEl.className = 'slot-name';
        slot.appendChild(nameEl);
    }
    nameEl.innerText = name;

    slot.dataset.model = model;
}

function updateWeight() {
    // Simple weight calc: 1 item = 1kg? Or need weight param.
    // User image shows "94 / 100".
    // I'll just count items for now or use randomness if data missing
    const current = inventoryData.filter(x => x).length * 2; // placeholder
    document.getElementById('current-weight').innerText = current;
}

function onSlotClick(index) {
    hideContextMenu();
    // Highlight
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

    // Update button text?
    // const useBtn = menu.children[1];
    // useBtn.innerText = item.useText || "USE";
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
    activeSlot = null;
}

function useItem() {
    if (activeSlot !== null) {
        if (window.cef) {
            cef.emit("inventory:useItem", activeSlot);
        }
        hideContextMenu();
    }
}

function dropItem() {
    // Not implemented in PAWN yet
    hideContextMenu();
}

function giveItem() {
    // Not implemented
    hideContextMenu();
}

function closeInventory() {
    if (window.cef) {
        cef.emit("inventory:close");
    }
    // Also hide locally?
    // document.body.style.display = 'none';
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
