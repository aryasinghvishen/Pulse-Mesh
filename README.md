# Pulse Mesh

### Offline Mesh Networking with AI-Powered Crisis Triage

Pulse Mesh is a decentralized disaster-response communication simulation that enables resilient communication when traditional infrastructure fails. Devices form a peer-to-peer mesh network, relay messages using store-and-forward routing, and leverage AI-powered crisis triage to help responders identify, prioritize, and coordinate emergency situations in real time.

---

## Features

- 📡 **Offline Mesh Networking** using multi-hop communication
- 🔄 **Store-and-Forward Routing** with Time-to-Live (TTL) based message propagation
- 🤖 **AI-Powered Crisis Triage** that summarizes and prioritizes incoming situations
- 🚨 **Automatic Urgency Classification** (Critical, Moderate, Low)
- 🌐 **Interactive Network Visualization** using an HTML5 Canvas
- 📱 **Multi-Device Simulation** where each browser tab represents a device
- ⚡ **Real-Time Communication** powered by Socket.IO
- 📋 **Situation Board** for responders to quickly assess ongoing incidents

---

## Demo

### Network Simulation

Each browser tab represents an independent device within the mesh network.

Devices communicate only when they are within each other's radio range. Messages automatically hop through intermediate devices until they reach their destination.

This simulates communication during disasters where cellular towers or internet connectivity are unavailable.

---

## Getting Started

### Prerequisites

- Node.js v16 or later
- npm

### Installation

```bash
git clone https://github.com/<your-username>/Pulse-Mesh.git
cd Pulse-Mesh
npm install
```

### Run the Application

```bash
npm start
```

Open the local address displayed in the terminal (typically `http://localhost:3000`).

---

## How to Use

### 1. Create Devices

Open multiple browser tabs.

Each tab acts as an independent mesh node.

Create 4–5 devices such as:

- Alice
- Bob
- Charlie
- David
- Emma

Each device appears on the network canvas with a circular communication radius.

---

### 2. Simulate Network Conditions

Drag devices around the canvas.

- Devices inside each other's range communicate directly.
- Devices outside direct range rely on intermediate relay nodes.

This demonstrates decentralized communication without infrastructure.

---

### 3. Demonstrate Multi-Hop Routing

Arrange the devices like this:

```
Alice ---- Bob ---- Charlie ---- David ---- Emma
```

Move Alice and Emma outside each other's communication range.

Send a message from Alice to Emma.

The message automatically travels through:

```
Alice
   ↓
Bob
   ↓
Charlie
   ↓
David
   ↓
Emma
```

showing store-and-forward routing through the mesh network.

---

### 4. Simulate Network Failure

Move one relay device out of range while a message is travelling.

The message will expire after exceeding its Time-to-Live (TTL), demonstrating realistic routing failures during disaster scenarios.

---

### 5. AI Crisis Triage

Send several messages to a single device, for example:

```
"We need drinking water."

"Someone is injured."

"Where is the nearest shelter?"

"We're safe."
```

Select the device and click:

**Compress Recent Messages**

Pulse Mesh generates an AI-powered incident summary including:

| Field | Description |
|--------|-------------|
| Status | Safe, Needs Help, or Unknown |
| Location | Estimated Sector (A1–D4) |
| Needs | Water, Food, Medical, Shelter, etc. |
| Urgency | Critical, Moderate, Low |
| Summary | Concise overview of the situation |

Situation cards automatically sort by urgency so responders immediately see the highest-priority cases.

---

# System Architecture

| Component | Technology |
|------------|------------|
| Mesh Routing | Store-and-Forward with TTL |
| Network Simulation | Distance-based Radio Range |
| Real-Time Communication | Socket.IO |
| Backend | Node.js + Express |
| Visualization | HTML5 Canvas |
| AI Triage | Local Offline Analysis (Optional AI Enhancement) |

---

## Tech Stack

- Node.js
- Express.js
- Socket.IO
- JavaScript
- HTML5 Canvas
- CSS3

---

## How It Works

```
             Device A
                 │
                 │
           Store & Forward
                 │
      ┌──────────┴──────────┐
      │                     │
  Relay Node 1         Relay Node 2
      │                     │
      └──────────┬──────────┘
                 │
             Device B

          ↓

      Situation Board

          ↓

     AI Crisis Triage

          ↓

   Prioritized Incident Cards
```

---

## AI Crisis Triage

Instead of forcing responders to read dozens of individual messages, Pulse Mesh analyzes incoming communication and generates structured incident summaries.

Each incident is automatically classified based on:

- Medical emergencies
- Food shortages
- Water shortages
- Shelter requests
- Safety confirmations
- Overall urgency

This transforms raw communication into actionable coordination.

---

## Real-World Use Case

Imagine a flood, earthquake, or hurricane where mobile towers and internet connectivity are unavailable.

People nearby automatically form a mesh network.

Messages travel between devices until they reach volunteers or emergency responders.

Instead of manually reading hundreds of distress messages, responders receive AI-generated incident summaries ranked by urgency, allowing faster and more effective decision-making.

---

## Future Improvements

- 📍 GPS-based live location sharing
- 🗺️ Interactive rescue map using Leaflet
- 🚑 AI-powered volunteer allocation
- 📦 Resource inventory management
- 🔋 Battery-aware relay optimization
- 📢 Emergency broadcast messages
- 📡 Native Bluetooth / Wi-Fi Direct communication
- 🌍 Offline maps and shelter locations
- 🤝 WebRTC peer-to-peer communication

---

## About This Demo

Pulse Mesh uses a distance-based radio range simulation to emulate Bluetooth and Wi-Fi Direct communication.

This allows the complete behavior of a decentralized mesh network—including multi-hop routing, relay failures, and AI-assisted coordination—to be demonstrated entirely on standard laptops without requiring specialized hardware.

The AI crisis triage system functions offline using local analysis, ensuring the application remains fully operational even without internet connectivity.

---

## License

This project is licensed under the MIT License.

---

## Built For

Disaster Response • Emergency Communication • Humanitarian Coordination • Hackathons
