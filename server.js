const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const crypto = require("crypto");
const https = require("https");

const db = require("./database");
const { menuData, addonMap } = require("./menuData");
const stringSimilarity = require("string-similarity");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// In-Memory Database Stores
const users = []; // { id, name, phone, email, password, role: 'customer' | 'admin' }
const orders = []; // { id, userId, customerName, phone, address, items, subtotal, deliveryFee, total, status, createdAt }
const sseClients = []; // SSE connection objects for live updates

// Default Admin user
users.push({
    id: "admin-1",
    name: "Lazeez Admin",
    phone: "8432813476",
    email: "admin@lazeez.com",
    password: "admin", // Simple for demo/admin login
    role: "admin"
});

// Full Lazeez Kalkata's Menu Dataset
const MENU_DATA = [
    {
        category: "NON VEG. KATHI ROLLS",
        type: "non-veg",
        items: [
            { id: "nv-roll-1", name: "Egg Roll", price: 50 },
            { id: "nv-roll-2", name: "Dbl. Egg Roll", price: 70 },
            { id: "nv-roll-3", name: "Dbl. Egg Cheese Roll", price: 80 },
            { id: "nv-roll-4", name: "Egg Manchurian Roll", price: 70 },
            { id: "nv-roll-5", name: "Egg Noodles Roll", price: 70 },
            { id: "nv-roll-6", name: "Egg Chilli Potato Roll", price: 70 },
            { id: "nv-roll-7", name: "Egg Pasta Roll", price: 70 },
            { id: "nv-roll-8", name: "Chicken Roll", price: 90 },
            { id: "nv-roll-9", name: "Dbl. Chicken Roll", price: 110 },
            { id: "nv-roll-10", name: "SNL. Egg SNL. Chicken Roll", price: 110 },
            { id: "nv-roll-11", name: "Dbl. Egg Dbl. Chicken Roll", price: 140 },
            { id: "nv-roll-12", name: "SNL. Egg Dbl. Chicken Roll", price: 130 },
            { id: "nv-roll-13", name: "Dbl Egg Singal Chicken Roll", price: 120 },
            { id: "nv-roll-14", name: "Chicken Seekh Roll", price: 90 },
            { id: "nv-roll-15", name: "Dbl. Chicken Seekh Roll", price: 150 },
            { id: "nv-roll-16", name: "Malai Chicken Roll", price: 100 },
            { id: "nv-roll-17", name: "Dbl. Malai Chicken Roll", price: 130 },
            { id: "nv-roll-18", name: "Chicken Keema Roll", price: 100 },
            { id: "nv-roll-19", name: "Egg Chicken Keema Roll", price: 120 },
            { id: "nv-roll-20", name: "Korma Chicken Roll", price: 120 },
            { id: "nv-roll-21", name: "Chilli Chicken Roll", price: 120 },
            { id: "nv-roll-22", name: "Butter Chicken Roll", price: 120 },
            { id: "nv-roll-23", name: "Loaded Chicken Roll", price: 150 },
            { id: "nv-roll-24", name: "Spl. Chicken Roll", price: 130 },
            { id: "nv-roll-25", name: "Chicken Tikka Roll", price: 150 },
            { id: "nv-roll-26", name: "Malai Chicken Tikka Roll", price: 150 }
        ]
    },
    {
        category: "ADD ON",
        type: "addon",
        items: [
            { id: "addon-1", name: "Mayonise", price: 10 },
            { id: "addon-2", name: "Tandoor Mayonise", price: 10 },
            { id: "addon-3", name: "Schzwan Saus", price: 10 },
            { id: "addon-4", name: "Amul Butter", price: 10 },
            { id: "addon-5", name: "Egg", price: 20 },
            { id: "addon-6", name: "Dbl. Egg", price: 30 },
            { id: "addon-7", name: "Cheese Spread", price: 20 },
            { id: "addon-8", name: "Cheese Slice", price: 20 },
            { id: "addon-9", name: "Wheat Base", price: 0, isFree: true }
        ]
    },
    {
        category: "VEG. KATHI ROLLS",
        type: "veg",
        items: [
            { id: "v-roll-1", name: "Aloo Tikki Roll", price: 50 },
            { id: "v-roll-2", name: "Dbl. Aloo Tikki Roll", price: 70 },
            { id: "v-roll-3", name: "Aloo Tikki Cheese Roll", price: 70 },
            { id: "v-roll-4", name: "Aloo Masala Roll", price: 50 },
            { id: "v-roll-5", name: "Aloo Malai Roll", price: 60 },
            { id: "v-roll-6", name: "Noodle Roll", price: 50 },
            { id: "v-roll-7", name: "Noodle Cheese Roll", price: 70 },
            { id: "v-roll-8", name: "Mix Veg. Paneer Roll", price: 70 },
            { id: "v-roll-9", name: "Mix Veg. Cheese Roll", price: 70 },
            { id: "v-roll-10", name: "Chilli Potato Roll", price: 50 },
            { id: "v-roll-11", name: "Chilli Potato Cheese Roll", price: 70 },
            { id: "v-roll-12", name: "Honey Chilli Potato Roll", price: 60 },
            { id: "v-roll-13", name: "Cheese Roll", price: 50 },
            { id: "v-roll-14", name: "Pasta Roll", price: 50 },
            { id: "v-roll-15", name: "Cheesy Pasta Roll", price: 70 },
            { id: "v-roll-16", name: "Cheese Sweet Corn Roll", price: 70 },
            { id: "v-roll-17", name: "Sweet Corn Roll", price: 50 },
            { id: "v-roll-18", name: "Manchurian Roll", price: 50 },
            { id: "v-roll-19", name: "Manchurian Cheese Roll", price: 70 },
            { id: "v-roll-20", name: "Soya Malai Roll", price: 60 },
            { id: "v-roll-21", name: "Dbl Soya Malai Roll", price: 90 },
            { id: "v-roll-22", name: "Cheesy Soya Malai Roll", price: 80 },
            { id: "v-roll-23", name: "Paneer Roll", price: 80 },
            { id: "v-roll-24", name: "Dbl. Paneer Roll", price: 100 },
            { id: "v-roll-25", name: "Malai Paneer Roll", price: 90 },
            { id: "v-roll-26", name: "Dbl. Malai Paneer Roll", price: 110 },
            { id: "v-roll-27", name: "Paneer Bhurji Roll", price: 90 },
            { id: "v-roll-28", name: "Chilli Paneer Roll", price: 110 },
            { id: "v-roll-29", name: "Korma Paneer Roll", price: 110 },
            { id: "v-roll-30", name: "Chilli Soya Roll", price: 100 },
            { id: "v-roll-31", name: "Korma Soya Roll", price: 100 },
            { id: "v-roll-32", name: "Spl. Soya Roll", price: 120 },
            { id: "v-roll-33", name: "Schzwan Soya Roll", price: 100 },
            { id: "v-roll-34", name: "Achari Soya Roll", price: 100 },
            { id: "v-roll-35", name: "Spl. Paneer Roll", price: 130 },
            { id: "v-roll-36", name: "Paneer Tikka Roll", price: 120 },
            { id: "v-roll-37", name: "Malai Paneer Tikka Roll", price: 130 },
            { id: "v-roll-38", name: "Soya Tikka Roll", price: 80 },
            { id: "v-roll-39", name: "Soya Malai Tikka Roll", price: 90 }
        ]
    },
    {
        category: "TANDOORI SNACKS",
        subtitle: "4 PCS = HALF | 8 PCS = FULL",
        type: "tandoori",
        items: [
            { id: "tand-1", name: "Tandoori Masala Chaap", isVeg: true, prices: { half: 90, full: 160 } },
            { id: "tand-2", name: "Soya Malai Chaap", isVeg: true, prices: { half: 100, full: 180 } },
            { id: "tand-3", name: "Paneer Tikka", isVeg: true, prices: { half: 140, full: 220 } },
            { id: "tand-4", name: "Malai Paneer Tikka", isVeg: true, prices: { half: 150, full: 240 } },
            { id: "tand-5", name: "Chicken Tikka", isVeg: false, prices: { half: 160, full: 300 } },
            { id: "tand-6", name: "Chicken Malai Tikka", isVeg: false, prices: { half: 170, full: 320 } },
            { id: "tand-7", name: "Tandoori Chicken", isVeg: false, prices: { half: 220, full: 440 } },
            { id: "tand-8", name: "Chicken Seekh Kabab", isVeg: false, prices: { half: 210, full: 420 } }
        ]
    },
    {
        category: "RICE",
        subtitle: "400 ML = HALF | 700 ML = FULL",
        type: "rice",
        items: [
            { id: "rice-1", name: "Plain Rice", isVeg: true, prices: { half: 50, full: 80 } },
            { id: "rice-2", name: "Jeera Rice", isVeg: true, prices: { half: 60, full: 100 } },
            { id: "rice-3", name: "Veg. Fried Rice", isVeg: true, prices: { half: 70, full: 100 } },
            { id: "rice-4", name: "Paneer Fried Rice", isVeg: true, prices: { half: 100, full: 150 } },
            { id: "rice-5", name: "Egg Fried Rice", isVeg: false, prices: { half: 70, full: 100 } },
            { id: "rice-6", name: "Chicken Fried Rice", isVeg: false, prices: { half: 100, full: 150 } }
        ]
    },
    {
        category: "CHINESE",
        subtitle: "400 ML HALF | 700 ML FULL",
        type: "chinese",
        items: [
            { id: "chin-1", name: "Spring Roll", isVeg: true, prices: { full: 100 } },
            { id: "chin-2", name: "Chilli Potato", isVeg: true, prices: { half: 70, full: 100 } },
            { id: "chin-3", name: "Honey Chilli Potato", isVeg: true, prices: { half: 80, full: 120 } },
            { id: "chin-4", name: "Veg. Manchurian", isVeg: true, prices: { half: 100, full: 150 } },
            { id: "chin-5", name: "Chilli Paneer", isVeg: true, prices: { half: 130, full: 240 } },
            { id: "chin-6", name: "Veg. Noodle", isVeg: true, prices: { half: 50, full: 70 } },
            { id: "chin-7", name: "Paneer Noodle", isVeg: true, prices: { half: 90, full: 130 } },
            { id: "chin-8", name: "Egg Noodle", isVeg: false, prices: { half: 70, full: 100 } },
            { id: "chin-9", name: "Chilli Chicken", isVeg: false, prices: { half: 140, full: 260 } },
            { id: "chin-10", name: "Chicken Noodle", isVeg: false, prices: { half: 90, full: 130 } }
        ]
    },
    {
        category: "FRENCH FRIES",
        subtitle: "400 ML HALF | 700 ML FULL",
        type: "fries",
        items: [
            { id: "fry-1", name: "Masala French Fries", isVeg: true, prices: { half: 50, full: 80 } },
            { id: "fry-2", name: "Peri Peri French Fries", isVeg: true, prices: { half: 70, full: 100 } },
            { id: "fry-3", name: "Makhni French Fries", isVeg: true, prices: { half: 80, full: 120 } },
            { id: "fry-4", name: "Cheesy French Fries", isVeg: true, prices: { half: 80, full: 120 } }
        ]
    },
    {
        category: "MAIN COURSE (VEG)",
        subtitle: "2 Pc. QTR | 4 Pc. HALF | 6 Pc. FULL",
        type: "main-veg",
        items: [
            { id: "mv-1", name: "Dal Fry", isVeg: true, prices: { qtr: 70, half: 100, full: 150 } },
            { id: "mv-2", name: "Aloo Jeera", isVeg: true, prices: { qtr: 70, half: 100, full: 150 } },
            { id: "mv-3", name: "Dal Makhni", isVeg: true, prices: { qtr: 100, half: 150, full: 200 } },
            { id: "mv-4", name: "Paneer Butter Masala", isVeg: true, prices: { qtr: 110, half: 170, full: 230 } },
            { id: "mv-5", name: "Kadai Paneer", isVeg: true, prices: { qtr: 110, half: 170, full: 230 } },
            { id: "mv-6", name: "Shahi Paneer", isVeg: true, prices: { qtr: 110, half: 170, full: 230 } },
            { id: "mv-7", name: "Matar Paneer", isVeg: true, prices: { qtr: 110, half: 170, full: 230 } },
            { id: "mv-8", name: "Paneer Bhuna Masala", isVeg: true, prices: { qtr: 130, half: 190, full: 250 } },
            { id: "mv-9", name: "Chaap Butter Masala", isVeg: true, prices: { qtr: 80, half: 130, full: 180 } },
            { id: "mv-10", name: "Chaap Bhuna Masala", isVeg: true, prices: { qtr: 80, half: 130, full: 180 } },
            { id: "mv-11", name: "Kadai Chaap", isVeg: true, prices: { qtr: 80, half: 130, full: 180 } },
            { id: "mv-12", name: "Bhoondi Raita", isVeg: true, prices: { qtr: 50, half: 80, full: 100 } }
        ]
    },
    {
        category: "ROTI & PARATHA",
        type: "roti",
        items: [
            { id: "roti-1", name: "Rumali Roti", price: 10, isVeg: true },
            { id: "roti-2", name: "Tawa Roti", price: 10, isVeg: true },
            { id: "roti-3", name: "Tandoori Roti", price: 10, isVeg: true },
            { id: "roti-4", name: "Lachha Paratha", price: 30, isVeg: true },
            { id: "roti-5", name: "Butter Naan", price: 30, isVeg: true },
            { id: "roti-6", name: "Garlic Naan", price: 50, isVeg: true },
            { id: "roti-7", name: "Aloo Masala Naan", price: 50, isVeg: true },
            { id: "roti-8", name: "Stuff Naan", price: 80, isVeg: true },
            { id: "roti-9", name: "Aloo Paratha", price: 50, isVeg: true },
            { id: "roti-10", name: "Piyaz Paratha", price: 50, isVeg: true },
            { id: "roti-11", name: "Gobhi Paratha", price: 50, isVeg: true },
            { id: "roti-12", name: "Paneer Paratha", price: 80, isVeg: true },
            { id: "roti-13", name: "Stuffed Paratha", price: 90, isVeg: true },
            { id: "roti-14", name: "Chicken Paratha", price: 100, isVeg: false }
        ]
    },
    {
        category: "MAIN COURSE (NON VEG)",
        subtitle: "1 Pc. QTR | 2 Pc. HALF | 4 Pc. FULL",
        type: "main-nonveg",
        items: [
            { id: "mnv-1", name: "Butter Chicken", isVeg: false, prices: { qtr: 110, half: 170, full: 280 } },
            { id: "mnv-2", name: "Kadai Chicken", isVeg: false, prices: { qtr: 110, half: 170, full: 280 } },
            { id: "mnv-3", name: "Chicken Bhuna", isVeg: false, prices: { qtr: 130, half: 200, full: 320 } },
            { id: "mnv-4", name: "Chicken Korma", isVeg: false, prices: { qtr: 110, half: 170, full: 280 } },
            { id: "mnv-5", name: "Chicken Rara", isVeg: false, prices: { qtr: 140, half: 210, full: 340 } },
            { id: "mnv-6", name: "Egg Butter Masala", isVeg: false, prices: { qtr: 70, half: 100, full: 150 } },
            { id: "mnv-7", name: "Egg Bhuna Masala", isVeg: false, prices: { qtr: 80, half: 120, full: 180 } },
            { id: "mnv-8", name: "Egg Kadai Masala", isVeg: false, prices: { qtr: 70, half: 100, full: 150 } }
        ]
    }
];

