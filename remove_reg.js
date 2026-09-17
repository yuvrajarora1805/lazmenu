const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldRegistrationFlow = `        // --- REGISTRATION FLOW ---
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

const newAutoRegistrationFlow = `        // --- AUTO-REGISTRATION ---
        if (!user) {
            db.prepare('INSERT INTO users (phone_number, name) VALUES (?, ?)').run(from, 'WhatsApp Customer');
            user = { name: 'WhatsApp Customer' };
        }`;

if (code.includes(oldRegistrationFlow)) {
    code = code.replace(oldRegistrationFlow, newAutoRegistrationFlow);
    fs.writeFileSync('server.js', code);
    console.log("Removed registration flow and replaced with auto-registration!");
} else {
    console.log("Could not find the registration flow block exactly as written.");
}
