const fs = require('fs');

// 1. UPDATE menuData.js
const newMenuData = `const menuData = {
    "Non-Veg Rolls": [
        { name: "Egg Roll", price: 50 },
        { name: "Dbl. Egg Roll", price: 70 },
        { name: "Dbl. Egg Cheese Roll", price: 80 },
        { name: "Chicken Roll", price: 90 },
        { name: "Dbl. Chicken Roll", price: 110 },
        { name: "Malai Chicken Roll", price: 100 },
        { name: "Chicken Tikka Roll", price: 150 },
        { name: "Chicken Seekh Roll", price: 90 }
    ],
    "Veg Rolls": [
        { name: "Aloo Tikki Roll", price: 50 },
        { name: "Soya Malai Roll", price: 60 },
        { name: "Paneer Roll", price: 80 },
        { name: "Dbl. Paneer Roll", price: 100 },
        { name: "Malai Paneer Roll", price: 90 },
        { name: "Paneer Tikka Roll", price: 120 }
    ],
    "Tandoori Starters": [
        { name: "Chicken Tikka (6 pcs)", price: 180 },
        { name: "Malai Tikka (6 pcs)", price: 200 },
        { name: "Paneer Tikka (6 pcs)", price: 160 },
        { name: "Soya Chaap", price: 150 },
        { name: "Tandoori Chicken (Half)", price: 220 },
        { name: "Tandoori Chicken (Full)", price: 400 }
    ],
    "Main Course": [
        { name: "Butter Chicken", price: 250 },
        { name: "Kadhai Paneer", price: 220 },
        { name: "Dal Makhani", price: 180 },
        { name: "Chicken Curry", price: 230 }
    ],
    "Breads & Rice": [
        { name: "Rumali Roti", price: 15 },
        { name: "Tandoori Roti", price: 12 },
        { name: "Butter Naan", price: 40 },
        { name: "Garlic Naan", price: 50 },
        { name: "Jeera Rice", price: 90 },
        { name: "Chicken Biryani", price: 200 }
    ],
    "Beverages": [
        { name: "Coke (250ml)", price: 30 },
        { name: "Sprite (250ml)", price: 30 },
        { name: "Sweet Lassi", price: 50 },
        { name: "Masala Chaas", price: 40 }
    ]
};

const addonMap = {
    "1": { name: "Extra Mayonnaise", price: 10 },
    "2": { name: "Wheat Base", price: 0 },
    "3": { name: "Cheese Slice", price: 20 },
    "4": { name: "Schezwan Sauce", price: 10 },
    "5": { name: "Extra Butter", price: 15 },
    "6": { name: "Extra Green Chutney", price: 0 }
};

module.exports = { menuData, addonMap };
`;
fs.writeFileSync('menuData.js', newMenuData);


// 2. UPDATE server.js
let code = fs.readFileSync('server.js', 'utf8');

// Replace the Menu Trigger
const menuTriggerRegex = /await sendWhatsAppMessage\(from,[\s\S]*?`🍽️ \*Lazeez Kalkata's Menu\* 🌯\\n` \+[\s\S]*?return res\.sendStatus\(200\);\n        }/;
const newMenuTrigger = `const categories = Object.keys(menuData);
            let menuText = \`🍽️ *Lazeez Kalkata's Menu* 🌯\\n⚡ Free Delivery | Min Order ₹100/-\\n\\n\`;
            categories.forEach((cat, index) => {
                menuText += \`\${index + 1}️⃣ \${cat}\\n\`;
            });
            menuText += \`\\nReply with a number (1-\${categories.length}), or just type what you want (e.g. "Chicken Roll").\\n🌐 Or Order Online: https://menu.yarora.dev\`;
            
            await sendWhatsAppMessage(from, menuText);
            return res.sendStatus(200);
        }`;
code = code.replace(menuTriggerRegex, newMenuTrigger);

// Replace Fuzzy Search logic
const fuzzySearchRegex = /const allItems = \[\.\.\.menuData\["non-veg"\], \.\.\.menuData\["veg"\]\];/;
const newFuzzySearch = `let allItems = [];
                Object.values(menuData).forEach(cat => allItems.push(...cat));`;
code = code.replace(fuzzySearchRegex, newFuzzySearch);


// Replace CATEGORY SELECTION logic
const categorySelectionRegex = /\/\/ --- CATEGORY SELECTION ---[\s\S]*?\/\/ --- ITEM SELECTION BY NUMBER ---/;
const newCategorySelection = `// --- CATEGORY SELECTION ---
        const categories = Object.keys(menuData);
        if (session.state === "MAIN_MENU" && /^\\d+$/.test(input)) {
            const catIndex = parseInt(input) - 1;
            if (catIndex >= 0 && catIndex < categories.length) {
                const selectedCat = categories[catIndex];
                session.state = "CAT_" + catIndex;
                saveSession();
                
                let text = \`📋 *\${selectedCat.toUpperCase()}*\\n\\n\`;
                menuData[selectedCat].forEach((item, idx) => text += \`\${idx + 1}. \${item.name} — ₹\${item.price}\\n\`);
                text += \`\\nReply with a number (1-\${menuData[selectedCat].length}) to select, or *MENU* to go back.\`;
                
                await sendWhatsAppMessage(from, text);
                return res.sendStatus(200);
            }
        }

        // --- ITEM SELECTION BY NUMBER ---`;
code = code.replace(categorySelectionRegex, newCategorySelection);


// Replace ITEM SELECTION logic
const itemSelectionRegex = /\/\/ --- ITEM SELECTION BY NUMBER ---[\s\S]*?\/\/ --- SELECT QUANTITY ---/;
const newItemSelection = `// --- ITEM SELECTION BY NUMBER ---
        if (session.state.startsWith("CAT_") && /^\\d+$/.test(input)) {
            const catIndex = parseInt(session.state.split("_")[1]);
            const selectedCat = categories[catIndex];
            const cat = menuData[selectedCat];
            
            const idx = parseInt(input) - 1;
            if (cat && cat[idx]) {
                session.currentItem = { name: cat[idx].name, price: cat[idx].price, quantity: 1, selectedAddons: [] };
                session.state = "SELECT_QUANTITY";
                saveSession();
                await sendWhatsAppMessage(from, \`🎯 Selected: *\${cat[idx].name}*\\nHow many would you like? (Reply with a number)\`);
            } else {
                await sendWhatsAppMessage(from, \`Invalid number. Please try again.\`);
            }
            return res.sendStatus(200);
        }

        // --- SELECT QUANTITY ---`;
code = code.replace(itemSelectionRegex, newItemSelection);


// Replace MAIN_MENU fallback reorder
const mainMenuFallbackRegex = /await sendWhatsAppMessage\(from, `No problem! Reply with \*1\* for Non-Veg Rolls or \*2\* for Veg Rolls.`\);/;
const newMainMenuFallback = `await sendWhatsAppMessage(from, \`No problem! Reply with *MENU* to browse the full menu.\`);`;
code = code.replace(mainMenuFallbackRegex, newMainMenuFallback);

fs.writeFileSync('server.js', code);
console.log("Complete dynamic menu data injected successfully!");
