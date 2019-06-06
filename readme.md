# About MIDI Relay

MIDI Relay was written by Joseph Adams and is distributed under the MIT License.

It is not sold, authorized, or associated with any other company or product.  

To contact the author or for more information, please visit [www.techministry.blog](http://www.techministry.blog).

**INSTALLING THIS SOFTWARE:**
`npm install midi-relay`
To run, `node main.js` within the midi-relay folder.

**TO USE THIS SOFTWARE:**  

1.  This program runs an HTTP server listening on port 4000.
2.  Upon startup, the program will enumerate through the available MIDI ports.
3.  Making a GET request to `/midi_inputs` will return a JSON list of MIDI Input ports available on the server.
4.  Making a GET request to `/midi_outputs` will return a JSON list of MIDI Output ports available on the server.
5.  Making a GET request to `/refresh` will refresh the list of available MIDI ports and update the internal variables with these ports. A JSON response of `{result: 'ports-refreshed-successfully'}` indicates it was successful.
6.  Making a POST request to `/sendmidi` will send a MIDI command to the port identified in the JSON object included in the POST body.  
    If sending a MIDI Note On or Note Off, the JSON object should be in this format:  
    ```javascript
	{  
    midiport: 'MIDI Port Name',  
    midicommand: 'noteon',  
    note: 21,  
    channel: 0,  
    velocity: 1  
    }
	```

    A JSON response of `{result: 'note-on-sent-successfully'}` indicates the note was successfully sent. A _midicommand_ of _noteon_ specifies a MIDI Note On command. _noteoff_ specifies that it is a Note Off command.  

    *   _note_ should be an integer of the MIDI Number value that represents the note, between 21 (A0) and 108 (C8).
    *   _channel_ should be a integer between 0 and 15.
    *   _velocity_ should be a integer between 1 and 127.
	
    To send a MSC (MIDI Show Control) message, the JSON object should be in this format:
	```javascript
    {
    midiport: 'MIDI Port Name',  
    midicommand: 'msc',  
    deviceid: 0,  
    commandformat: 'lighting.general',  
    command: 'go',  
    cue: '10',  
    cuelist: '13',  
    cuepath: '' }
	```

    _deviceid_ should be an integer between 0 and 111\. It can also be a string "g1" through "g15" to represent groups, or it can be "all".  

    _commandformat_ should be a string with one of the following values:
    *   lighting.general
    *   sound.general
    *   machinery.general
    *   video.general
    *   projection.general
    *   processcontrol.general
    *   pyro.general
    *   all
	Any other value for _commandformat_ will default to "all".  

    _command_ should be a string with one of the following values:
    *   go
    *   stop
    *   gojam
    *   gooff
    *   resume
    *   timedgo
    *   load
    *   set
    *   fire
    *   alloff
    *   restore
    *   reset
    *   opencuelist
    *   closecuelist
    *   startclock
    *   stopclock
	
	Any other value for _command_ will default to "go".  

    Values for _cue_, _cuelist_, and _cuepath_ are all optional strings. If left blank ("") or not included in the object, those will not be included in the MIDI command that is generated.  
    A JSON response of `{result: 'msc-sent-successfully'}` indicates the note was successfully sent.