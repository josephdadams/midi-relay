midi-relay was written by Joseph Adams and is distributed under the MIT License.

It is not sold, authorized, or associated with any other company or product.

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).

midi-relay is designed to allow you to send an HTTP POST request, with JSON data in the body, to the server, which will then send out the appropriate MIDI message to a MIDI port/device available to that server. It can be used to send MIDI across networks and subnets. It can also listen to incoming MIDI messages on ports available to the server and then act on them, sending HTTP requests, running scripts, etc.

# midi-relay v3.0 and higher:

**RUNNING THIS SOFTWARE FROM BINARY:**

1. Download a binary release from <https://github.com/josephdadams/midi-relay/releases> for your OS.
1. As of v3.0.0, only desktop application versions are available. To run midi-relay from terminal, use an older version.

# midi-relay < v3.0:

**RUNNING DIRECTLY WITHIN NODE FOR VERSIONS < 3.0:**

1. Install `node` if not already installed. <https://nodejs.org/en/download/>
1. Download the midi-relay source code.
1. Open a terminal window and change directory to the folder where you placed the source code.
1. Type `node main.js` within the this folder.
1. If this folder does not contain the `midi_triggers.json` file, a new one will be created the next time you add a trigger either via the API or the Settings page.

**RUNNING AS A SERVICE, FOR VERSIONS < 3.0:**

1. Open a terminal window and change directory to the folder where you placed the source code.
1. Install the Node.js library, `pm2`, by typing `npm install -g pm2`. This will install it globally on your system.
1. After `pm2` is installed, type `pm2 start main.js --name midi-relay` to daemonize it as a service.
1. If you would like it to start automatically upon bootup, type `pm2 startup` and follow the instructions on-screen.
1. To view the console output while running the software with `pm2`, type `pm2 logs midi-relay`.

This program runs an HTTP server listening on port `4000`. If this port is in use and cannot be opened, you will receive an error.

Upon startup, the program will enumerate through the available MIDI output ports.

# Sending MIDI Relay Messages

This program is designed to work with a partner module for Bitfocus Companion, however an API is available should you desire to work with it through your own third-party control systems.

[Click here to view the API.](./api.md)
