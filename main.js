/* MIDI Relay */

//Express API variables
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
var restServer = null;
const listenPort = 4000;

//MIDI variables
var navigator = require('JZZ');
var MIDI_inputs = [];
var MIDI_outputs = [];

//other variables
var _ = require('lodash');

function setUpApp() {
	initialRESTSetup();
	initialMIDISetup();
}

function initialRESTSetup() {
 	// starts the Express server that will listen for incoming requests to send/receive commands and objects
 	restServer = express();
 	restServer.use(bodyParser.json({ type: 'application/json' }));

	//about the author, this program, etc.
		restServer.get('/', function (req, res) {
		res.sendFile('views/index.html', { root: __dirname });
	});
	
	restServer.get('/midi_inputs', function (req, res) {
		//gets all MIDI input ports
		res.send(MIDI_inputs);
	});

	restServer.get('/midi_outputs', function (req, res) {
		//gets all MIDI output ports
		res.send(MIDI_outputs);
	});
	
	restServer.get('/refresh', function (req, res) {
		//refresh available ports
		res.send(RefreshPorts());
	});

	restServer.post('/sendmidi', function (req, res) {
		//sends MIDI using the provided JSON object in the POST body
		
		let midiObj = req.body;
		
		switch(midiObj.midicommand)
		{
			case 'noteon':
				res.send(SendMIDI_NoteOn(midiObj.midiport, midiObj.note, midiObj.channel, midiObj.velocity));
				break;
            case 'mcc':
                res.send(SendMIDI_MCC(midiObj.midiport, midiObj.param, midiObj.channel, midiObj.setvalue));
                break;
			case 'noteoff':
				res.send(SendMIDI_NoteOff(midiObj.midiport, midiObj.note, midiObj.channel, midiObj.velocity));
				break;
			case 'msc':
				res.send(SendMIDI_MSC(midiObj.midiport, midiObj.deviceid, midiObj.commandformat, midiObj.command, midiObj.cue, midiObj.cuelist, midiObj.cuepath));
				break;
			default:
				res.send({error: 'invalid-request'});
				break;
		}
	});

	//serve up any files in the static folder like images, CSS, client-side JS, etc.
	restServer.use(express.static('views/static'));

	restServer.use(function (req, res) {
		res.status(404).send({error: true, url: req.originalUrl + ' not found.'});
	});

	restServer.listen(listenPort);
	console.log('MIDI Relay server started on: ' + listenPort);
}

function initialMIDISetup() {
	console.log('Beginning MIDI Setup.');
	try {
		GetPorts();
	}
	catch (error) {
		console.log(error);
	}
}

function GetPorts() {
	navigator.requestMIDIAccess().then(function(webmidi) {
		webmidi.outputs.forEach(function(port) { console.log('MIDI Out:', port.name); });
		webmidi.inputs.forEach(function(port) { console.log('MIDI In:', port.name); });
		let info = navigator.info();
		MIDI_outputs = info.outputs;
		MIDI_inputs = info.inputs;
		console.log('Available MIDI outputs:', MIDI_outputs);
		navigator.close(); // Required in Node.js. This will close MIDI inputs, otherwise Node.js will wait for MIDI input forever.
	}, function(err) {
		if (err) {
			console.log(err);
			throw new Error(err);
		}
	});
}

function RefreshPorts() {
	try {
		navigator().refresh();
		GetPorts();
		return {result: 'ports-refreshed-successfully'};
	}
	catch(error) {
		return {error: error};		
	}
}

function SendMIDI_NoteOn(midiPort, note, channel, velocity) {
	try {
		let port = navigator().openMidiOut(midiPort);
		port.noteOn(channel, note, velocity);
		port.close();
	
		return {result: 'note-on-sent-successfully', note: note, channel: channel, velocity: velocity};
	}
	catch(error) {
		return {error: error};
	}
}

function SendMIDI_MCC(midiPort, param, channel, setvalue) {
	try {
		let port = navigator().openMidiOut(midiport);
		port.control(channel, param, setvalue);
		port.close();

		return {result: 'mcc-sent-successfully', param: param, channel: channel, setvalue: setvalue};
	}
	catch(error) {
		return {error: error};
	}
}

function SendMIDI_NoteOff(midiPort, note, channel, velocity) {
	try {
		let port = navigator().openMidiOut(midiPort);
		if (channel === null) {
			channel = 0;
		}
		if (note === null) {
			note = 21;
		}
		if (velocity === null) {
			velocity = 1;
		}
		
		port.noteOff(channel, note, velocity);
		port.close();
	
		return {result: 'note-off-sent-successfully', note: note, channel: channel, velocity: velocity};
	}
	catch(error) {
		return {error: error};
	}
}

