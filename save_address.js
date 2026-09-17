const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Rewrite Reorder flow
const reorderRegex = /\/\/ --- REORDER FLOW ---[\s\S]*?\/\/ --- FUZZY SEARCH \(Global\) ---/;
const newReorderBlock = `// --- REORDER FLOW ---
        if (session.state === "ASK_REORDER") {
            if (input === "yes" || input === "y") {
                if (user.address) {
                    session.state = "CONFIRM_ADDRESS";
                    saveSession();
                    await sendWhatsAppMessage(from, \`Awesome! 📍 Should we deliver to your saved address: *\${user.address}*?\\nReply *YES* to confirm, or type a *NEW ADDRESS*.\`);
                } else {
                    session.state = "ENTER_ADDRESS";
                    saveSession();
                    await sendWhatsAppMessage(from, \`Awesome! 📍 Please reply with your *Delivery Address / Room No.* to confirm your reorder.\`);
                }
            } else {
                session.state = "MAIN_MENU";
                saveSession();
                await sendWhatsAppMessage(from, \`No problem! Reply with *MENU* to browse the full menu.\`);
            }
            return res.sendStatus(200);
        }

        // --- FUZZY SEARCH (Global) ---`;
code = code.replace(reorderRegex, newReorderBlock);

// 2. Rewrite Checkout flow
const checkoutRegex = /\/\/ --- CHECKOUT ---[\s\S]*?\/\/ --- CONFIRM ORDER ---/;
const newCheckoutBlock = `// --- CHECKOUT ---
        if (input === "cart" || input === "checkout") {
            if (session.cart.length === 0) {
                await sendWhatsAppMessage(from, \`🛒 Your cart is empty. Type *Menu*\`);
            } else {
                let total = 0;
                let text = session.cart.map((c, i) => {
                    let t = c.price * c.quantity; total += t;
                    return \`\${i+1}. \${c.quantity}x \${c.name} — ₹\${t}\`;
                }).join('\\n');
                
                if (user.address) {
                    session.state = "CONFIRM_ADDRESS";
                    saveSession();
                    await sendWhatsAppMessage(from, \`🛒 *ORDER SUMMARY*\\n\\n\${text}\\n\\n💰 Total: ₹\${total}\\n\\n📍 Deliver to your saved address: *\${user.address}*?\\nReply *YES* to confirm, or type a *NEW ADDRESS*.\`);
                } else {
                    session.state = "ENTER_ADDRESS";
                    saveSession();
                    await sendWhatsAppMessage(from, \`🛒 *ORDER SUMMARY*\\n\\n\${text}\\n\\n💰 Total: ₹\${total}\\n\\n📍 Please reply with your Delivery Address.\`);
                }
            }
            return res.sendStatus(200);
        }

        // --- CONFIRM ORDER ---`;
code = code.replace(checkoutRegex, newCheckoutBlock);

// 3. Rewrite Confirm Order flow
const confirmOrderRegex = /\/\/ --- CONFIRM ORDER ---[\s\S]*?\} catch \(err\) \{/;
const newConfirmOrderBlock = `// --- CONFIRM ORDER ---
        if (session.state === "ENTER_ADDRESS" || session.state === "CONFIRM_ADDRESS") {
            let finalAddress = text;
            
            // If they are in CONFIRM_ADDRESS and replied YES, use saved address
            if (session.state === "CONFIRM_ADDRESS" && (input === "yes" || input === "y")) {
                finalAddress = user.address;
            } else {
                // They entered a new address, save it to their profile for future!
                db.prepare('UPDATE users SET address = ? WHERE phone_number = ?').run(finalAddress, from);
            }

            const orderId = "LZK-" + Math.floor(1000 + Math.random() * 9000);
            const total = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            
            // Save to DB
            db.prepare('INSERT INTO orders (id, phone_number, items_json, total_amount, address) VALUES (?, ?, ?, ?, ?)').run(
                orderId, from, JSON.stringify(session.cart), total, finalAddress
            );
            db.prepare('UPDATE users SET total_orders = total_orders + 1 WHERE phone_number = ?').run(from);

            // Broadcast to Kitchen Dashboard
            broadcastSSE({ type: "NEW_ORDER", order: { id: orderId, phone: from, customerName: user.name, items: session.cart, total, address: finalAddress } });

            session.state = "IDLE";
            session.cart = [];
            saveSession();

            await sendWhatsAppMessage(from, \`🎉 *ORDER CONFIRMED!*\\nOrder ID: #\${orderId}\\nTotal: ₹\${total}\\nDelivering to: \${finalAddress}\\n\\nTrack it live: https://menu.yarora.dev/track/\${orderId}\`);
            return res.sendStatus(200);
        }

    } catch (err) {`;
code = code.replace(confirmOrderRegex, newConfirmOrderBlock);

fs.writeFileSync('server.js', code);
console.log("Address saving logic implemented!");
