const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

const httpsImport = 'const https = require("https");\n';
if (!code.includes('const https = require("https");')) {
    code = code.replace('const crypto = require("crypto");', 'const crypto = require("crypto");\n' + httpsImport);
}

const oldFuncRegex = /async function sendWhatsAppMessage\(to, message\) \{[\s\S]*?\n\}/;

const newFunc = `function sendWhatsAppMessage(to, message) {
    return new Promise((resolve, reject) => {
        if (!process.env.PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
            console.log(\`\\n[OUTGOING WHATSAPP to \${to}]:\\n\${message}\\n\`);
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
            path: \`/v20.0/\${process.env.PHONE_NUMBER_ID}/messages\`,
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${process.env.WHATSAPP_TOKEN}\`,
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
                    console.log(\`📤 Meta API Response for \${to}:\`, JSON.stringify(parsed));
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
}`;

code = code.replace(oldFuncRegex, newFunc);

fs.writeFileSync('server.js', code);
console.log("Rewrote sendWhatsAppMessage to use native HTTPS!");
