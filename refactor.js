const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

if (!serverCode.includes("const db = require('./database');")) {
    serverCode = serverCode.replace(
        'const crypto = require("crypto");',
        'const crypto = require("crypto");\nconst db = require("./database");\nconst { menuData, addonMap } = require("./menuData");\nconst stringSimilarity = require("string-similarity");'
    );
}

const startWebhookStr = 'app.post("/webhook/whatsapp", async (req, res) => {';
const endWebhookRegex = /res\.sendStatus\(200\);\n\}\);\n/g;

const startIdx = serverCode.indexOf(startWebhookStr);
if (startIdx === -1) {
    console.error("Could not find start of webhook");
    process.exit(1);
}

let endIdx = -1;
let match;
while ((match = endWebhookRegex.exec(serverCode)) !== null) {
    if (match.index > startIdx) {
        endIdx = match.index + match[0].length;
        break;
    }
}

if (endIdx === -1) {
    console.error("Could not find end of webhook");
    process.exit(1);
}

const newWebhookLogic = `app.post("/webhook/whatsapp", async (req, res) => {
    try {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return res.sendStatus(200);

        const from = message.from;
        const text = message.text?.body?.trim() || "";
        const input = text.toLowerCase();
        
        console.log(\`📱 Received WhatsApp from \${from}: "\${text}"\`);

        // Get or Create User
        let user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(from);
        
        // Get or Create Session
        let sessionRow = db.prepare('SELECT * FROM sessions WHERE phone_number = ?').get(from);
        if (!sessionRow) {
            db.prepare('INSERT INTO sessions (phone_number, state, cart_json) VALUES (?, ?, ?)').run(from, 'IDLE', '[]');
            sessionRow = { state: 'IDLE', cart_json: '[]', current_item_json: null, category_context: null, address: null };
        }
        let session = {
            state: sessionRow.state,
            cart: JSON.parse(sessionRow.cart_json || '[]'),
            currentItem: sessionRow.current_item_json ? JSON.parse(sessionRow.current_item_json) : null,
            categoryContext: sessionRow.category_context,
            address: sessionRow.address || ""
        };

        const saveSession = () => {
            db.prepare(\`
                UPDATE sessions SET 
                state = ?, cart_json = ?, current_item_json = ?, category_context = ?, address = ?, updated_at = CURRENT_TIMESTAMP
                WHERE phone_number = ?
            \`).run(
                session.state, JSON.stringify(session.cart), 
                session.currentItem ? JSON.stringify(session.currentItem) : null,
                session.categoryContext, session.address, from
            );
        };

        // --- REGISTRATION FLOW ---
        if (!user) {
            if (session.state !== 'ASK_NAME') {
                session.state = 'ASK_NAME';
                saveSession();
                await sendWhatsAppMessage(from, \`🍽️ *Welcome to Lazeez Kalkata's!* 🌯\\nIt looks like you're new here. What is your name?\`);
                return res.sendStatus(200);
            } else {
                // Save new user
                db.prepare('INSERT INTO users (phone_number, name) VALUES (?, ?)').run(from, text);
                user = { name: text };
                session.state = 'MAIN_MENU';
                saveSession();
                await sendWhatsAppMessage(from, \`Nice to meet you, *\${text}*! 🎉\\nLet's get started. Type *Menu* to see what we have.\`);
                return res.sendStatus(200);
            }
        }

        // --- RESET / MENU TRIGGER ---
        if (["hi", "hello", "menu", "start", "order", "reset"].includes(input)) {
            // Check for previous orders for Reorder flow
            const lastOrder = db.prepare('SELECT * FROM orders WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1').get(from);
            
            if (lastOrder && input !== "menu") {
                session.state = "ASK_REORDER";
                session.cart = JSON.parse(lastOrder.items_json);
                saveSession();
                
                let orderSummary = session.cart.map(c => \`\${c.quantity}x \${c.name}\`).join(', ');
                await sendWhatsAppMessage(from, 
                    \`Welcome back, *\${user.name}*! 🍽️\\n\\n\` +
                    \`Would you like to quickly reorder your usual?\\n\` +
                    \`*\${orderSummary}*\\n\\n\` +
                    \`Reply *YES* to reorder, or *MENU* to browse other items.\`
                );
                return res.sendStatus(200);
            }

            session.state = "MAIN_MENU";
            session.cart = [];
            session.currentItem = null;
            saveSession();

            await sendWhatsAppMessage(from,
                \`🍽️ *Lazeez Kalkata's Menu* 🌯\\n\` +
                \`⚡ Free Delivery | Min Order ₹100/-\\n\\n\` +
                \`1️⃣ Non-Veg Kathi Rolls\\n\` +
                \`2️⃣ Veg Kathi Rolls\\n\\n\` +
                \`Reply with *1* or *2*, or just type what you want (e.g. "Chicken Roll").\\n\` +
                \`🌐 Or Order Online: https://menu.yarora.dev\`
            );
            return res.sendStatus(200);
        }

        // --- REORDER FLOW ---
        if (session.state === "ASK_REORDER") {
            if (input === "yes" || input === "y") {
                session.state = "ENTER_ADDRESS";
                saveSession();
                await sendWhatsAppMessage(from, \`Awesome! 📍 Please reply with your *Delivery Address / Room No.* to confirm your reorder.\`);
            } else {
                session.state = "MAIN_MENU";
                saveSession();
                await sendWhatsAppMessage(from, \`No problem! Reply with *1* for Non-Veg Rolls or *2* for Veg Rolls.\`);
            }
            return res.sendStatus(200);
        }

        // --- FUZZY SEARCH (Global) ---
        // If they type text that isn't a number, try to match an item
        if (session.state === "MAIN_MENU" || session.state.startsWith("CAT_")) {
            if (!/^\\d+$/.test(input) && input.length > 3) {
                const allItems = [...menuData["non-veg"], ...menuData["veg"]];
                const itemNames = allItems.map(i => i.name.toLowerCase());
                const match = stringSimilarity.findBestMatch(input, itemNames);
                
                if (match.bestMatch.rating > 0.4) {
                    const foundItem = allItems.find(i => i.name.toLowerCase() === match.bestMatch.target);
                    session.currentItem = { name: foundItem.name, price: foundItem.price, quantity: 1, selectedAddons: [] };
                    session.state = "SELECT_QUANTITY";
                    saveSession();
                    await sendWhatsAppMessage(from, \`🎯 Found: *\${foundItem.name}* (₹\${foundItem.price})\\nHow many would you like? (Reply with a number)\`);
                    return res.sendStatus(200);
                }
            }
        }

        // --- CATEGORY SELECTION ---
        if (session.state === "MAIN_MENU" && input === "1") {
            session.state = "CAT_NONVEG";
            saveSession();
            let text = \`🍗 *NON-VEG ROLLS*\\n\\n\`;
            menuData["non-veg"].forEach((item, idx) => text += \`\${idx + 1}. \${item.name} — ₹\${item.price}\\n\`);
            text += \`\\nReply with a number (1-10) or type the item name!\`;
            await sendWhatsAppMessage(from, text);
            return res.sendStatus(200);
        }
        else if (session.state === "MAIN_MENU" && input === "2") {
            session.state = "CAT_VEG";
            saveSession();
            let text = \`🥗 *VEG ROLLS*\\n\\n\`;
            menuData["veg"].forEach((item, idx) => text += \`\${idx + 1}. \${item.name} — ₹\${item.price}\\n\`);
            text += \`\\nReply with a number (1-10) or type the item name!\`;
            await sendWhatsAppMessage(from, text);
            return res.sendStatus(200);
        }

        // --- ITEM SELECTION BY NUMBER ---
        if (session.state.startsWith("CAT_") && /^\\d+$/.test(input)) {
            const cat = session.state === "CAT_NONVEG" ? menuData["non-veg"] : menuData["veg"];
            const idx = parseInt(input) - 1;
            if (cat[idx]) {
                session.currentItem = { name: cat[idx].name, price: cat[idx].price, quantity: 1, selectedAddons: [] };
                session.state = "SELECT_QUANTITY";
                saveSession();
                await sendWhatsAppMessage(from, \`🎯 Selected: *\${cat[idx].name}*\\nHow many would you like? (Reply with a number)\`);
            } else {
                await sendWhatsAppMessage(from, \`Invalid number. Please try again.\`);
            }
            return res.sendStatus(200);
        }

        // --- SELECT QUANTITY ---
        if (session.state === "SELECT_QUANTITY" && /^\\d+$/.test(input)) {
            session.currentItem.quantity = parseInt(input);
            session.state = "ASK_ADDONS";
            saveSession();
            await sendWhatsAppMessage(from, 
                \`✅ Added \${session.currentItem.quantity}x \${session.currentItem.name}\\n\\n\` +
                \`Add-ons?\\n1️⃣ Mayonnaise (+₹10)\\n2️⃣ Cheese Slice (+₹20)\\n3️⃣ No Addons\\n(Reply 1, 2, or 3)\`
            );
            return res.sendStatus(200);
        }

        // --- ADDONS ---
        if (session.state === "ASK_ADDONS") {
            if (input === "1") {
                session.currentItem.selectedAddons.push({ name: "Mayonnaise", price: 10 });
                session.currentItem.price += 10;
            } else if (input === "2") {
                session.currentItem.selectedAddons.push({ name: "Cheese Slice", price: 20 });
                session.currentItem.price += 20;
            }
            session.cart.push(session.currentItem);
            session.currentItem = null;
            session.state = "IDLE";
            saveSession();

            let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            await sendWhatsAppMessage(from, \`🛒 Item added! Subtotal: *₹\${cartTotal}*\\n\\nReply *CART* to checkout, or *MENU* to add more.\`);
            return res.sendStatus(200);
        }

        // --- CHECKOUT ---
        if (input === "cart" || input === "checkout") {
            if (session.cart.length === 0) {
                await sendWhatsAppMessage(from, \`🛒 Your cart is empty. Type *Menu*\`);
            } else {
                let total = 0;
                let text = session.cart.map((c, i) => {
                    let t = c.price * c.quantity; total += t;
                    return \`\${i+1}. \${c.quantity}x \${c.name} — ₹\${t}\`;
                }).join('\\n');
                session.state = "ENTER_ADDRESS";
                saveSession();
                await sendWhatsAppMessage(from, \`🛒 *ORDER SUMMARY*\\n\\n\${text}\\n\\n💰 Total: ₹\${total}\\n\\n📍 Please reply with your Delivery Address.\`);
            }
            return res.sendStatus(200);
        }

        // --- CONFIRM ORDER ---
        if (session.state === "ENTER_ADDRESS") {
            const orderId = "LZK-" + Math.floor(1000 + Math.random() * 9000);
            const total = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            
            // Save to DB
            db.prepare('INSERT INTO orders (id, phone_number, items_json, total_amount, address) VALUES (?, ?, ?, ?, ?)').run(
                orderId, from, JSON.stringify(session.cart), total, text
            );
            db.prepare('UPDATE users SET total_orders = total_orders + 1 WHERE phone_number = ?').run(from);

            // Broadcast to Kitchen Dashboard
            broadcastSSE({ type: "NEW_ORDER", order: { id: orderId, phone: from, customerName: user.name, items: session.cart, total } });

            session.state = "IDLE";
            session.cart = [];
            saveSession();

            await sendWhatsAppMessage(from, \`🎉 *ORDER CONFIRMED!*\\nOrder ID: #\${orderId}\\nTotal: ₹\${total}\\n\\nTrack it live: https://menu.yarora.dev/track/\${orderId}\`);
            return res.sendStatus(200);
        }

    } catch (err) {
        console.error("Webhook Error:", err);
    }
    res.sendStatus(200);
});
`;

serverCode = serverCode.substring(0, startIdx) + newWebhookLogic + serverCode.substring(endIdx);
fs.writeFileSync('server.js', serverCode);
console.log("Refactoring complete!");
