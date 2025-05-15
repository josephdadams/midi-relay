# midi-relay

**MIDI over HTTP — simple, powerful, and cross-platform.**  
`midi-relay` lets you send and receive MIDI messages across a network using JSON-based HTTP requests. Built with flexibility in mind, it's perfect for triggering MIDI gear from custom tools, Bitfocus Companion, or remote scripts.

---

## About

Created by **Joseph Adams**, distributed under the **MIT License**.

More info: [www.josephadams.dev](http://www.josephadams.dev)

---

## Features

- Send MIDI messages via HTTP POST (JSON payload)
- Cross-network and cross-subnet support
- Listen for incoming MIDI messages and trigger scripts, HTTP requests, or automation
- Bitfocus Companion integration
- Headless server and desktop app versions

---

## Getting Started

### ▶️ Running midi-relay v3.0+ (Desktop Application)

1. Download the appropriate binary from [Releases](https://github.com/josephdadams/midi-relay/releases)
2. Launch the app on your OS
3. MIDI ports will be scanned on startup
4. The app runs an HTTP server on port `4000` (must be available)

📝 To run it from terminal (headless), use **v2.x** instead.

---

### 💻 Running midi-relay v2.x (Node.js)

#### Manual Run

1. Install Node.js from [nodejs.org](https://nodejs.org/en/download/)
2. Clone or download the source
3. Open terminal and `cd` into the folder
4. Run it with:
   ```bash
   node main.js
   ```

If `midi_triggers.json` is missing, it will be created automatically after you add your first trigger.

#### Running as a Background Service

1. Install [PM2](https://pm2.keymetrics.io/) globally:
   ```bash
   npm install -g pm2
   ```
2. Start the service:
   ```bash
   pm2 start main.js --name midi-relay
   ```
3. (Optional) Enable startup on boot:
   ```bash
   pm2 startup
   ```
4. View logs:
   ```bash
   pm2 logs midi-relay
   ```

---

## API

You can integrate midi-relay into third-party control systems by sending HTTP POST requests with MIDI data in JSON format.

📘 [View the API Documentation](./api.md)

---

## License

MIT License © Joseph Adams
