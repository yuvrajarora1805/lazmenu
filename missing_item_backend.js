const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. ADD API ENDPOINT
const apiEndpoint = `
// Admin: Mark Item as Missing
app.post("/api/orders/:id/missing-item", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { itemIndex } = req.body;
        
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if(!order) return res.status(404).json({error: "Order not found"});
        
        const items = JSON.parse(order.items_json);
        const missingItem = items[itemIndex];
        if(!missingItem) return res.status(400).json({error: "Item not found"});

        // Change order status to "Pending User Action"
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Pending User Action', orderId);
        
        // Put user in resolution state
        const contextData = JSON.stringify({ orderId: orderId, missingItemIndex: itemIndex });
        db.prepare('UPDATE sessions SET state = ?, category_context = ? WHERE phone_number = ?').run('RESOLVE_MISSING_ITEM', contextData, order.phone_number);

        // Send WhatsApp Message
        await sendWhatsAppMessage(order.phone_number, 
            \`⚠️ *Update on Order #\${orderId}*\\n\` +
            \`Unfortunately, *\${missingItem.name}* is currently out of stock!\\n\\n\` +
            \`How would you like to proceed?\\n\` +
            \`*1️⃣ Continue without it* (Price will be updated)\\n\` +
            \`*2️⃣ Cancel the entire order*\\n\` +
            \`*3️⃣ Add a replacement item*\\n\\n\` +
            \`(Reply with 1, 2, or 3)\`
        );
        
        // Broadcast change
        order.status = 'Pending User Action';
        const formatted = {
            id: order.id,
            customerName: db.prepare('SELECT name FROM users WHERE phone_number = ?').get(order.phone_number)?.name || "Unknown",
            phone: order.phone_number,
            address: order.address,
            items: JSON.parse(order.items_json),
            total: order.total_amount,
            status: 'Pending User Action',
            createdAt: order.created_at
        };
        broadcastSSE({ type: "STATUS_UPDATE", orderId: formatted.id, status: formatted.status, order: formatted });

        res.json({ success: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({error: "Database error"});
    }
});

// Admin Update Order Status`;
code = code.replace('// Admin Update Order Status', apiEndpoint);

// 2. ADD WHATSAPP RESOLUTION LOGIC
const webhookResolutionLogic = `
        // --- RESOLVE MISSING ITEM FLOW ---
        if (session.state === "RESOLVE_MISSING_ITEM") {
            const context = JSON.parse(session.categoryContext);
            const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(context.orderId);
            
            if (!order) {
                session.state = "IDLE";
                saveSession();
                return res.sendStatus(200);
            }

            const items = JSON.parse(order.items_json);
            const missingItem = items[context.missingItemIndex];

            if (input === "1") {
                // Continue without it
                items.splice(context.missingItemIndex, 1);
                const newTotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
                
                db.prepare('UPDATE orders SET items_json = ?, total_amount = ?, status = ? WHERE id = ?').run(
                    JSON.stringify(items), newTotal, 'Received', order.id
                );

                session.state = "IDLE";
                saveSession();

                // Broadcast
                const formatted = {
                    id: order.id,
                    customerName: user.name,
                    phone: order.phone_number,
                    address: order.address,
                    items: items,
                    total: newTotal,
                    status: 'Received',
                    createdAt: order.created_at
                };
                broadcastSSE({ type: "STATUS_UPDATE", orderId: order.id, status: 'Received', order: formatted });

                await sendWhatsAppMessage(from, \`✅ We removed *\${missingItem.name}*. Your new total is *₹\${newTotal}*. The kitchen has resumed your order!\`);
            } 
            else if (input === "2") {
                // Cancel order
                db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Cancelled', order.id);
                session.state = "IDLE";
                saveSession();
                
                const formatted = { id: order.id, status: 'Cancelled' };
                broadcastSSE({ type: "STATUS_UPDATE", orderId: order.id, status: 'Cancelled', order: formatted }); // Quick broadcast for brevity

                await sendWhatsAppMessage(from, \`🚫 Your order has been cancelled.\`);
            }
            else if (input === "3") {
                // Replace item: Cancel current order, push remaining to cart, goto main menu
                db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('Cancelled', order.id);
                
                items.splice(context.missingItemIndex, 1);
                session.cart = items;
                session.state = "MAIN_MENU";
                saveSession();
                
                const formatted = { id: order.id, status: 'Cancelled' };
                broadcastSSE({ type: "STATUS_UPDATE", orderId: order.id, status: 'Cancelled', order: formatted });

                await sendWhatsAppMessage(from, \`We've cancelled the old order. Your remaining items are still in your cart!\\n\\nReply with *MENU* to browse for a replacement, and type *CART* when you're ready to check out again.\`);
            }
            else {
                await sendWhatsAppMessage(from, \`Please reply with 1, 2, or 3.\`);
            }
            return res.sendStatus(200);
        }

        // --- CHECKOUT ---`;

code = code.replace('// --- CHECKOUT ---', webhookResolutionLogic);

fs.writeFileSync('server.js', code);
console.log("Backend missing item logic implemented!");
