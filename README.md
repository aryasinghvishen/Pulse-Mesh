# Pulse Mesh — Offline Mesh Communication + AI Crisis Triage

Simulates a no-internet, no-cell-tower world: devices form a peer-to-peer mesh
based on simulated radio range, and messages hop store-and-forward from device
to device until they reach their target (or their TTL runs out and they're
dropped). An optional AI feature compresses a burst of messages reaching one
device into a compact "situation card" (status / location / needs).

## Run it

```bash
npm install
export ANTHROPIC_API_KEY=your_key_here   # optional, only needed for the AI card feature
npm start
```

Open **http://localhost:3000** in a few browser tabs (or windows side by
side) — each tab is one "device" once you click "Add Device to Mesh".

## How to demo it

1. Add 4-5 devices (e.g. Alice, Bob, Charlie, David, Emma) — they'll appear
   as dots on the canvas with a translucent circle showing their range.
2. Drag Alice and Emma far apart so they're **not** directly in range of each
   other, but Bob/Charlie/David form a chain between them.
3. Send a message from Alice to Emma. Watch the log panel: it queues, then
   hops device to device, then delivers — even though Alice and Emma never
   had a direct connection. This is the core "no infrastructure" story.
4. Drag a middle node out of range mid-transit to show a message getting
   dropped (TTL expires, no route) — good visual for judges to show realism.
5. Send several messages *to* one device from different senders ("where are
   you", "we need water", "is the shelter still open"), then hit **Compress
   Recent Messages** for that device to show the AI situation card — this is
   your "why AI, why now" moment in the pitch. The card is also ranked by
   **urgency** (critical / moderate / low) and the board auto-sorts so the
   most urgent cases float to the top with a colored left border — this is
   what turns "communication" into "coordination."

## What's real engineering vs. what's AI-assisted

- **Yours to build on / extend:** the relay algorithm (`tick()` in
  `server.js`), range/neighbor computation, TTL and dedup logic, the mesh
  visualization, and the drag-to-simulate-movement UI. This is the core of
  your submission and the part judges will look at for technical depth —
  push on this (see "Next steps" below).
- **AI-assisted, scoped narrowly:** a single `/api/compress` endpoint that
  turns raw text into structured JSON. This keeps AI usage to one clearly
  labeled feature rather than the whole app, which matters for the
  "AI-generated content ≤ 30%" rule.

## Honest framing for judges

This demo simulates Bluetooth/Wi-Fi Direct range with on-screen pixel
distance rather than real radios, so you can demo the mesh behavior on
laptops without needing real phones or BLE hardware. Say this explicitly in
your pitch — it's a legitimate simulation technique, not a shortcut you need
to hide, and judges will respect the transparency more than they'll penalize
the simplification.

## Next steps if you have time

- **Priority messages:** add an `urgent` flag that jumps the relay queue
  and is drawn in red.
- **Real device-to-device transport:** swap the simulated range/socket
  relay for actual `WebRTC` data channels between browser tabs on the same
  LAN, or `Android Nearby Connections` / iOS `MultipeerConnectivity` if you
  want a true mobile demo.
- **Beacons:** a shared "board" of pinned locations (shelter, water, medical)
  that also propagates through the mesh instead of just 1:1 messages.
- **Battery-aware relay:** nodes below a battery threshold stop relaying
  for others (only handle their own messages) — ties back into the
  original "battery optimization" idea and adds a realistic constraint.
