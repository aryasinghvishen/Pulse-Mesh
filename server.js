const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { 
  getRandomSector, 
  setDeviceLocation, 
  getDeviceLocation, 
  getSectorStats,
  removeDevice 
} = require("./server/location");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---- In-memory "mesh" state ----
// nodes: id -> { id, name, x, y, range, battery, socketId, sector }
const nodes = new Map();

// messages: id -> { id, from, to, body, ttl, hopCount, path: [nodeId,...], delivered, seenBy:Set }
const messages = new Map();

const DEFAULT_RANGE = 220; // px, simulated radio range
const DEFAULT_TTL = 8; // max hops before a message dies
const TICK_MS = 900; // how often the mesh "propagates" pending messages

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// returns array of nodeIds within range of a given node (excluding itself)
function neighborsOf(nodeId) {
  const node = nodes.get(nodeId);
  if (!node) return [];
  const out = [];
  for (const [id, other] of nodes) {
    if (id === nodeId) continue;
    const range = Math.min(node.range, other.range);
    if (dist(node, other) <= range) out.push(id);
  }
  return out;
}

function broadcastMeshState() {
  const nodeList = [...nodes.values()].map((n) => ({
    id: n.id,
    name: n.name,
    x: n.x,
    y: n.y,
    range: n.range,
    battery: n.battery,
    sector: n.sector || 'Unknown', // ADDED: include sector in state
  }));
  const edges = [];
  const seen = new Set();
  for (const n of nodeList) {
    for (const nb of neighborsOf(n.id)) {
      const key = [n.id, nb].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([n.id, nb]);
      }
    }
  }
  io.emit("mesh:state", { nodes: nodeList, edges });
}

// nodeId -> array of raw message strings that have reached that device.
// Server-side (not per-browser-tab) so ANY tab can compress ANY device's
// messages — e.g. a "Coordinator" device checking on someone else's status.
const nodeInbox = new Map();

function pushInbox(nodeId, fromId, body) {
  if (!nodeInbox.has(nodeId)) nodeInbox.set(nodeId, []);
  const fromName = nodes.get(fromId)?.name || fromId;
  // ADDED: include sender's sector in the message
  const fromSector = nodes.get(fromId)?.sector || 'Unknown';
  nodeInbox.get(nodeId).push(`(from ${fromName} [${fromSector}]) ${body}`);
}

// Store-and-forward tick: every pending message tries to hop to all current
// neighbors of every node currently holding a copy of it.
function tick() {
  for (const msg of messages.values()) {
    if (msg.delivered || msg.ttl <= 0) continue;

    const holders = [...msg.seenBy];
    let advanced = false;

    for (const holderId of holders) {
      if (!nodes.has(holderId)) continue;
      const neighbors = neighborsOf(holderId);

      for (const nb of neighbors) {
        if (msg.seenBy.has(nb)) continue; // dedup - already has a copy
        msg.seenBy.add(nb);
        msg.path.push(nb);
        advanced = true;

        const nbNode = nodes.get(nb);
        pushInbox(nb, msg.from, msg.body);
        if (nbNode?.socketId) {
          io.to(nbNode.socketId).emit("message:hop", {
            id: msg.id,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            hopAt: nb,
            fromSector: nodes.get(msg.from)?.sector || 'Unknown', // ADDED
          });
        }

        if (nb === msg.to) {
          msg.delivered = true;
          io.emit("message:delivered", {
            id: msg.id,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            hops: msg.path.length,
            fromSector: nodes.get(msg.from)?.sector || 'Unknown', // ADDED
          });
        }
      }
    }

    if (advanced) msg.ttl -= 1;
    if (msg.ttl <= 0 && !msg.delivered) {
      io.emit("message:dropped", { id: msg.id, from: msg.from, to: msg.to });
    }
  }
}
setInterval(tick, TICK_MS);
setInterval(broadcastMeshState, 400);

