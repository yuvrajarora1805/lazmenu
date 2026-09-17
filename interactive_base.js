const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Add interactive sender helper
const interactiveHelper = `function sendWhatsAppInteractive(to, interactiveObj) {
    return new Promise((resolve, reject) => {
        if (!process.env.PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
            console.log(\`\\n[OUTGOING INTERACTIVE to \${to}]:\\n\`, JSON.stringify(interactiveObj, null, 2), \`\\n\`);
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
            path: \`/v20.0/\${process.env.PHONE_NUMBER_ID}/messages\`,
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${process.env.WHATSAPP_TOKEN}\`,
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

// Helper function to send WhatsApp API messages via Meta Cloud API`;
code = code.replace("// Helper function to send WhatsApp API messages via Meta Cloud API", interactiveHelper);


// 2. Fix Input Parsing
const oldParsing = `        const from = message.from;
        const text = message.text?.body?.trim() || "";
        const input = text.toLowerCase();
        
        console.log(\`📱 Received WhatsApp from \${from}: "\${text}"\`);`;

const newParsing = `        const from = message.from;
        
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
        console.log(\`📱 Received WhatsApp from \${from}: "\${text}" (Input ID: \${input})\`);`;
code = code.replace(oldParsing, newParsing);

// Write changes for now
fs.writeFileSync('server.js', code);
console.log("Interactive messaging base helpers added!");
