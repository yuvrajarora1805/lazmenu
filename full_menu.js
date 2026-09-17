const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const fullMenuRegex = /\/\/ --- RESET \/ MENU TRIGGER ---[\s\S]*?if \(\["hi", "hello", "menu", "start", "order", "reset"\]\.includes\(input\)\) \{/;

const fullMenuLogic = `// --- FULL MENU TEXT ---
        if (input === "full menu" || input === "fullmenu") {
            let fullText = "🍽️ *LAZEEZ KALKATA FULL MENU* 🍽️\\n\\n";
            Object.keys(menuData).forEach(cat => {
                fullText += \`*__ \${cat.toUpperCase()} __*\\n\`;
                menuData[cat].forEach(i => {
                    fullText += \`• \${i.name} — ₹\${i.price}\\n\`;
                });
                fullText += "\\n";
            });
            fullText += \`_💡 Tip: Type exactly what you want (e.g. "2 egg roll") and the AI will auto-add it to your cart!_\`;
            await sendWhatsAppMessage(from, fullText);
            return res.sendStatus(200);
        }

        // --- RESET / MENU TRIGGER ---
        if (["hi", "hello", "menu", "start", "order", "reset"].includes(input)) {`;

code = code.replace(fullMenuRegex, fullMenuLogic);
fs.writeFileSync('server.js', code);
console.log("Full menu catch added!");
