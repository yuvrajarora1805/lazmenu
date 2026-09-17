const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const missingItemApiRegex = /await sendWhatsAppMessage\(order\.phone_number,[\s\S]*?\(Reply with 1, 2, or 3\)\`\n        \);/;

const newMissingItemApi = `await sendWhatsAppInteractive(order.phone_number, {
            type: "button",
            body: { text: \`⚠️ *Update on Order #\${orderId}*\\nUnfortunately, *\${missingItem.name}* is currently out of stock!\\n\\nHow would you like to proceed?\` },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "missing_1", title: "Continue without" } },
                    { type: "reply", reply: { id: "missing_2", title: "Cancel Order" } },
                    { type: "reply", reply: { id: "missing_3", title: "Replace Item" } }
                ]
            }
        });`;

code = code.replace(missingItemApiRegex, newMissingItemApi);

// Also need to update the RESOLVE_MISSING_ITEM webhook parsing since the ID will be "missing_1", "missing_2", "missing_3" instead of "1", "2", "3"
const resolveMissingItemRegex = /if \(input === "1"\) \{/g;
code = code.replace(resolveMissingItemRegex, `if (input === "missing_1" || input === "1") {`);

const resolveMissingItemRegex2 = /else if \(input === "2"\) \{/g;
code = code.replace(resolveMissingItemRegex2, `else if (input === "missing_2" || input === "2") {`);

const resolveMissingItemRegex3 = /else if \(input === "3"\) \{/g;
code = code.replace(resolveMissingItemRegex3, `else if (input === "missing_3" || input === "3") {`);

fs.writeFileSync('server.js', code);
console.log("Missing item interactive buttons implemented!");