// Helper: Broadcast update via SSE
function broadcastSSE(data) {
    sseClients.forEach((client) => {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// REST APIs

// Get Menu
app.get("/api/menu", (req, res) => {
    res.json({
        restaurant: "Lazeez Kalkata's",
        tagline: "Lunch | Snacks | Dinner",
        freeDelivery: true,
        minOrder: 100,
        phone: "8432813476",
        menu: MENU_DATA
    });
});

// Authentication
app.post("/api/auth/signup", (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
        return res.status(400).json({ error: "Name, Phone and Password are required" });
    }
    const existing = users.find((u) => u.phone === phone);
    if (existing) {
        return res.status(400).json({ error: "User with this phone number already exists" });
    }
    const newUser = {
        id: "usr-" + Date.now(),
        name,
        phone,
        email: email || "",
        password,
        role: "customer"
    };
    users.push(newUser);

    const token = crypto.randomBytes(16).toString("hex");
    return res.json({
        token,
        user: { id: newUser.id, name: newUser.name, phone: newUser.phone, email: newUser.email, role: newUser.role }
    });
});

app.post("/api/auth/login", (req, res) => {
    const { phone, password } = req.body;
    const user = users.find((u) => u.phone === phone && u.password === password);
    if (!user) {
        return res.status(401).json({ error: "Invalid phone number or password" });
    }
    const token = crypto.randomBytes(16).toString("hex");
    return res.json({
        token,
        user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role }
    });
});

// Get User Profile & History
app.get("/api/orders/user/:userId", (req, res) => {
    const userOrders = orders.filter((o) => o.userId === req.params.userId);
    res.json(userOrders);
});

// Create Order
app.post("/api/orders", (req, res) => {
    const { userId, customerName, phone, address, items, notes } = req.body;

    if (!items || !items.length) {
        return res.status(400).json({ error: "Order must contain at least one item" });
    }

    // Calculate total
    let subtotal = 0;
    items.forEach((item) => {
        let itemPrice = item.price;
        if (item.selectedAddons && item.selectedAddons.length) {
            item.selectedAddons.forEach((addon) => {
                itemPrice += addon.price;
            });
        }
        subtotal += itemPrice * item.quantity;
    });

    if (subtotal < 100) {
        return res.status(400).json({ error: "Minimum order amount is ₹100/-" });
    }

    const orderId = "LZK-" + Math.floor(1000 + Math.random() * 9000);
    const newOrder = {
        id: orderId,
        userId: userId || "guest",
        customerName: customerName || "Guest Customer",
        phone: phone || "8432813476",
        address: address || "Dine-in / Pickup",
        items,
        subtotal,
        deliveryFee: 0, // Free Delivery
        total: subtotal,
        notes: notes || "",
        status: "Received", // Statuses: Received -> Preparing -> Out for Delivery -> Delivered / Cancelled
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    orders.unshift(newOrder);

    // Notify connected admin dashboard / customer tracker via SSE
    broadcastSSE({ type: "NEW_ORDER", order: newOrder });

    res.status(201).json(newOrder);
});

// Admin: Get all orders
app.get("/api/orders", async (req, res) => {
    try {
        const [orders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
        const formattedOrders = await Promise.all(orders.map(async (o) => {
            const [userRows] = await db.execute('SELECT name FROM users WHERE phone_number = ?', [o.phone_number]);
            return {
                id: o.id,
                customerName: userRows[0]?.name || "Unknown",
                phone: o.phone_number,
                address: o.address,
                items: JSON.parse(o.items_json),
                total: o.total_amount,
                status: o.status,
                createdAt: o.created_at
            };
        }));
        res.json(formattedOrders);
    } catch(e) {
        res.status(500).json({error: "Database error"});
    }
});

// SSE Stream Endpoint
app.get("/api/orders/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    req.on("close", () => {
        const index = sseClients.findIndex((c) => c.id === clientId);
        if (index !== -1) {
            sseClients.splice(index, 1);
        }
    });
});

