const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Remove my duplicate API endpoints at the bottom
const duplicateStart = '// --- ADMIN API ENDPOINTS ---';
const duplicateEnd = 'app.listen(PORT, () => {';
if (code.includes(duplicateStart)) {
    code = code.substring(0, code.indexOf(duplicateStart)) + duplicateEnd + code.substring(code.indexOf(duplicateEnd) + duplicateEnd.length);
}

// 2. Replace the in-memory /api/orders GET endpoint
const getOrdersRegex = /app\.get\("\/api\/orders", \(req, res\) => \{\s*res\.json\(orders\);\s*\}\);/g;
const newGetOrders = `app.get("/api/orders", (req, res) => {
    try {
        const allOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
        const formattedOrders = allOrders.map(o => ({
            id: o.id,
            customerName: db.prepare('SELECT name FROM users WHERE phone_number = ?').get(o.phone_number)?.name || "Unknown",
            phone: o.phone_number,
            address: o.address,
            items: JSON.parse(o.items_json),
            total: o.total_amount,
            status: o.status,
            createdAt: o.created_at
        }));
        res.json(formattedOrders);
    } catch(e) {
        res.status(500).json({error: "Database error"});
    }
});`;
code = code.replace(getOrdersRegex, newGetOrders);

// 3. Replace the in-memory PATCH /api/orders/:id/status
const patchOrdersRegex = /app\.patch\("\/api\/orders\/:id\/status", \(req, res\) => \{[\s\S]*?res\.json\(order\);\n\}\);/g;
const newPatchOrders = `app.patch("/api/orders/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
        
        const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if(!o) return res.status(404).json({error: "Order not found"});
        
        const formatted = {
            id: o.id,
            customerName: db.prepare('SELECT name FROM users WHERE phone_number = ?').get(o.phone_number)?.name || "Unknown",
            phone: o.phone_number,
            address: o.address,
            items: JSON.parse(o.items_json),
            total: o.total_amount,
            status: o.status,
            createdAt: o.created_at
        };

        broadcastSSE({ type: "STATUS_UPDATE", orderId: formatted.id, status: formatted.status, order: formatted });
        
        // Notify via WhatsApp
        if (status === 'Delivered') {
            await sendWhatsAppMessage(o.phone_number, \`✅ Good news! Your order #\${orderId} has been delivered.\`);
        } else if (status === 'Preparing') {
            await sendWhatsAppMessage(o.phone_number, \`👨‍🍳 Your order #\${orderId} is now being prepared!\`);
        }

        res.json(formatted);
    } catch(e) {
        res.status(500).json({error: "Database error"});
    }
});`;
code = code.replace(patchOrdersRegex, newPatchOrders);

fs.writeFileSync('server.js', code);
console.log("Updated API endpoints to use SQLite!");
