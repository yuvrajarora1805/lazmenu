const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace old fuzzy search with NLP parsing
const fuzzySearchRegex = /\/\/ --- FUZZY SEARCH \(Global\) ---[\s\S]*?\/\/ --- CATEGORY SELECTION ---/;

const newNlpLogic = `// --- CLEAR CART ---
        if (input === "clear_cart") {
            session.cart = [];
            session.state = "MAIN_MENU";
            saveSession();
            await sendWhatsAppMessage(from, "🗑️ Cart cleared! Reply with *MENU* to browse again, or type what you want to order.");
            return res.sendStatus(200);
        }

        // --- NLP MULTI-ITEM ORDERING / FUZZY SEARCH (Global) ---
        // If they type text that isn't a button ID or number, try to parse multiple items
        if (!interactiveId && !/^\\d+$/.test(input) && input.length > 3 && session.state !== "ENTER_ADDRESS") {
            let allItems = [];
            Object.values(menuData).forEach(cat => allItems.push(...cat));
            const itemNames = allItems.map(i => i.name.toLowerCase());
            
            // Basic NLP splitting by "and", ",", "&", or newline
            const parts = input.split(/,|and|&|\\n/i).map(s => s.trim()).filter(s => s.length > 2);
            let addedItems = [];

            for (const part of parts) {
                // Match "2 chicken roll" or "chicken roll"
                const matchRegex = /^(\\d+)?\\s*(.+)$/;
                const match = part.match(matchRegex);
                if (match) {
                    const qty = parseInt(match[1]) || 1;
                    const itemName = match[2].trim();
                    
                    const bestMatch = stringSimilarity.findBestMatch(itemName, itemNames);
                    if (bestMatch.bestMatch.rating > 0.45) { // Strictness slightly increased for NLP
                        const foundItem = allItems.find(i => i.name.toLowerCase() === bestMatch.bestMatch.target);
                        addedItems.push({
                            name: foundItem.name,
                            price: foundItem.price,
                            quantity: qty,
                            selectedAddons: []
                        });
                    }
                }
            }

            if (addedItems.length > 0) {
                session.cart.push(...addedItems);
                session.state = "IDLE";
                saveSession();

                let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                let addedText = addedItems.map(i => \`\${i.quantity}x \${i.name}\`).join("\\n");
                
                await sendWhatsAppInteractive(from, {
                    type: "button",
                    body: { text: \`✅ *AI Auto-Added:*\n\${addedText}\\n\\n🛒 Subtotal: *₹\${cartTotal}*\\nWhat would you like to do next?\` },
                    action: {
                        buttons: [
                            { type: "reply", reply: { id: "cart", title: "Checkout 🛒" } },
                            { type: "reply", reply: { id: "menu", title: "Add More ➕" } },
                            { type: "reply", reply: { id: "clear_cart", title: "Clear Cart 🗑️" } }
                        ]
                    }
                });
                return res.sendStatus(200);
            }
        }

        // --- CATEGORY SELECTION ---`;

code = code.replace(fuzzySearchRegex, newNlpLogic);
fs.writeFileSync('server.js', code);
console.log("NLP engine installed!");