// Get single order status
app.get("/api/orders/:id", (req, res) => {
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
});


// Admin: Mark Item as Missing
app.post("/api/orders/:id/missing-item", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { itemIndex } = req.body;
        
        const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
        const order = orderRows[0];
        if(!order) return res.status(404).json({error: "Order not found"});
        
        const items = JSON.parse(order.items_json);
        const missingItem = items[itemIndex];
        if(!missingItem) return res.status(400).json({error: "Item not found"});

        // 1. Update order status to Pending User Action
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['Pending User Action', orderId]);
        
        // 2. Set user's session state
        const missingItemName = missingItem.name;
        const contextData = JSON.stringify({ orderId, missingItemName, itemIndex });
        await db.execute('UPDATE sessions SET state = ?, category_context = ? WHERE phone_number = ?', ['RESOLVE_MISSING_ITEM', contextData, order.phone_number]);

        // Send WhatsApp Message
        await sendWhatsAppInteractive(order.phone_number, {
            type: "button",
            body: { text: `⚠️ *Update on Order #${orderId}*\nUnfortunately, *${missingItem.name}* is currently out of stock!\n\nHow would you like to proceed?` },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "missing_1", title: "Continue without" } },
                    { type: "reply", reply: { id: "missing_2", title: "Cancel Order" } },
                    { type: "reply", reply: { id: "missing_3", title: "Replace Item" } }
                ]
            }
        });
        
        // Broadcast change
        order.status = 'Pending User Action';
        const [userRows] = await db.execute('SELECT name FROM users WHERE phone_number = ?', [order.phone_number]);
        const formatted = {
            id: order.id,
            customerName: userRows[0]?.name || "Unknown",
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

// Admin Update Order Status
app.patch("/api/orders/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        
        const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
        const o = orderRows[0];
        if(!o) return res.status(404).json({error: "Order not found"});
        
        const [userRows] = await db.execute('SELECT name FROM users WHERE phone_number = ?', [o.phone_number]);
        const formatted = {
            id: o.id,
            customerName: userRows[0]?.name || "Unknown",
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
            await sendWhatsAppMessage(o.phone_number, `✅ Good news! Your order #${orderId} has been delivered.`);
        } else if (status === 'Preparing') {
            await sendWhatsAppMessage(o.phone_number, `👨‍🍳 Your order #${orderId} is now being prepared!`);
        } else if (status === 'Accepted') {
            await sendWhatsAppMessage(o.phone_number, `👍 Your order #${orderId} has been accepted by the kitchen!`);
        } else if (status === 'Out for Delivery') {
            await sendWhatsAppMessage(o.phone_number, `🛵 Your order #${orderId} is out for delivery!`);
        } else if (status === 'Cancelled') {
            await sendWhatsAppMessage(o.phone_number, `❌ Your order #${orderId} has been cancelled.`);
        }

        res.json(formatted);
    } catch(e) {
        res.status(500).json({error: "Database error"});
    }
});