function SendMIDI_MSC(midiPort, deviceId, commandFormat, command, cue, cueList, cuePath) {
	try {
		console.log('Sending MSC command.');
		//check if cue, cueList, or cuePath are included (they are optional)
		let midiObj = {};

		midiObj.deviceId = deviceId;
		midiObj.commandFormat = commandFormat;
		midiObj.command = command;
		if (cue !== '') {
			midiObj.cue = cue;
		}
		if (cueList !== '') {
			midiObj.cueList = cueList;
		}
		if (cuePath !== '') {
			midiObj.cuePath = cuePath;
		}
		
		console.log(midiObj);
		
		let message = BuildMSC(deviceId, commandFormat, command, cue, cueList, cuePath);
				
		let port = navigator().openMidiOut(midiPort);

		port.send(message);

		port.close();

		return {result: 'msc-sent-successfully', deviceid: deviceId, commandformat: commandFormat, command: command, cue: cue, cuelist: cueList, cuepath: cuePath, message: message};
	}
	catch (error) {
		console.log(error);
		return {error: error};
	}
}

function BuildMSC(deviceId, commandFormat, command, cue, cueList, cuePath) {
	let deviceId_hex = null;
	let commandFormat_hex = null;
	let command_hex = null;
	let cue_hex = null;
	let cueList_hex = null;
	let cuePath_hex = null;
	
	if (parseInt(deviceId) !== 'NaN') {
		deviceId_hex = parseIntegerDeviceId(parseInt(deviceId));
	}
	else {
		deviceId_hex = parseStringDeviceId(deviceId);
	}
		
	switch(commandFormat) {
		case 'lighting.general':
			commandFormat_hex = 0x01;
			break;
		case 'sound.general':
			commandFormat_hex = 0x10;
			break;
		case 'machinery.general':
			commandFormat_hex = 0x20;
			break;
		case 'video.general':
			commandFormat_hex = 0x30;
			break;
		case 'projection.general':
			commandFormat_hex = 0x40;
			break;
		case 'processcontrol.general':
			commandFormat_hex = 0x50;
			break;
		case 'pyro.general':
			commandFormat_hex = 0x60;
			break;
		default:
			commandFormat_hex = 0x7F;
			break;
	}
	
	switch(command) {
		case 'go':
			command_hex = 0x01;
			break;
		case 'stop':
			command_hex = 0x02;
			break;
		case 'gojam':
			command_hex = 0x10;
			break;
		case 'resume':
			command_hex = 0x03;
			break;
		case 'timedgo':
			command_hex = 0x04;
			break;
		case 'load':
			command_hex = 0x05;
			break;
		case 'set':
			command_hex = 0x06;
			break;
		case 'fire':
			command_hex = 0x07;
			break;
		case 'alloff':
			command_hex = 0x08;
			break;
		case 'restore':
			command_hex = 0x09;
			break;
		case 'reset':
			command_hex = 0x0A;
			break;
		case 'gooff':
			command_hex = 0x0B;
			break;
		case 'opencuelist':
			command_hex = 0x01B;
			break;
		case 'closecuelist':
			command_hex = 0x01C;
			break;
		case 'startclock':
			command_hex = 0x015;
			break;
		case 'stopclock':
			command_hex = 0x016;
			break;
		default:
			command_hex = 0x01;
			break;
	}
	   
    if ((cue !== '') && (cue !== undefined)) {
		cue_hex = stringToByteArray(cue);
	}
	
	if ((cueList !== '') && (cueList !== undefined)) {
		cueList_hex = stringToByteArray(cueList);
	}
	
	if ((cuePath !== '') && (cuePath !== undefined)) {
		cuePath_hex = stringToByteArray(cuePath);
	}
	
	var message = [ 0xF0, 0x7F, deviceId_hex, 0x02, commandFormat_hex, command_hex];
	
	if (cue_hex !== null) {
		message.push(cue_hex);
	}
	
	if (cueList_hex !== null) {
		message.push(0x00);
		message.push(cueList_hex);
	}
	
	if (cuePath_hex !== null) {
		message.push(0x00);
		message.push(cuePath_hex);
	}
	
	message.push(0xF7);
	
	return _.flatten(message);
}

function stringToByteArray(str) {
    if (str.toString) {
        str = str.toString();
    }
    
    var ret = [];
    for (var i=0; i<str.length; i++) {
        var char = parseInt(str.charCodeAt(i));
        ret.push(char);
    }
    return ret;
}

function parseStringDeviceId(deviceId) {
    deviceId = deviceId.toLowerCase();
    if (deviceId === 'all') {
        return 0x7F;
    }
    
    var match = deviceId.match(/^G(\d{1,2})$/i)
    if (match) {
        var g = parseInt(match[1]);
        if (g < 1 || g > 15) {
            throw new Error('Group numbers must be within 1 and 15.');
        }
        return 0x6F + g;
    }

    throw new Error('Invalid deviceId.');
}

function parseIntegerDeviceId(deviceId) {
    if (deviceId >= 0x00 &&  deviceId <= 0x6F) {
        return _.parseInt(deviceId);
    }
    
    throw new Error('Integer deviceIds must be between 0 (0x00) and 111 (0x6F)');
}

setUpApp();