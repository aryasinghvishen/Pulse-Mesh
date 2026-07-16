const { io } = require("socket.io-client");
const http = require("http");

const a = io("http://localhost:3000"); // Arya
const b = io("http://localhost:3000"); // Pranay

a.on("connect", () => a.emit("node:join", { id: "A", name: "Arya", x: 100, y: 100, range: 220 }));
b.on("connect", () => b.emit("node:join", { id: "B", name: "Pranay", x: 150, y: 150, range: 220 }));

setTimeout(() => {
  a.emit("message:send", { from: "A", to: "B", body: "we are short on food, please help" });
}, 500);

setTimeout(() => {
  // simulate a THIRD, totally separate tab (no socket at all) fetching Pranay's inbox via plain HTTP
  http.get("http://localhost:3000/api/inbox/B", (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      console.log("Inbox fetched from an unrelated HTTP client (simulating a 3rd tab):");
      console.log(data);
      process.exit(0);
    });
  });
}, 2000);