// State for interactive WhatsApp sessions
const whatsappSessions = {};

// Helper to search item by name with exact/category preference
function findMenuItem(query, preferredType) {
    const cleanQuery = query.toLowerCase().trim();
    
    // First try exact name match
    for (const cat of MENU_DATA) {
        if (cat.type === "addon") continue;
        if (preferredType && cat.type !== preferredType) continue;
        for (const item of cat.items) {
            if (item.name.toLowerCase() === cleanQuery) {
                return { item, category: cat.category, isVeg: item.isVeg !== false };
            }
        }
    }

    // Next try startsWith match within preferred type
    for (const cat of MENU_DATA) {
        if (cat.type === "addon") continue;
        if (preferredType && cat.type !== preferredType) continue;
        for (const item of cat.items) {
            if (item.name.toLowerCase().startsWith(cleanQuery)) {
                return { item, category: cat.category, isVeg: item.isVeg !== false };
            }
        }
    }

    // Fallback: global search if preferredType wasn't specified
    if (preferredType) {
        return findMenuItem(query, null);
    }

    // Global includes search
    for (const cat of MENU_DATA) {
        if (cat.type === "addon") continue;
        for (const item of cat.items) {
            if (item.name.toLowerCase().includes(cleanQuery)) {
                return { item, category: cat.category, isVeg: item.isVeg !== false };
            }
        }
    }
    return null;
}

// ==========================================
// META WEBHOOK VERIFICATION & MESSAGING
// ==========================================

app.get("/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token === (process.env.VERIFY_TOKEN || "omvky_demo_123")
    ) {
        console.log("✅ WhatsApp webhook verified");
        return res.status(200).send(challenge);
    }

    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);
});

