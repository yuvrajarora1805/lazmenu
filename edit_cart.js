const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add "Edit Cart" to standard item add
const itemAddRegex = /buttons: \[\s*\{\s*type: "reply", reply: \{\s*id: "cart", title: "Checkout 🛒"\s*\} \},\s*\{\s*type: "reply", reply: \{\s*id: "menu", title: "Add More ➕"\s*\} \}\s*\]/;
const newItemAddButtons = `buttons: [
                        { type: "reply", reply: { id: "cart", title: "Checkout 🛒" } },
                        { type: "reply", reply: { id: "menu", title: "Add More ➕" } },
                        { type: "reply", reply: { id: "edit_cart", title: "Edit Cart ✏️" } }
                    ]`;
code = code.replace(itemAddRegex, newItemAddButtons);


// 2. Change NLP button from clear_cart to edit_cart
const nlpButtonRegex = /\{ type: "reply", reply: \{ id: "clear_cart", title: "Clear Cart 🗑️" \} \}/;
code = code.replace(nlpButtonRegex, `{ type: "reply", reply: { id: "edit_cart", title: "Edit Cart ✏️" } }`);


// 3. Replace clear_cart logic with edit_cart & rem_ logic
const clearCartLogicRegex = /\/\/ --- CLEAR CART ---[\s\S]*?\/\/ --- NLP MULTI-ITEM ORDERING/;
const editCartLogic = `// --- EDIT CART ---
        if (input === "edit_cart") {
            if (session.cart.length === 0) {
                await sendWhatsAppMessage(from, "Your cart is already empty.");
                return res.sendStatus(200);
            }
            
            const rows = session.cart.slice(0, 10).map((c, i) => ({
                id: \`rem_\${i}\`,
                title: \`Remove \${c.name}\`.substring(0, 24),
                description: \`\${c.quantity}x — ₹\${c.price * c.quantity}\`
            }));

            await sendWhatsAppInteractive(from, {
                type: "list",
                body: { text: \`🗑️ *Edit Cart*\\n\\nTap an item below to remove it from your cart:\` },
                action: {
                    button: "Remove Item",
                    sections: [{ title: "Your Cart", rows: rows }]
                }
            });
            return res.sendStatus(200);
        }

        // --- REMOVE ITEM ---
        if (input.startsWith("rem_")) {
            const idx = parseInt(input.split("_")[1]);
            if (session.cart[idx]) {
                const removed = session.cart.splice(idx, 1)[0];
                saveSession();
                
                let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                
                if (session.cart.length === 0) {
                    await sendWhatsAppMessage(from, \`✅ Removed \${removed.name}. Your cart is now empty. Type *MENU* to start over.\`);
                } else {
                    await sendWhatsAppInteractive(from, {
                        type: "button",
                        body: { text: \`✅ Removed \${removed.name}.\\n\\n🛒 New Subtotal: *₹\${cartTotal}*\\nWhat would you like to do next?\` },
                        action: {
                            buttons: [
                                { type: "reply", reply: { id: "cart", title: "Checkout 🛒" } },
                                { type: "reply", reply: { id: "menu", title: "Add More ➕" } },
                                { type: "reply", reply: { id: "edit_cart", title: "Edit Cart ✏️" } }
                            ]
                        }
                    });
                }
            } else {
                await sendWhatsAppMessage(from, "Item not found in cart.");
            }
            return res.sendStatus(200);
        }

        // --- NLP MULTI-ITEM ORDERING`;
code = code.replace(clearCartLogicRegex, editCartLogic);

fs.writeFileSync('server.js', code);
console.log("Edit cart logic implemented!");
