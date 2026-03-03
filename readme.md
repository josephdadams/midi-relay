# midi-relay

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![MIDI](https://img.shields.io/badge/protocol-MIDI-orange)

**MIDI over HTTP --- simple, powerful, and production-ready.**

`midi-relay` allows you to send and receive MIDI messages across a
network using JSON-based HTTP requests. It is designed for automation,
control systems, live production environments, and integration with
tools like Bitfocus Companion.

---

## 🚀 Why midi-relay?

- Trigger MIDI from HTTP requests
- Integrate with control systems and automation platforms
- Deploy as a desktop utility or rack-mounted headless service
- Lightweight and reliable
- Built for real-world production environments

Created by **Joseph Adams**\
MIT Licensed\
More projects: https://www.josephadams.dev

---

# ✨ Features

- Send MIDI messages via HTTP POST (JSON payload)
- Receive incoming MIDI and trigger automation
- Cross-network / cross-subnet support
- Bitfocus Companion friendly
- Desktop app (macOS / Windows)
- Headless Linux service (ideal for Raspberry Pi)

---

# 🖥 Desktop Installation (macOS / Windows)

1.  Download the latest release:
    https://github.com/josephdadams/midi-relay/releases
2.  Launch the application
3.  MIDI ports scan automatically on startup
4.  HTTP server runs on port `4000` (default)

That's it.

---

# 🍓 Raspberry Pi / Linux Installation (Headless Mode)

For rack deployments, automation servers, and embedded systems, run
`midi-relay` as a system service.

## One-Line Installer

Run this directly on your Raspberry Pi:

```bash
curl -fsSL https://raw.githubusercontent.com/josephdadams/midi-relay/main/install.sh | bash
```

The installer will:

- Install Node.js (ARM64)
- Install required system libraries (ALSA)
- Clone the repository into `/opt/midi-relay`
- Build native MIDI modules correctly for ARM
- Create a dedicated `midi` system user
- Install and enable a systemd service
- Configure automatic startup on boot

---

## 🔍 Service Management

Check service status:

```bash
sudo systemctl status midi-relay
```

View live logs:

```bash
journalctl -u midi-relay -f
```

The service automatically restarts if it crashes.

---

# 🧪 Development Mode

For development or testing:

```bash
git clone https://github.com/josephdadams/midi-relay.git
cd midi-relay
yarn install
node index.js
```

On macOS / Windows (Electron GUI):

```bash
yarn start
```

---

# 📡 API Example

Send MIDI via HTTP POST:

```json
{
	"type": "noteon",
	"channel": 1,
	"note": 60,
	"velocity": 127
}
```

Default endpoint:

    http://localhost:4000

Full documentation:

📘 See `api.md`

---

# 🛠 Deployment Use Cases

- Church AVL control systems
- Companion integrations
- Remote MIDI triggering
- Automation servers
- Network-controlled hardware
- Rack-mounted MIDI appliances

---

# 📄 License

MIT License © Joseph Adams
