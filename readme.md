![alt text](views/static/logo.png "midi-relay")

midi-relay was written by Joseph Adams and is distributed under the MIT License.

It is not sold, authorized, or associated with any other company or product.

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).

midi-relay is designed to allow you to send an HTTP POST request, with JSON data in the body, to the server, which will then send out the appropriate MIDI message to a MIDI port/device available to that server. It can be used to send MIDI across networks and subnets. It can also listen to incoming MIDI messages on ports available to the server and then act on them, sending HTTP requests, running scripts, etc.

**RUNNING THIS SOFTWARE FROM BINARY:**
1. Download a binary release from <https://github.com/josephdadams/midi-relay/releases> for your OS.
1. Open a terminal window and change directory to the folder where you placed the binary release.
1. Run the executable from this folder.
1. If this folder does not contain the `midi_triggers.json` file, a new one will be created the next time you add a trigger either via the API or the Settings page.

**RUNNING DIRECTLY WITHIN NODE:**
1. Install `node` if not already installed. <https://nodejs.org/en/download/>
1. Download the midi-relay source code.
1. Open a terminal window and change directory to the folder where you placed the source code.
1. Type `node main.js` within the this folder.
1. If this folder does not contain the `midi_triggers.json` file, a new one will be created the next time you add a trigger either via the API or the Settings page.

**RUNNING AS A SERVICE:**
1. Open a terminal window and change directory to the folder where you placed the source code.
1. Install the Node.js library, `pm2`, by typing `npm install -g pm2`. This will install it globally on your system.
1. After `pm2` is installed, type `pm2 start main.js --name midi-relay` to daemonize it as a service.
1. If you would like it to start automatically upon bootup, type `pm2 startup` and follow the instructions on-screen.
1. To view the console output while running the software with `pm2`, type `pm2 logs midi-relay`.

This program runs an HTTP server listening on port `4000`. If this port is in use and cannot be opened, you will receive an error.

Upon startup, the program will enumerate through the available MIDI input and output ports. It will also process the stored output triggers into memory and open any MIDI ports mentioned and start listening to them for incoming MIDI messages.

A web interface is available to view MIDI ports, triggers, and other information at `/settings`: <http://127.0.0.1:4000/settings>

## Sending MIDI Relay Messages

* Make an `HTTP POST` request with JSON data in the request body to `/sendmidi` on the server running midi-relay to relay a MIDI Message.
* You can also make an `HTTP GET` request with the parameters passed as querystrings.
* Requests can be sent from any computer or device reachable to the midi-relay server.

### Supported MIDI Relay Types
* Note On
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'noteon',
	channel: 0, 
	note: 21,
	velocity: 1
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `note` should be an integer of the MIDI Number value that represents the note, between 21 (A0) and 108 (C8).
	* `velocity` should be a integer between 1 and 127. Defaults to 127 if excluded. A value of 0 is considered a Note Off message.
	* A response of `{result: 'noteon-sent-successfully'}` indicates the note on message was successfully sent.
	
* Note Off
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'noteoff',
	channel: 0,
	note: 21,
	velocity: 0
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `note` should be an integer of the MIDI Number value that represents the note, between 0 and 127.
	* `velocity` should be 0.
	* A response of `{result: 'noteoff-sent-successfully'}` indicates the note off message was successfully sent.

* Polyphonic Aftertouch
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'aftertouch',
	channel: 0,
	note: 21,
	value: 1
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `note` should be an integer of the MIDI Number value that represents the note, between 0 and 127.
	* `value` should be a integer between 0 and 127.
	* A response of `{result: 'aftertouch-sent-successfully'}` indicates the Aftertouch message was successfully sent.
	
* CC (Control Change)
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'cc',
	channel: 0,
	controller: 0,
	value: 0
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `controller` should be a integer between 0 and 127.
	* `value` should be a integer between 0 and 127.
	* A response of `{result: 'cc-sent-successfully'}` indicates the CC message was successfully sent.
	
* PC (Program Change)
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'pc',
	channel: 0,
	value: 0
	}
	```

	* `channel` should be a integer between 0 and 15.
	* `value` should be a integer between 0 and 127.
	* A response of `{result: 'pc-sent-successfully'}` indicates the PC message was successfully sent.

* Channel Pressure / Aftertouch
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'pressure',
	channel: 0,
	value: 1
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `value` should be a integer between 0 and 127.
	* A response of `{result: 'pressure-sent-successfully'}` indicates the Channel Pressure / Aftertouch message was successfully sent.

* Pitch Bend / Pitch Wheel
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'pitchbend',
	channel: 0,
	value: 0
	}
	```
	
	* `channel` should be a integer between 0 and 15.
	* `value` should be a integer between 0 and 16,383.
	* A response of `{result: 'pitchbend-sent-successfully'}` indicates the Pitch Bend message was successfully sent.