app.post("/webhook/whatsapp", async (req, res) => {
    try {
        const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return res.sendStatus(200);

        const from = message.from;
        
        let text = "";
        let interactiveId = null;
        if (message.type === "interactive") {
            const interactive = message.interactive;
            if (interactive.type === "button_reply") {
                interactiveId = interactive.button_reply.id;
                text = interactive.button_reply.title;
            } else if (interactive.type === "list_reply") {
                interactiveId = interactive.list_reply.id;
                text = interactive.list_reply.title;
            }
        } else if (message.text) {
            text = message.text.body.trim();
        }

        const input = (interactiveId || text).toLowerCase();
        console.log(`📱 Received WhatsApp from ${from}: "${text}" (Input ID: ${input})`);

        // Get or Create User
        const [userRows] = await db.execute('SELECT * FROM users WHERE phone_number = ?', [from]);
        let user = userRows[0];
        
        // Get or Create Session
        const [sessionRows] = await db.execute('SELECT * FROM sessions WHERE phone_number = ?', [from]);
        let sessionRow = sessionRows[0];
        if (!sessionRow) {
            await db.execute('INSERT INTO sessions (phone_number, state, cart_json) VALUES (?, ?, ?)', [from, 'IDLE', '[]']);
            sessionRow = { state: 'IDLE', cart_json: '[]', current_item_json: null, category_context: null, address: null };
        }
        let session = {
            state: sessionRow.state,
            cart: JSON.parse(sessionRow.cart_json || '[]'),
            currentItem: sessionRow.current_item_json ? JSON.parse(sessionRow.current_item_json) : null,
            categoryContext: sessionRow.category_context,
            address: sessionRow.address || ""
        };

        const saveSession = async () => {
            await db.execute(`
                UPDATE sessions SET 
                state = ?, cart_json = ?, current_item_json = ?, category_context = ?, address = ?, updated_at = CURRENT_TIMESTAMP
                WHERE phone_number = ?
            `, [
                session.state, JSON.stringify(session.cart), 
                session.currentItem ? JSON.stringify(session.currentItem) : null,
                session.categoryContext, session.address, from
            ]);
        };

        // --- REGISTRATION FLOW ---
        if (!user) {
            if (session.state !== 'ASK_NAME') {
                session.state = 'ASK_NAME';
                await saveSession();
                await sendWhatsAppMessage(from, `🍽️ *Welcome to Lazeez Kalkata's!* 🌯\nIt looks like you're new here. What is your name?`);
                return res.sendStatus(200);
            } else {
                // Save new user
                await db.execute('INSERT INTO users (phone_number, name) VALUES (?, ?)', [from, text]);
                user = { name: text };
                session.state = 'MAIN_MENU';
                await saveSession();
                await sendWhatsAppMessage(from, `Nice to meet you, *${text}*! 🎉\nLet's get started. Type *Menu* to see what we have, or just tell us what you want (e.g. "I want 2 egg rolls").`);
                return res.sendStatus(200);
            }
        }

        // --- FULL MENU TEXT ---
        if (input === "full menu" || input === "fullmenu") {
            let chunks = [];
            let currentChunk = "🍽️ *LAZEEZ KALKATA FULL MENU* 🍽️\n\n";
            
            Object.keys(menuData).forEach(cat => {
                let catText = `*__ ${cat.toUpperCase()} __*\n`;
                menuData[cat].forEach(i => {
                    catText += `• ${i.name} — ₹${i.price}\n`;
                });
                catText += "\n";
                
                if (currentChunk.length + catText.length > 3500) {
                    chunks.push(currentChunk);
                    currentChunk = "";
                }
                currentChunk += catText;
            });
            
            currentChunk += `_💡 Tip: Type exactly what you want (e.g. "2 egg roll") and the AI will auto-add it to your cart!_`;
            chunks.push(currentChunk);
            
            for (let chunk of chunks) {
                await sendWhatsAppMessage(from, chunk);
            }
            
            return res.sendStatus(200);
        }

        // --- RESET / MENU TRIGGER ---
        if (["hi", "hello", "menu", "start", "order", "reset"].includes(input)) {
            // Check for previous orders for Reorder flow
            const [lastOrderRows] = await db.execute('SELECT * FROM orders WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1', [from]);
            const lastOrder = lastOrderRows[0];
            
            if (lastOrder && input !== "menu") {
                session.state = "ASK_REORDER";
                session.cart = JSON.parse(lastOrder.items_json);
                await saveSession();
                
                let orderSummary = session.cart.map(c => `${c.quantity}x ${c.name}`).join(', ');
                await sendWhatsAppMessage(from, 
                    `Welcome back, *${user.name}*! 🍽️\n\n` +
                    `Would you like to quickly reorder your usual?\n` +
                    `*${orderSummary}*\n\n` +
                    `Reply *YES* to reorder, or *MENU* to browse other items.`
                );
                return res.sendStatus(200);
            }

            session.state = "MAIN_MENU";
            session.cart = [];
            session.currentItem = null;
            await saveSession();

            const categories = Object.keys(menuData);
            
            const rows = categories.map((cat, idx) => ({
                id: `cat_${idx}`,
                title: cat.substring(0, 24)
            })).slice(0, 10); // WhatsApp limit 10 per section

            await sendWhatsAppInteractive(from, {
                type: "list",
                header: { type: "text", text: `Welcome, ${user.name}! 👋` },
                body: { text: "🍽️ *Lazeez Kalkata's Menu* 🌯\n⚡ Free Delivery | Min Order ₹100/-\n\n_💡 Tip: You can type exactly what you want (e.g. \"2 egg rolls and 1 chicken biryani\") or reply with *Full Menu* to view all items at once._" },
                action: {
                    button: "Browse Menu",
                    sections: [
                        { title: "Menu Categories", rows: rows }
                    ]
                }
            });
            return res.sendStatus(200);
        }

        // --- REORDER FLOW ---
        if (session.state === "ASK_REORDER") {
            if (input === "yes" || input === "y") {
                if (user.address) {
                    session.state = "CONFIRM_ADDRESS";
                    await saveSession();
                    await sendWhatsAppMessage(from, `Awesome! 📍 Should we deliver to your saved address: *${user.address}*?\nReply *YES* to confirm, or type a *NEW ADDRESS*.`);
                } else {
                    session.state = "ENTER_ADDRESS";
                    await saveSession();
                    await sendWhatsAppMessage(from, `Awesome! 📍 Please reply with your *Delivery Address / Room No.* to confirm your reorder.`);
                }
                return res.sendStatus(200);
            } else if (input === "no" || input === "n") {
                session.state = "MAIN_MENU";
                await saveSession();
                await sendWhatsAppMessage(from, `No problem! Reply with *MENU* to browse the full menu.`);
                return res.sendStatus(200);
            } else {
                // They didn't reply yes or no, but probably just started ordering!
                session.state = "MAIN_MENU";
                await saveSession();
                // Do NOT return here, let it fall through to NLP logic below
            }
        }

        // --- EDIT CART ---
        if (input === "edit_cart") {
            if (session.cart.length === 0) {
                await sendWhatsAppMessage(from, "Your cart is already empty.");
                return res.sendStatus(200);
            }
            
            const rows = session.cart.slice(0, 10).map((c, i) => ({
                id: `rem_${i}`,
                title: `Remove ${c.name}`.substring(0, 24),
                description: `${c.quantity}x — ₹${c.price * c.quantity}`
            }));

            await sendWhatsAppInteractive(from, {
                type: "list",
                header: { type: "text", text: "Edit Cart" },
                body: { text: `🗑️ *Edit Cart*\n\nTap an item below to remove it from your cart.\n\n_💡 Want to remove multiple items? WhatsApp lists only allow selecting one at a time. To remove multiple, simply type: "Remove 2 Butter Naan and 1 Dal Makhni"._` },
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
                await saveSession();
                
                let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                
                if (session.cart.length === 0) {
                    await sendWhatsAppMessage(from, `✅ Removed ${removed.name}. Your cart is now empty. Type *MENU* to start over.`);
                } else {
                    await sendWhatsAppInteractive(from, {
                        type: "button",
                        body: { text: `✅ Removed ${removed.name}.\n\n🛒 New Subtotal: *₹${cartTotal}*\nWhat would you like to do next?` },
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

        // --- NLP MULTI-ITEM ORDERING / FUZZY SEARCH (Global) ---
        // If they type text that isn't a button ID or number, try to parse multiple items
        if (!interactiveId && !/^\d+$/.test(input) && input.length > 3 && session.state !== "ENTER_ADDRESS") {
            let allItems = [];
            Object.values(menuData).forEach(cat => allItems.push(...cat));
            const itemNames = allItems.map(i => i.name.toLowerCase());
            
            // Basic NLP splitting by "and", ",", "&", or newline
            const parts = input.split(/,|\band\b|&|\n/i).map(s => s.trim()).filter(s => s.length > 2);
            let addedItems = [];
            let removedItems = [];
            let currentActionIsRemoval = false;

            for (const part of parts) {
                let adjustedPart = part.replace(/(?:^|\s)1\/2\s+/i, " half ");
                
                if (/^(?:remove|delete|cancel|minus|-)\s+/i.test(adjustedPart.trim())) {
                    currentActionIsRemoval = true;
                    adjustedPart = adjustedPart.replace(/^(?:remove|delete|cancel|minus|-)\s+/i, "");
                } else if (/^(?:add|plus|\+)\s+/i.test(adjustedPart.trim())) {
                    currentActionIsRemoval = false;
                    adjustedPart = adjustedPart.replace(/^(?:add|plus|\+)\s+/i, "");
                }
                
                let isRemoval = currentActionIsRemoval;
                
                // Match "2 chicken roll" or "chicken roll"
                const matchRegex = /^(\d+)?\s*(.+)$/;
                const match = adjustedPart.trim().match(matchRegex);
                if (match) {
                    let qty = parseInt(match[1]) || 1;
                    let rawItemName = match[2].trim().toLowerCase();
                    
                    if (rawItemName === "fried rice") {
                        rawItemName = "veg fried rice";
                    }

                    // Extract portion size if specified
                    let portion = "full";
                    const halfRegex = /(\(h\)|(?<=\s|^)h(?=\s|$)|(?<=\s|^)half(?=\s|$))/i;
                    const quarterRegex = /(\(q\)|(?<=\s|^)q(?=\s|$)|(?<=\s|^)quarter(?=\s|$)|(?<=\s|^)qtr(?=\s|$))/i;
                    const fullRegex = /(\(f\)|(?<=\s|^)f(?=\s|$)|(?<=\s|^)full(?=\s|$))/i;

                    if (halfRegex.test(rawItemName)) {
                        portion = "half";
                        rawItemName = rawItemName.replace(halfRegex, "").trim();
                    } else if (quarterRegex.test(rawItemName)) {
                        portion = "quarter";
                        rawItemName = rawItemName.replace(quarterRegex, "").trim();
                    } else if (fullRegex.test(rawItemName)) {
                        portion = "full";
                        rawItemName = rawItemName.replace(fullRegex, "").trim();
                    }
                    
                    const matchResult = stringSimilarity.findBestMatch(rawItemName, itemNames);
                    if (matchResult.bestMatch.rating > 0.45) { // Strictness slightly increased for NLP
                        // Get all highly rated ties (e.g. Half vs Full usually tie exactly)
                        const candidates = matchResult.ratings.filter(r => r.rating >= matchResult.bestMatch.rating - 0.05);
                        let finalTarget = matchResult.bestMatch.target;

                        // Try forcing the extracted portion on the best match
                        const portionSpecificTarget = matchResult.bestMatch.target.replace(/\(half\)|\(full\)|\(quarter\)|\(qtr\)/, `(${portion})`);
                        if (itemNames.includes(portionSpecificTarget)) {
                            finalTarget = portionSpecificTarget;
                        } else if (candidates.length > 1) {
                            // Fallback to checking ties if direct replacement didn't work
                            const portionMatch = candidates.find(c => c.target.includes(`(${portion})`));
                            if (portionMatch) finalTarget = portionMatch.target;
                        }

                        const foundItem = allItems.find(i => i.name.toLowerCase() === finalTarget);
                        if (isRemoval) {
                            removedItems.push({
                                name: foundItem.name,
                                quantity: qty,
                                selectedAddons: []
                            });
                        } else {
                            addedItems.push({
                                name: foundItem.name,
                                price: foundItem.price,
                                quantity: qty,
                                selectedAddons: []
                            });
                        }
                    }
                }
            }

            if (removedItems.length > 0) {
                removedItems.forEach(remItem => {
                    const existingIdx = session.cart.findIndex(i => i.name === remItem.name && JSON.stringify(i.selectedAddons || []) === JSON.stringify(remItem.selectedAddons || []));
                    if (existingIdx !== -1) {
                        session.cart[existingIdx].quantity -= remItem.quantity;
                        if (session.cart[existingIdx].quantity <= 0) {
                            session.cart.splice(existingIdx, 1);
                        }
                    }
                });
            }

            if (addedItems.length > 0 || removedItems.length > 0) {
                if (addedItems.length > 0) {
                    addedItems.forEach(newItem => {
                        const existing = session.cart.find(i => i.name === newItem.name && JSON.stringify(i.selectedAddons || []) === JSON.stringify(newItem.selectedAddons || []));
                        if (existing) {
                            existing.quantity += newItem.quantity;
                        } else {
                            session.cart.push(newItem);
                        }
                    });
                }
                
                session.state = "IDLE";
                await saveSession();

                let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                let cartText = session.cart.map((c, i) => `${i+1}. ${c.quantity}x ${c.name}`).join("\n");
                if (session.cart.length === 0) cartText = "Your cart is empty.";
                
                let headerText = "✅ *Item(s) Added!*";
                if (removedItems.length > 0 && addedItems.length === 0) headerText = "🗑️ *Item(s) Removed!*";
                else if (removedItems.length > 0 && addedItems.length > 0) headerText = "✅ *Cart Updated!*";
                
                await sendWhatsAppInteractive(from, {
                    type: "button",
                    body: { text: `${headerText}\n\n*Current Cart:*\n${cartText}\n\n🛒 Subtotal: *₹${cartTotal}*\nWhat would you like to do next?` },
                    action: {
                        buttons: [
                            { type: "reply", reply: { id: "cart", title: "Checkout 🛒" } },
                            { type: "reply", reply: { id: "menu", title: "Add More ➕" } },
                            { type: "reply", reply: { id: "edit_cart", title: "Edit Cart ✏️" } }
                        ]
                    }
                });
                return res.sendStatus(200);
            }
        }

        // --- CATEGORY SELECTION ---
        const categories = Object.keys(menuData);
        if (session.state === "MAIN_MENU" && input.startsWith("cat_")) {
            const catIndex = parseInt(input.split("_")[1]);
            if (catIndex >= 0 && catIndex < categories.length) {
                const selectedCat = categories[catIndex];
                session.state = "CAT_" + catIndex;
                await saveSession();
                
                const rows = menuData[selectedCat].slice(0, 10).map((item, idx) => ({
                    id: `item_${idx}`,
                    title: item.name.substring(0, 24),
                    description: item.name.length > 24 ? `₹${item.price} • ${item.name}`.substring(0, 72) : `₹${item.price}`
                }));

                await sendWhatsAppInteractive(from, {
                    type: "list",
                    body: { text: `📋 *${selectedCat.toUpperCase()}*\nSelect an item:` },
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

        // --- ITEM SELECTION BY NUMBER ---
        if (session.state.startsWith("CAT_") && input.startsWith("item_")) {
            const catIndex = parseInt(session.state.split("_")[1]);
            const selectedCat = categories[catIndex];
            const cat = menuData[selectedCat];
            
            const idx = parseInt(input.split("_")[1]);
            if (cat && cat[idx]) {
                session.currentItem = { name: cat[idx].name, price: cat[idx].price, quantity: 1, selectedAddons: [] };
                session.state = "SELECT_QUANTITY";
                await saveSession();
                
                const rows = [1,2,3,4,5,6,7,8,9,10].map(n => ({ id: `qty_${n}`, title: `${n}` }));
                
                await sendWhatsAppInteractive(from, {
                    type: "list",
                    body: { text: `🎯 Selected: *${cat[idx].name}*\nHow many would you like?` },
                    action: {
                        button: "Select Quantity",
                        sections: [{ title: "Quantity", rows: rows }]
                    }
                });
            } else {
                await sendWhatsAppMessage(from, `Invalid item. Please try again.`);
            }
            return res.sendStatus(200);
        }

        // --- SELECT QUANTITY ---
        if (session.state === "SELECT_QUANTITY" && input.startsWith("qty_")) {
            const qty = parseInt(input.split("_")[1]);
            if (qty === 0) {
                session.currentItem = null;
                session.state = "MAIN_MENU";
                await saveSession();
                await sendWhatsAppMessage(from, `❌ Item cancelled. Reply with *MENU* to browse again.`);
                return res.sendStatus(200);
            }
            session.currentItem.quantity = qty;
            session.state = "ASK_ADDONS";
            await saveSession();
            
            const rows = [{ id: "addon_none", title: "No Addons" }];
            Object.keys(addonMap).slice(0, 9).forEach(key => { // Max 10 rows
                rows.push({
                    id: `addon_${key}`,
                    title: addonMap[key].name.substring(0, 24),
                    description: addonMap[key].price === 0 ? "Free" : `+₹${addonMap[key].price}`
                });
            });

            await sendWhatsAppInteractive(from, {
                type: "list",
                body: { text: `✅ Added ${session.currentItem.quantity}x ${session.currentItem.name}\n\nWould you like any add-ons?` },
                action: {
                    button: "Choose Add-on",
                    sections: [{ title: "Extras", rows: rows }]
                }
            });
            return res.sendStatus(200);
        }

        // --- ADDONS ---
        if (session.state === "ASK_ADDONS" && input.startsWith("addon_")) {
            const addonKey = input.split("_")[1];
            if (addonKey !== "none" && addonMap[addonKey]) {
                const selectedAddon = addonMap[addonKey];
                session.currentItem.selectedAddons = session.currentItem.selectedAddons || [];
                session.currentItem.selectedAddons.push({ name: selectedAddon.name, price: selectedAddon.price });
                session.currentItem.price += selectedAddon.price;
            }
            
            const existing = session.cart.find(i => i.name === session.currentItem.name && JSON.stringify(i.selectedAddons || []) === JSON.stringify(session.currentItem.selectedAddons || []));
            if (existing) {
                existing.quantity += session.currentItem.quantity;
            } else {
                session.cart.push(session.currentItem);
            }
            session.currentItem = null;
            session.state = "IDLE";
            await saveSession();

            let cartTotal = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            await sendWhatsAppInteractive(from, {
                type: "button",
                body: { text: `🛒 Item added! Subtotal: *₹${cartTotal}*\n\nWhat would you like to do next?` },
                action: {
                    buttons: [
                        { type: "reply", reply: { id: "cart", title: "Checkout 🛒" } },
                        { type: "reply", reply: { id: "menu", title: "Add More ➕" } },
                        { type: "reply", reply: { id: "edit_cart", title: "Edit Cart ✏️" } }
                    ]
                }
            });
            return res.sendStatus(200);
        }

        // --- RESOLVE MISSING ITEM FLOW ---
        if (session.state === "RESOLVE_MISSING_ITEM") {
            const context = JSON.parse(session.categoryContext);
            const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [context.orderId]);
            const order = orderRows[0];
            
            if (!order) {
                session.state = "IDLE";
                await saveSession();
                return res.sendStatus(200);
            }

            const items = JSON.parse(order.items_json);
            const missingItem = items[context.missingItemIndex];

            if (input === "missing_1" || input === "1") {
                // Continue without it
                items.splice(context.missingItemIndex, 1);
                const newTotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
                
                await db.execute('UPDATE orders SET items_json = ?, total_amount = ?, status = ? WHERE id = ?', [
                    JSON.stringify(items), newTotal, 'Received', order.id
                ]);

                session.state = "IDLE";
                await saveSession();

                // Broadcast
                const [userRows] = await db.execute('SELECT name FROM users WHERE phone_number = ?', [order.phone_number]);
                const formatted = {
                    id: order.id,
                    customerName: userRows[0]?.name || "Unknown",
                    phone: order.phone_number,
                    address: order.address,
                    items: items,
                    total: newTotal,
                    status: 'Received',
                    createdAt: order.created_at
                };
                broadcastSSE({ type: "STATUS_UPDATE", orderId: order.id, status: 'Received', order: formatted, alert: true });

                await sendWhatsAppMessage(from, `✅ We removed *${missingItem.name}*. Your new total is *₹${newTotal}*. The kitchen has resumed your order!`);
            } 
            else if (input === "missing_2" || input === "2") {
                // Cancel order
                await db.execute('UPDATE orders SET status = ? WHERE id = ?', ['Cancelled', order.id]);
                session.state = "IDLE";
                await saveSession();
                
                const [userRows] = await db.execute('SELECT name FROM users WHERE phone_number = ?', [order.phone_number]);
                const formatted = {
                    id: order.id,
                    customerName: userRows[0]?.name || "Unknown",
                    phone: order.phone_number,
                    address: order.address,
                    items: JSON.parse(order.items_json),
                    total: order.total_amount,
                    status: 'Cancelled',
                    createdAt: order.created_at
                };
                broadcastSSE({ type: "STATUS_UPDATE", orderId: order.id, status: 'Cancelled', order: formatted, alert: true });

                await sendWhatsAppMessage(from, `🚫 Your order has been cancelled.`);
            }
            else if (input === "missing_3" || input === "3") {
                // Replace item: Put remaining items in cart, set editingOrderId, go to main menu
                items.splice(context.missingItemIndex, 1);
                session.cart = items;
                session.state = "MAIN_MENU";
                session.categoryContext = context.orderId; // persist it in the DB!
                await saveSession();

                await sendWhatsAppMessage(from, `Your remaining items are safely kept in your order!\n\nReply with *MENU* to browse for a replacement, and type *CART* when you're ready to update your order.`);
            }
            else {
                await sendWhatsAppMessage(from, `Please reply with 1, 2, or 3.`);
            }
            return res.sendStatus(200);
        }

        // --- CHECKOUT ---
        if (input === "cart" || input === "checkout") {
            if (session.cart.length === 0) {
                await sendWhatsAppMessage(from, `🛒 Your cart is empty. Type *Menu*`);
            } else {
                let total = 0;
                let text = session.cart.map((c, i) => {
                    let t = c.price * c.quantity; total += t;
                    return `${i+1}. ${c.quantity}x ${c.name} (₹${c.price}) — ₹${t}`;
                }).join('\n');
                
                if (session.categoryContext && session.categoryContext.startsWith("LZK-")) {
                    let orderId = session.categoryContext;
                    const checkoutItems = [...session.cart];
                    const [orderRecordRows] = await db.execute('SELECT created_at, address FROM orders WHERE id = ?', [orderId]);
                    const orderRecord = orderRecordRows[0];
                    const finalAddress = orderRecord ? orderRecord.address : "";
                    
                    await db.execute('UPDATE orders SET items_json = ?, total_amount = ?, status = ? WHERE id = ?', [
                        JSON.stringify(checkoutItems), total, 'Received', orderId
                    ]);
                    
                    const formatted = {
                        id: orderId,
                        customerName: user.name,
                        phone: from,
                        address: finalAddress,
                        items: checkoutItems,
                        total,
                        status: 'Received',
                        createdAt: orderRecord ? orderRecord.created_at : new Date().toISOString()
                    };
                    broadcastSSE({ type: "STATUS_UPDATE", orderId: orderId, status: 'Received', order: formatted, alert: true });
                    
                    session.categoryContext = null;
                    session.state = "IDLE";
                    session.cart = [];
                    await saveSession();
                    
                    await sendWhatsAppMessage(from, `✅ *ORDER REPLACED!*\nOrder ID: #${orderId}\n\n*Updated Summary:*\n${text}\n\n💰 New Total: ₹${total}\n📍 Delivering to: ${finalAddress}\n\nTrack it live: https://menu.yarora.dev/track/${orderId}`);
                    return res.sendStatus(200);
                }

                if (user.address) {
                    session.state = "CONFIRM_ADDRESS";
                    await saveSession();
                    await sendWhatsAppMessage(from, `🛒 *ORDER SUMMARY*\n\n${text}\n\n💰 Total: ₹${total}\n\n📍 Deliver to your saved address: *${user.address}*?\nReply *YES* to confirm, or type a *NEW ADDRESS*.`);
                } else {
                    session.state = "ENTER_ADDRESS";
                    await saveSession();
                    await sendWhatsAppMessage(from, `🛒 *ORDER SUMMARY*\n\n${text}\n\n💰 Total: ₹${total}\n\n📍 Please reply with your Delivery Address.`);
                }
            }
            return res.sendStatus(200);
        }

        // --- CONFIRM ORDER ---
        if (session.state === "ENTER_ADDRESS" || session.state === "CONFIRM_ADDRESS") {
            let finalAddress = text;
            
            // If they are in CONFIRM_ADDRESS and replied YES, use saved address
            if (session.state === "CONFIRM_ADDRESS") {
                if (input === "yes" || input === "y") {
                    finalAddress = user.address;
                } else if (["no", "n", "new", "new address", "change", "change address"].includes(input)) {
                    session.state = "ENTER_ADDRESS";
                    await saveSession();
                    await sendWhatsAppMessage(from, `📍 Please reply with your new delivery address now.`);
                    return res.sendStatus(200);
                } else {
                    // They typed the address directly instead of 'yes' or 'no'
                    finalAddress = text;
                    await db.execute('UPDATE users SET address = ? WHERE phone_number = ?', [finalAddress, from]);
                }
            } else {
                // ENTER_ADDRESS state
                finalAddress = text;
                await db.execute('UPDATE users SET address = ? WHERE phone_number = ?', [finalAddress, from]);
            }

            const total = session.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
            const checkoutItems = [...session.cart];
            
            const orderId = "LZK-" + Math.floor(1000 + Math.random() * 9000);
            
            // Save to DB
            await db.execute('INSERT INTO orders (id, phone_number, items_json, total_amount, address, status) VALUES (?, ?, ?, ?, ?, ?)', [
                orderId, from, JSON.stringify(checkoutItems), total, finalAddress, 'Received'
            ]);
            await db.execute('UPDATE users SET total_orders = total_orders + 1 WHERE phone_number = ?', [from]);

            // Broadcast to Kitchen Dashboard
            broadcastSSE({ 
                type: "NEW_ORDER", 
                order: { 
                    id: orderId, 
                    phone: from, 
                    customerName: user.name, 
                    items: checkoutItems, 
                    total, 
                    address: finalAddress,
                    status: "Received",
                    createdAt: new Date().toISOString()
                } 
            });

            session.state = "IDLE";
            session.categoryContext = null;
            session.cart = [];
            saveSession();

            let orderSummaryText = checkoutItems.map(c => {
                let t = c.price * c.quantity;
                return `• ${c.quantity}x ${c.name} (₹${c.price}) — ₹${t}`;
            }).join('\n');
            
            await sendWhatsAppMessage(from, `🎉 *ORDER CONFIRMED!*\nOrder ID: #${orderId}\n\n*Order Summary:*\n${orderSummaryText}\n\n💰 Total: ₹${total}\n📍 Delivering to: ${finalAddress}\n\nTrack it live: https://menu.yarora.dev/track/${orderId}`);
            return res.sendStatus(200);
        }

    } catch (err) {
        console.error("Webhook Error:", err);
    }
    res.sendStatus(200);
});



function sendWhatsAppInteractive(to, interactiveObj) {
    return new Promise((resolve, reject) => {
        if (!process.env.PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
            console.log(`\n[OUTGOING INTERACTIVE to ${to}]:\n`, JSON.stringify(interactiveObj, null, 2), `\n`);
            return resolve();
        }

        const data = JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "interactive",
            interactive: interactiveObj
        });

        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = require('https').request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    resolve(parsed);
                } catch(e) {
                    resolve(responseBody);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

// Helper function to send WhatsApp API messages via Meta Cloud API
function sendWhatsAppMessage(to, message) {
    return new Promise((resolve, reject) => {
        if (!process.env.PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
            console.log(`\n[OUTGOING WHATSAPP to ${to}]:\n${message}\n`);
            return resolve();
        }

        const data = JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: message }
        });

        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: `/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseBody);
                    console.log(`📤 Meta API Response for ${to}:`, JSON.stringify(parsed));
                    resolve(parsed);
                } catch(e) {
                    resolve(responseBody);
                }
            });
        });

        req.on('error', (e) => {
            console.error("Meta WhatsApp send error (HTTPS):", e);
            reject(e);
        });

        req.write(data);
        req.end();
    });
}


app.listen(PORT, () => {
    console.log(`🚀 Lazeez Kalkata Backend running on port ${PORT}`);
});