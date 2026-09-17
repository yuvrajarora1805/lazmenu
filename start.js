const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Starting Lazeez Kalkata Master Runner...");

// 1. Start Express Backend (server.js on Port 3000)
const backend = spawn("node", ["server.js"], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PORT: "3000" }
});

// 2. Start Next.js Frontend (on Port 3001)
const frontend = spawn("npx", ["next", "dev", "-p", "3001"], {
  cwd: path.join(__dirname, "frontend"),
  shell: true,
  stdio: "inherit"
});

backend.on("close", (code) => console.log(`Backend exited with code ${code}`));
frontend.on("close", (code) => console.log(`Frontend exited with code ${code}`));
