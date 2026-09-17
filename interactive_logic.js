const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. UPDATE MAIN MENU (Send Category List)
const mainMenuRegex = /const categories = Object\.keys\(menuData\);[\s\S]*?await sendWhatsAppMessage\(from, menuText\);/;
const newMainMenu = `const categories = Object.keys(menuData);
            
            const rows = categories.map((cat, idx) => ({
                id: \`cat_\${idx}\`,
                title: cat.substring(0, 24)
            })).slice(0, 10); // WhatsApp limit 10 per section

            await sendWhatsAppInteractive(from, {
                type: "list",
                header: { type: "text", text: \`Welcome, \${user.name}! 👋\` },
                body: { text: "🍽️ *Lazeez Kalkata's Menu* 🌯\\n⚡ Free Delivery | Min Order ₹100/-" },
                action: {
                    button: "Browse Menu",
                    sections: [
                        { title: "Menu Categories", rows: rows }
                    ]
                }
            });`;
code = code.replace(mainMenuRegex, newMainMenu);


// 2. UPDATE CATEGORY SELECTION -> SHOW ITEM LIST
const categoryRegex = /\/\/ --- CATEGORY SELECTION ---[\s\S]*?\/\/ --- ITEM SELECTION BY NUMBER ---/;
const newCategoryLogic = `// --- CATEGORY SELECTION ---
        const categories = Object.keys(menuData);
        if (session.state === "MAIN_MENU" && input.startsWith("cat_")) {
            const catIndex = parseInt(input.split("_")[1]);
            if (catIndex >= 0 && catIndex < categories.length) {
                const selectedCat = categories[catIndex];
                session.state = "CAT_" + catIndex;
                saveSession();
                
                const rows = menuData[selectedCat].slice(0, 10).map((item, idx) => ({
                    id: \`item_\${idx}\`,
                    title: item.name.substring(0, 24),
                    description: \`₹\${item.price}\`
                }));

                await sendWhatsAppInteractive(from, {
                    type: "list",
                    body: { text: \`📋 *\${selectedCat.toUpperCase()}*\\nSelect an item:\` },
                    action: {
                        button: "View Items",
                        sections: [
                            { title: selectedCat.substring(0, 24), rows: rows }
                        ]
                    }
                });
                return res.sendStatus(200);
            }
        }

        // --- ITEM SELECTION BY NUMBER ---`;
code = code.replace(categoryRegex, newCategoryLogic);

// 3. UPDATE ITEM SELECTION -> ASK QUANTITY
const itemRegex = /\/\/ --- ITEM SELECTION BY NUMBER ---[\s\S]*?\/\/ --- SELECT QUANTITY ---/;
const newItemLogic = `// --- ITEM SELECTION BY NUMBER ---
        if (session.state.startsWith("CAT_") && input.startsWith("item_")) {
            const catIndex = parseInt(session.state.split("_")[1]);
            const selectedCat = categories[catIndex];
            const cat = menuData[selectedCat];
            
            const idx = parseInt(input.split("_")[1]);
            if (cat && cat[idx]) {
                session.currentItem = { name: cat[idx].name, price: cat[idx].price, quantity: 1, selectedAddons: [] };
                session.state = "SELECT_QUANTITY";
                saveSession();
                
                const rows = [1,2,3,4,5,6,7,8,9,10].map(n => ({ id: \`qty_\${n}\`, title: \`\${n}\` }));
                
                await sendWhatsAppInteractive(from, {
                    type: "list",
                    body: { text: \`🎯 Selected: *\${cat[idx].name}*\\nHow many would you like?\` },
                    action: {
                        button: "Select Quantity",
                        sections: [{ title: "Quantity", rows: rows }]
                    }
                });
            } else {
                await sendWhatsAppMessage(from, \`Invalid item. Please try again.\`);
            }
            return res.sendStatus(200);
        }

        // --- SELECT QUANTITY ---`;
code = code.replace(itemRegex, newItemLogic);

// 4. UPDATE QUANTITY -> ASK ADDONS
const qtyRegex = /\/\/ --- SELECT QUANTITY ---[\s\S]*?\/\/ --- ADDONS ---/;
const newQtyLogic = `// --- SELECT QUANTITY ---
        if (session.state === "SELECT_QUANTITY" && input.startsWith("qty_")) {
            const qty = parseInt(input.split("_")[1]);
            if (qty === 0) {
                session.currentItem = null;
                session.state = "MAIN_MENU";
                saveSession();
                await sendWhatsAppMessage(from, \`❌ Item cancelled. Reply with *MENU* to browse again.\`);
                return res.sendStatus(200);
            }
            session.currentItem.quantity = qty;
            session.state = "ASK_ADDONS";
            saveSession();
            
            const rows = [{ id: "addon_none", title: "No Addons" }];
            Object.keys(addonMap).slice(0, 9).forEach(key => { // Max 10 rows
                rows.push({
                    id: \`addon_\${key}\`,
                    title: addonMap[key].name.substring(0, 24),
                    description: addonMap[key].price === 0 ? "Free" : \`+₹\${addonMap[key].price}\`
                });
            });

            await sendWhatsAppInteractive(from, {
                type: "list",
                body: { text: \`✅ Added \${session.currentItem.quantity}x \${session.currentItem.name}\\n\\nWould you like any add-ons?\` },
                action: {
                    button: "Choose Add-on",
                    sections: [{ title: "Extras", rows: rows }]
                }
            });
            return res.sendStatus(200);
        }

        // --- ADDONS ---`;
code = code.replace(qtyRegex, newQtyLogic);

// 5. UPDATE ADDONS
const addonsRegex = /\/\/ --- ADDONS ---[\s\S]*?\/\/ --- RESOLVE MISSING ITEM FLOW ---/;
const newAddonsLogic = `// --- ADDONS ---
        if (session.state === "ASK_ADDONS" && input.startsWith("addon_")) {
            const addonKey = input.split("_")[1];
            if (addonKey !== "none" && addonMap[addonKey]) {
                const selectedAddon = addonMap[addonKey];
                session.currentItem.selectedAddons = session.currentItem.selectedAddons || [];
                session.currentItem.selectedAddons.push({ name: selectedAddon.name, price: selectedAddon.price });
                session.currentItem.price += selectedAddon.price;
            }
            
            session.cart.push(session.currentItem);
            session.currentItem = null;
            session.state = "IDLE";
            saveSession();

            let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            await sendWhatsAppMessage(from, \`🛒 Item added! Subtotal: *₹\${cartTotal}*\\n\\nReply *CART* to checkout, or *MENU* to add more.\`);
            return res.sendStatus(200);
        }

        // --- RESOLVE MISSING ITEM FLOW ---`;
code = code.replace(addonsRegex, newAddonsLogic);

fs.writeFileSync('server.js', code);
console.log("Interactive flows implemented!");