// ---- Socket handlers ----
io.on("connection", (socket) => {
  socket.on("node:join", ({ id, name, x, y, range, battery }) => {
    // ADDED: assign random sector when node joins
    const sector = getRandomSector();
    setDeviceLocation(id, sector);
    
    nodes.set(id, {
      id,
      name: name || id,
      x: x ?? Math.random() * 600,
      y: y ?? Math.random() * 400,
      range: range ?? DEFAULT_RANGE,
      battery: battery ?? 100,
      socketId: socket.id,
      sector: sector, // ADDED
    });
    socket.data.nodeId = id;
    
    // ADDED: broadcast sector update
    io.emit("location:update", { 
      deviceId: id, 
      sector: sector,
      deviceName: name || id
    });
    
    broadcastMeshState();
  });

  socket.on("node:move", ({ id, x, y }) => {
    const n = nodes.get(id);
    if (n) {
      n.x = x;
      n.y = y;
    }
  });

  // ADDED: manual sector change for demo
  socket.on("device:move", ({ deviceId, sector }) => {
    const n = nodes.get(deviceId);
    if (n) {
      n.sector = sector;
      setDeviceLocation(deviceId, sector);
      io.emit("location:update", { 
        deviceId, 
        sector,
        deviceName: n.name
      });
      broadcastMeshState();
    }
  });

  socket.on("message:send", ({ from, to, body }) => {
    if (!nodes.has(from)) return;
    const id = `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    messages.set(id, {
      id,
      from,
      to,
      body,
      ttl: DEFAULT_TTL,
      path: [from],
      seenBy: new Set([from]),
      delivered: from === to,
    });
    io.emit("message:queued", { 
      id, 
      from, 
      to, 
      body,
      fromSector: nodes.get(from)?.sector || 'Unknown' // ADDED
    });
  });

  socket.on("disconnect", () => {
    const nodeId = socket.data.nodeId;
    if (nodeId && nodes.get(nodeId)?.socketId === socket.id) {
      // ADDED: remove from location tracking
      removeDevice(nodeId);
      io.emit("node:left", { deviceId: nodeId }); // ADDED
      nodes.delete(nodeId);
      broadcastMeshState();
    }
  });
});

// ---- Local fallback compressor (no API key / network needed) ----
// Simple keyword-based triage so the demo never breaks on stage even if
// ANTHROPIC_API_KEY isn't set or the API call fails for any reason.
const CRITICAL_WORDS = ["emergency", "dying", "trapped", "bleeding", "insulin", "can't breathe", "cannot breathe", "heart attack", "unconscious", "urgent help", "danger", "attack"];
const MODERATE_WORDS = ["need water", "need food", "need medicine", "need supplies", "lost", "injured", "hurt", "shelter", "help", "hungry", "thirsty"];

function localFallbackCompress(personName, rawMessages) {
  const joined = rawMessages.join(" ").toLowerCase();
  let urgency = "low";
  if (CRITICAL_WORDS.some((w) => joined.includes(w))) urgency = "critical";
  else if (MODERATE_WORDS.some((w) => joined.includes(w))) urgency = "moderate";

  const status = urgency === "critical" ? "needs_help" : urgency === "moderate" ? "needs_help" : "safe";

  // pull out short need-like phrases heuristically
  const needs = [];
  for (const w of MODERATE_WORDS.concat(CRITICAL_WORDS)) {
    if (joined.includes(w) && needs.length < 3) needs.push(w);
  }

  return {
    status,
    location: "",
    needs: needs.length ? needs : ["check-in only"],
    summary: `${rawMessages.length} message(s) received from ${personName} (local triage, no AI call).`,
    urgency,
  };
}

// ---- Inbox endpoint ----
// Returns every raw message that has reached a given device, regardless of
// which browser tab is asking — this is what makes "Compress" work for a
// coordinator checking on someone else's device.
app.get("/api/inbox/:nodeId", (req, res) => {
  const messages = nodeInbox.get(req.params.nodeId) || [];
  res.json({ messages });
});

// ADDED: Sector stats endpoint
app.get("/api/sectors", (req, res) => {
  res.json(getSectorStats());
});

// ---- AI compression endpoint ----
// Takes recent raw messages and asks Claude to compress them into a
// structured "situation card": status, location, top needs, urgency.
// Falls back to a local heuristic if the API key is missing or the call
// fails, so this feature is demo-safe regardless of network/API status.
app.post("/api/compress", async (req, res) => {
  const { personName, rawMessages } = req.body;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return res.status(400).json({ error: "rawMessages must be a non-empty array" });
  }

  // ADDED: Try to get the person's sector from the first message
  let sector = 'Unknown';
  if (rawMessages.length > 0) {
    const match = rawMessages[0].match(/\[([A-Z]\d)\]/);
    if (match) sector = match[1];
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const result = { ...localFallbackCompress(personName, rawMessages), source: "local" };
    result.location = sector; // ADDED: include sector in response
    return res.json(result);
  }

  try {
    const prompt = `You are compressing a burst of offline mesh-network messages from one person into a compact situation card for a crisis dashboard. You also triage urgency so responders can prioritize who to help first.

Person: ${personName} (currently in sector ${sector})
Messages (most recent last):
${rawMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Urgency guide:
- "critical": immediate danger to life (medical emergency, trapped, out of essential medication, active threat)
- "moderate": real need but not immediately life-threatening (needs supplies, lost, minor injury)
- "low": check-in / status update / no unmet needs

Respond with ONLY minified JSON, no markdown fences, no preamble, in this exact shape:
{"status":"safe|needs_help|unknown","location":"${sector}","needs":["short need 1","short need 2"],"summary":"one sentence summary","urgency":"critical|moderate|low"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error, falling back to local triage:", await response.text());
      const result = { ...localFallbackCompress(personName, rawMessages), source: "local" };
      result.location = sector;
      return res.json(result);
    }

    const data = await response.json();
    const text = data.content.map((c) => c.text || "").join("").trim();
    const cleaned = text.replace(/^```json\s*|```$/g, "").trim();
    const card = JSON.parse(cleaned);
    card.location = sector; // ADDED: override with actual sector
    res.json({ ...card, source: "ai" });
  } catch (err) {
    console.error("Compression failed, falling back to local triage:", err);
    const result = { ...localFallbackCompress(personName, rawMessages), source: "local" };
    result.location = sector;
    res.json(result);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Relay mesh server running on http://localhost:${PORT}`));