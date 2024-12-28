# midi-relay API

midi-relay has both a REST-based API as well as a socket.io API. Both run on Port `4000`.

## REST API

It is possible to disable remote control within the context menu of the midi-relay application. If this is done, you will receive this response when using the REST API:

```javascript
{
	control_status: false
}
```

## socket.io API

Upon connection, the server will emit the `control_status` event to let the client know whether or not remote control is available. This will be emitted any time it is changed. It can also be requested by the client at any time by emitting a `control_status` event. A boolean is returned, with `true` meaning it is enabled, and `false` being disabled.

## Available Methods

### REST: `/`: GET

Returns the "about" page.

### REST: `/version`: GET

### socket.io: 'version'

Returns the version of midi-relay currently running.

```javascript
{version: 3.0.0}
```

### REST: `/control_status`: GET

### socket.io: 'control_status'

Returns whether remote control is currently enabled or not in midi-relay

```javascript
{
	control_status: true
}
```

### REST: `/midi_outputs`: GET

### socket.io: 'midi_outputs'

Returns the available MIDI Output ports.

```javascript
;[
	{ id: 'Apple DLS Synth', name: 'Apple DLS Synth', manufacturer: 'Apple', version: '1.0', engine: 'node' },
	{ id: 'Network Session 1', name: 'Network Session 1', manufacturer: '', version: '0.0', engine: 'node' },
	{ id: 'IAC Driver Bus 1', name: 'IAC Driver Bus 1', manufacturer: 'Apple Inc.', version: '0.0', engine: 'node' },
	{
		id: 'midi-relay Virtual',
		name: 'midi-relay Virtual',
		manufacturer: 'virtual',
		version: '0.0',
		engine: 'javascript',
	},
]
```

### REST: `/refresh`: GET

### socket.io: 'refresh'

Refreshes the list of MIDI output ports, in case they have changed since midi-relay was first launched.

```javascript
{
	result: 'refresh-command-sent'
}
```

### REST: `/sendmidi`: POST or GET

### socket.io: 'midirelay'

Send a midi-relay object via `application/json` in a POST request to control midi-relay.
You can also send it in a GET request with the properties as querystring parameters.

```javascript
{
	midiport: 'IAC Driver Bus 1',
	midicommand: 'noteon',
	channel: 1,
	note: 21,
	velocity: 127
}
```

### socket.io: `error`:

Emitted whenever there is an error. Contains the error message as a string.

### Supported MIDI Relay Types

- Note On

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'noteon',
  channel: 0,
  note: 21,
  velocity: 1
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `note` should be an integer of the MIDI Number value that represents the note, between 21 (A0) and 108 (C8).
  - `velocity` should be a integer between 1 and 127. Defaults to 127 if excluded. A value of 0 is considered a Note Off message.
  - A response of `{result: 'noteon-sent-successfully'}` indicates the note on message was successfully sent.

- Note Off

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'noteoff',
  channel: 0,
  note: 21,
  velocity: 0
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `note` should be an integer of the MIDI Number value that represents the note, between 0 and 127.
  - `velocity` should be 0.
  - A response of `{result: 'noteoff-sent-successfully'}` indicates the note off message was successfully sent.

- Polyphonic Aftertouch

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'aftertouch',
  channel: 0,
  note: 21,
  value: 1
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `note` should be an integer of the MIDI Number value that represents the note, between 0 and 127.
  - `value` should be a integer between 0 and 127.
  - A response of `{result: 'aftertouch-sent-successfully'}` indicates the Aftertouch message was successfully sent.

- CC (Control Change)

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'cc',
  channel: 0,
  controller: 0,
  value: 0
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `controller` should be a integer between 0 and 127.
  - `value` should be a integer between 0 and 127.
  - A response of `{result: 'cc-sent-successfully'}` indicates the CC message was successfully sent.

- PC (Program Change)

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'pc',
  channel: 0,
  value: 0
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `value` should be a integer between 0 and 127.
  - A response of `{result: 'pc-sent-successfully'}` indicates the PC message was successfully sent.

- Channel Pressure / Aftertouch

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'pressure',
  channel: 0,
  value: 1
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `value` should be a integer between 0 and 127.
  - A response of `{result: 'pressure-sent-successfully'}` indicates the Channel Pressure / Aftertouch message was successfully sent.

- Pitch Bend / Pitch Wheel

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'pitchbend',
  channel: 0,
  value: 0
  }
  ```

  - `channel` should be a integer between 0 and 15.
  - `value` should be a integer between 0 and 16,383.
  - A response of `{result: 'pitchbend-sent-successfully'}` indicates the Pitch Bend message was successfully sent.

- MSC (MIDI Show Control)

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

  - `deviceid` should be an integer between 0 and 111\. It can also be a string 'g1' through 'g15' to represent groups, or it can be 'all'.

  - `commandformat` should be a string with one of the following values:
    - lighting.general
    - sound.general
    - machinery.general
    - video.general
    - projection.general
    - processcontrol.general
    - pyro.general
    - all
    - Any other value for _commandformat_ will default to 'all'.
  - `command` should be a string with one of the following values:

    - go
    - stop
    - gojam
    - gooff
    - resume
    - timedgo
    - load
    - set
    - fire
    - alloff
    - restore
    - reset
    - opencuelist
    - closecuelist
    - startclock
    - stopclock
    - Any other value for `command` will default to 'go'.

  - Values for `cue`, `cuelist`, and `cuepath` are all optional strings. If left blank ('') or not included in the object, those will not be included in the MIDI command that is generated.

  - A response of `{result: 'msc-sent-successfully'}` indicates the MSC message was successfully sent. The `message` will also be returned containing the exact MIDI message that was sent, in decimal form.

- Sysex MIDI Message

  ```javascript
  {
  midiport: 'MIDI Port Name',
  midicommand: 'sysex',
  message: '0x90, 63, 127'
  }
  ```

  - `message` should contain the actual MIDI message in bytes. Bytes can be either in hexadecimal or decimal, separated by commas.
  - A response of `{result: 'sysex-sent-successfully'}` indicates the SysEx MIDI message was successfully sent.

All values for `channel` are zero-based. (e.g., Channel of `1` should be sent as `0`.)

## Receiving MIDI Input Messages

The midi-relay server can also listen for incoming MIDI messages and act on them.

A MIDI Input Port must be specifically opened in order to receive and process the MIDI data.

### Supported MIDI Input Message Types

The following incoming MIDI Messages are currently supported:

- Note On
- Note Off
- Polyphonic Aftertouch
- Control Change
- Program Change
- Channel Pressure / Aftertouch
- Pitch Bend / Pitch Wheel
- SysEx (System Exclusive)

### MIDI Input Triggers

In order for midi-relay to act on an incoming MIDI message, a trigger must exist that matches the conditions of the incoming message on the specified MIDI port.

You can make add/edit/remove triggers by using the web interface. Navigate to `http://127.0.0.1:4000/` (replace `127.0.0.1` with the IP of the computer running midi-relay if it is not the same computer you are on.)