* MSC (MIDI Show Control)
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'msc',
	deviceid: 0,
	commandformat: 'lighting.general',
	command: 'go',
	cue: '10',
	cuelist: '13',
	cuepath: ''
	}
	```

	* `deviceid` should be an integer between 0 and 111\. It can also be a string 'g1' through 'g15' to represent groups, or it can be 'all'.

	* `commandformat` should be a string with one of the following values:
		* lighting.general
		* sound.general
		* machinery.general
		* video.general
		* projection.general
		* processcontrol.general
		* pyro.general
		* all
		* Any other value for _commandformat_ will default to 'all'.
	
	* `command` should be a string with one of the following values:
		* go
		* stop
		* gojam
		* gooff
		* resume
		* timedgo
		* load
		* set
		* fire
		* alloff
		* restore
		* reset
		* opencuelist
		* closecuelist
		* startclock
		* stopclock
		* Any other value for `command` will default to 'go'.  

	* Values for `cue`, `cuelist`, and `cuepath` are all optional strings. If left blank ('') or not included in the object, those will not be included in the MIDI command that is generated.

	* A response of `{result: 'msc-sent-successfully'}` indicates the MSC message was successfully sent. The `message` will also be returned containing the exact MIDI message that was sent, in decimal form.

* Sysex MIDI Message
	```javascript
	{
	midiport: 'MIDI Port Name',
	midicommand: 'sysex',
	message: '0x90, 63, 127'
	}
	```
	
	* `message` should contain the actual MIDI message in bytes. Bytes can be either in hexadecimal or decimal, separated by commas.
	* A response of `{result: 'sysex-sent-successfully'}` indicates the SysEx MIDI message was successfully sent.
	
All values for `channel` are zero-based. (e.g., Channel of `1` should be sent as `0`.)
	
### Getting MIDI Output Port Names
Make a GET request to `/midi_outputs` to return a JSON list of MIDI Output ports/devices available on the server.

## Receiving MIDI Input Messages
The midi-relay server can also listen for incoming MIDI messages and act on them.

A MIDI Input Port must be specifically opened in order to receive and process the MIDI data.

### Supported MIDI Input Message Types
The following incoming MIDI Messages are currently supported:
* Note On
* Note Off
* Polyphonic Aftertouch
* Control Change
* Program Change
* Channel Pressure / Aftertouch
* Pitch Bend / Pitch Wheel
* SysEx (System Exclusive)

### Opening a Port
Make a POST request to `/openport` with a JSON object:
```javascript
{
	midiport: 'MIDI Port Name'
}
```

### Closing a Port
Make a POST request to `/closeport` with a JSON object:
```javascript
{
	midiport: 'MIDI Port Name'
}
```

### Getting MIDI Input Port Names
You can make a GET request to `/midi_inputs` if you need the names of available MIDI input ports on the server. If a port is already opened, that object in the returned array will have a property of `opened: true`.

### MIDI Input Triggers
In order for midi-relay to act on an incoming MIDI message, a trigger must exist that matches the conditions of the incoming message on the specified MIDI port.

You can make a GET request to `/triggers` to see a list of currently stored triggers.

### Adding a Trigger
Make a POST request with JSON object data to `/addtrigger` with the following options:

Each trigger must specify a `midiport` using the name of the port as a string.

A `midicommand` property must also be included:
* `noteon` (Note On)
	* Must include properties `channel`, `note`, and `velocity` in the trigger. You can use an asterisk `"*"` as a wildcard to match any `channel`, or `velocity` value. A `note` value must always be specific.
* `noteoff` (Note Off)
	* Same as `noteon`. Any `noteon` or `noteoff` message with a `velocity` value of `0`, it will be treated as a `noteoff` message when processed.
* `aftertouch` (Polyphonic Aftertouch)
	* Must include properties `channel`, `note`, and `value` in the trigger. An asterisk `"*"` can be used as a wildcard for `channel` and/or `value`.
* `cc` (Control Change)
	* Must include properties `channel`, `controller`, and `value` in the trigger. An asterisk `"*"` can be used as a wildcard for `channel` and/or `value`.
* `pc` (Program Change)
	* Must include properties `channel` and `value` in the trigger. An asterisk `"*"` can be used as a wildcard for `channel` and/or `value`.
* `pressure` (Channel Pressure / Aftertouch)
	* Must include properties `channel` and `value` in the trigger. An asterisk `"*"` can be used as a wildcard for `channel` and/or `value`.
* `pitchbend` (Pitch Bend / Pitch Wheel)
	* Must include properties `channel` and `value` in the trigger. An asterisk `"*"` can be used as a wildcard for `channel` and/or `value`.
* `sysex` (System Exclusive)
	* Must include `message` property in the trigger as a string with values separated by spaces or commas. All values will be converted to decimal.
	
In addition to specifying a `midicommand` and related command properties, an `actiontype` must also be specified.

The following action types are currently supported:
* `http` (HTTP GET or POST)
	* Include a object property of `url` to send the URL.
	* Include `jsondata` with the stringified JSON to send as HTTP POST. Otherwise, it will send as HTTP GET.
* `applescript` (AppleScript, MacOS only)
	* Results of script or any errors will appear in the console/terminal.
* `shellscript` (Shell Script)
	* Output of shell scripts will appear in the console/terminal.

You can also include a `description` field to store information related to the trigger, what it does, etc.

#### Example Trigger Object
```javascript
{
midiport: 'IAC Driver Bus 1',
midicommand: 'noteon',
note: 73,
channel: 1,
velocity: 100,
actiontype: 'http',
url: 'http://127.0.0.1/test',
description: 'description of the trigger'
}
```

### Deleting a Trigger
To delete an existing trigger, make a GET request to `/deletetrigger/[trigger-id]`.

The trigger ID is autogenerated by the system and viewable in the `midi-triggers.json` file.

## Other APIs

* Making a GET request to `/refresh` will refresh the list of available MIDI ports and update the internal variables with these ports.
* Making a GET request to `/version` will send the version of the software, based on the information in `package.json`.

## API Responses
The API will respond with JSON messages for each action received.

* `invalid-midi-port`: The MIDI port you specified is invalid or is no longer available. Call `/refresh` to get the latest list of available ports.
* `invalid-midi-command`: The MIDI command you sent is invalid or not implemented.
* `midiin-port-cannot-be-opened`: The MIDI Input port cannot be opened due to an internal error.
* `midiin-port-opened`: The MIDI Input port is now open.
* `midiin-port-already-opened`: The MIDI Input port was already open.
* `midiin-port-cannot-be-closed`: The MIDI Input port cannot be closed due to an internal error.
* `midiin-port-closed`: The MIDI Input port is now closed.
* `ports-refreshed-successfully`: MIDI Input/Output ports were refreshed and updated successfully.
* `noteon-sent-successfully`: The Note On message was sent successfully.
* `noteoff-sent-successfully`: The Note Off message was sent successfully.
* `aftertouch-sent-successfully`: The Polyphonic Aftertouch message was sent successfully.
* `cc-sent-successfully`: The Control Change message was sent successfully.
* `pc-sent-successfully`: The Program Change message was sent successfully.
* `pressure-sent-successfully`: The Channel Pressure / Aftertouch message was sent successfully.
* `pitchbend-sent-successfully`: The Pitch Bend message was sent successfully.
* `msc-sent-successfully`: The MSC (MIDI Show Control) message was sent successfully.
* `sysex-sent-successfully`: The SysEx MIDI message was sent successfully.
* `sysex-invalid`: The provided message was not a valid SysEx message.
* `could-not-open-midi-out`: The specified MIDI-Out port could not be opened. The message was not sent.
* `invalid-action-type`: The action type specified in the Add Trigger API was not valid.
* `trigger-added`: The trigger was added successfully.
* `trigger-added-midiin-port-cannot-be-opened`: The trigger was added, but the MIDI In port could not be automatically opened.
* `trigger-edited`: The trigger was edited successfully.
* `trigger-edited-midiin-port-cannot-be-opened`: The trigger was edited, but the MIDI In port could not be automatically opened.
* `trigger-deleted`: The trigger was deleted successfully.
* `trigger-not-found`: The Trigger could not be found due to an invalid/incorrect Trigger ID, or it was already deleted.
* `error`: An unexpected error occurred. Check the `error` property for more information.

The console/terminal output running the server process is also verbose and will report on the current status of the server.

## MDNS/Bonjour Discovery
The midi-relay server will broadcast itself on the network as `midi-relay` on the listening port. It will also monitor for other midi-relay servers available on the network. This list can be accessed by making a GET request to `/hosts`.
