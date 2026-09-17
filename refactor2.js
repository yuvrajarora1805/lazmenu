const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Revert to explicit registration flow
const autoRegBlock = `        // --- AUTO-REGISTRATION ---
        if (!user) {
            db.prepare('INSERT INTO users (phone_number, name) VALUES (?, ?)').run(from, 'WhatsApp Customer');
            user = { name: 'WhatsApp Customer' };
        }`;

const explicitRegBlock = `        // --- REGISTRATION FLOW ---
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
        }`;

code = code.replace(autoRegBlock, explicitRegBlock);

// 2. Rewrite SELECT_QUANTITY to generate dynamic addon list
const selectQuantityBlock = `        // --- SELECT QUANTITY ---
        if (session.state === "SELECT_QUANTITY" && /^\\d+$/.test(input)) {
            session.currentItem.quantity = parseInt(input);
            session.state = "ASK_ADDONS";
            saveSession();
            await sendWhatsAppMessage(from, 
                \`✅ Added \${session.currentItem.quantity}x \${session.currentItem.name}\\n\\n\` +
                \`Add-ons?\\n1️⃣ Mayonnaise (+₹10)\\n2️⃣ Cheese Slice (+₹20)\\n3️⃣ No Addons\\n(Reply 1, 2, or 3)\`
            );
            return res.sendStatus(200);
        }`;

const dynamicQuantityBlock = `        // --- SELECT QUANTITY ---
        if (session.state === "SELECT_QUANTITY" && /^\\d+$/.test(input)) {
            session.currentItem.quantity = parseInt(input);
            session.state = "ASK_ADDONS";
            saveSession();
            
            let addonText = \`✅ Added \${session.currentItem.quantity}x \${session.currentItem.name}\\n\\nWould you like any add-ons?\\n\`;
            Object.keys(addonMap).forEach(key => {
                const addOn = addonMap[key];
                addonText += \`\${key}️⃣ \${addOn.name} (+\` + (addOn.price === 0 ? "Free" : \`₹\${addOn.price}\`) + \`)\\n\`;
            });
            addonText += \`\\nReply with the add-on number, or type *NO* to skip.\`;
            
            await sendWhatsAppMessage(from, addonText);
            return res.sendStatus(200);
        }`;

code = code.replace(selectQuantityBlock, dynamicQuantityBlock);


// 3. Rewrite ASK_ADDONS to process dynamic addons
const askAddonsBlockRegex = /\/\/ --- ADDONS ---[\s\S]*?return res\.sendStatus\(200\);\n        }/;

const dynamicAskAddonsBlock = `// --- ADDONS ---
        if (session.state === "ASK_ADDONS") {
            if (input !== "no" && addonMap[input]) {
                const selectedAddon = addonMap[input];
                session.currentItem.selectedAddons = session.currentItem.selectedAddons || [];
                session.currentItem.selectedAddons.push({ name: selectedAddon.name, price: selectedAddon.price });
                session.currentItem.price += selectedAddon.price;
            } else if (input !== "no") {
                await sendWhatsAppMessage(from, \`Invalid choice. Reply with a number from the list, or *NO* to skip.\`);
                return res.sendStatus(200);
            }
            
            session.cart.push(session.currentItem);
            session.currentItem = null;
            session.state = "IDLE";
            saveSession();

            let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            await sendWhatsAppMessage(from, \`🛒 Item added! Subtotal: *₹\${cartTotal}*\\n\\nReply *CART* to checkout, or *MENU* to add more.\`);
            return res.sendStatus(200);
        }`;

code = code.replace(askAddonsBlockRegex, dynamicAskAddonsBlock);

fs.writeFileSync('server.js', code);
console.log("Implementation completed!");
