/* MIDI Relay */

//Express API variables
const http = require('http');
const https = require('https');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
var restServer = null;
const listenPort = 4000;

//MIDI library variables
var navigator = require('jzz');

//filesystem variables
const fs = require('fs');
const midi_trigger_file = './midi_triggers.json'; //local storage JSON file

//other variables
var clc = require('cli-color'); //console output text coloring
var _ = require('lodash');
const {version} = require('./package.json');
const exec = require('child_process').exec;
const figlet = require('figlet');
const cors = require('cors');
const path = require('path');

const mdns = require('mdns-js');
var mdns_service = null; //mdns advertisement service variable
var mdns_browser = null; //mdns browser variable
var mdns_hosts = []; //global array of found hosts

//global variables
const IncomingMIDIRelayTypes = ['noteon', 'noteoff', 'aftertouch', 'cc', 'pc', 'pressure', 'pitchbend', 'msc', 'sysex'];
const IncomingMIDIMessageTypes = ['noteon', 'noteoff', 'aftertouch', 'cc', 'pc', 'pressure', 'pitchbend', 'sysex'];
const ActionTypes = ['http', 'applescript', 'shellscript'];
var MIDI_inputs = [];
var MIDI_outputs = [];
var Triggers = []; //global array of MIDI Triggers
var MIDIRelaysLog = []; //global array of MIDI messages and the datetime they were sent

function setUpApp() {
	console.log(figlet.textSync('midi-relay'));
	console.log(clc.magenta.bold('Version: ') + version);
	initialRESTSetup();
	initialMDNSSetup();
	initialMIDISetup();
}

function initialRESTSetup() {
 	// starts the Express server that will listen for incoming requests to send/receive MIDI commands and objects
 	restServer = express();
	restServer.use(cors());
 	restServer.use(bodyParser.json({ type: 'application/json' }));


	//about the author, this program, etc.
	restServer.get('/', function (req, res) {
		res.sendFile('views/index.html', { root: __dirname });
	});
	
	//settings page - view ports, create triggers, etc.
	restServer.get('/settings', function (req, res) {
		res.sendFile('views/settings.html', { root: __dirname });
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
	
	restServer.get('/version', function (req, res) {
		//gets the version of the software
		res.send(version);
	});

	restServer.post('/sendmidi', function (req, res) {
		//sends MIDI using the provided JSON object in the POST body
		let midiObj = req.body;
		
		function sendResult(json) {
			res.send(json);
		}
		
		SendMIDI(midiObj, sendResult);
	});
	
	restServer.get('/sendmidi', function (req, res) {
		//sends MIDI using the provided information in the querystring
		let midiObj = req.query;
		
		function sendResult(json) {
			res.send(json);
		}
		
		SendMIDI(midiObj, sendResult);
	});
	
	restServer.post('/openport', function (req, res) {
		//opens the MIDI port to listen to using the provided JSON object in the POST body
		
		let midiObj = req.body;

		if (midiObj.midiport) {			
			console.log(clc.cyan.bold('Attempting to open MIDI port: ' + midiObj.midiport));
			for (let i = 0; i < MIDI_inputs.length; i++) {
				if (MIDI_inputs[i].name === midiObj.midiport) {
					if (!MIDI_inputs[i].opened) {
						navigator().openMidiIn(midiObj.midiport)
						.or(function () {
							console.log(clc.red.bold('Cannot open port.'));
							res.send({result: 'midiin-port-cannot-be-opened'});
						})
						.and(function() {
							for (let i = 0; i < MIDI_inputs.length; i++) {
								if (MIDI_inputs[i].name === this.name()) {
									MIDI_inputs[i].opened = true;
									break;
								}
							}
							console.log(clc.green.bold('Port opened successfully: ' + midiObj.midiport));
							this.connect(receiveMIDI.bind({'midiport': midiObj.midiport}));
							res.send({result: 'midiin-port-opened', name: midiObj.midiport});
						});
					}
					else {
						res.send({result: 'midiin-port-already-opened', name: midiObj.midiport});
					}
				}
			}
		}
	});

	restServer.post('/closeport', function (req, res) {
		//closes the MIDI port to listen to using the provided JSON object in the POST body
		
		let midiObj = req.body;
		res.send(ClosePort(midiObj));
	});
	
	restServer.get('/triggers', function (req, res) {
		//gets all triggers
		
		res.send(Triggers);		
	});
	
	restServer.post('/addtrigger', function (req, res) {
		//adds the trigger object to the list of triggers
		let triggerObj = req.body;
		
		let result = AddTrigger(triggerObj);
		res.send({result: result});
	});

	restServer.post('/edittrigger', function (req, res) {
		//adds the trigger object to the list of triggers
		let triggerObj = req.body;
		
		let result = EditTrigger(triggerObj);
		res.send({result: result});
	});
	
	restServer.get('/deletetrigger/:triggerid', function (req, res) {
		//deletes the trigger
		let triggerID = req.params.triggerid;
		
		let result = DeleteTrigger(triggerID);
		res.send({result: result});
	});
	
	restServer.get('/hosts', function (req, res) {
		//returns list of other midi-relay servers on the network
		res.send(mdns_hosts);
	});

	//serve up any files in the static folder like images, CSS, client-side JS, etc.
	restServer.use(express.static(path.join(__dirname, 'views/static')));

	//serve up jQuery from the Node module
	restServer.use('/js/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

	restServer.use(function (req, res) {
		res.status(404).send({error: true, url: req.originalUrl + ' not found.'});
	});
	
	restServer.listen(listenPort);
	console.log(clc.blue.bold('MIDI Relay server started on: ' + listenPort));
}

function initialMDNSSetup() {
	mdns_service = mdns.createAdvertisement(mdns.tcp('midi-relay'), listenPort, {
		name:'midi-relay',
		txt:{
			txtvers:version
		}
	});
	
	mdns_service.start();
	
	mdns_browser = mdns.createBrowser(mdns.tcp('midi-relay'));

	mdns_browser.on('ready', function onReady() {
		mdns_browser.discover();
	});

	mdns_browser.on('update', function onUpdate(data) {
		for (let i = 0; i < data.type.length; i++) {
			if (data.type[i].name === 'midi-relay') {
				MDNS_AddHost(data.host, data.addresses[0], data.port);
			}	
		}
	});
}

function MDNS_AddHost(host, address, port) {
	// first check to see if it's already in the list, and don't add it if so
	let isFound = false;

	for (let i = 0; i < mdns_hosts.length; i++) {
		if (mdns_hosts[i].address === address) {
			isFound = true;
			mdns_hosts[i].port = port;
			break;
		}
	}

	if (!isFound) {
		let mdnsObj = {};
		mdnsObj.name = host;
		mdnsObj.address = address;
		mdnsObj.port = port;
		mdns_hosts.push(mdnsObj);
	}
}

function initialMIDISetup() {
	console.log(clc.blue.bold('Beginning MIDI Setup.'));
	try {
		GetPorts();
	}
	catch (error) {
		console.log(error);
	}
}

function loadMIDITriggers() {
	try {
		console.log(clc.bold('Loading stored Triggers from file...'));
		let rawdata = fs.readFileSync(midi_trigger_file);
		let myJson = JSON.parse(rawdata); 

		if (myJson.Triggers) {
			Triggers = myJson.Triggers;
			console.log(clc.bold('Triggers loaded.'));
		}
		else {
			Triggers = [];
			console.log(clc.red.bold('No stored triggers found.'));
		}	
	}
	catch (error) {
		console.log(clc.red.bold('Triggers could not be loaded due to an error:'));
		if (error.code === 'ENOENT') {
			console.log('The trigger file could not be found.');
		}
		else {
			console.log(error);
		}
	}
	
	for (let i = 0; i < Triggers.length; i++) {
		let port = MIDI_inputs.find( ({ name }) => name === Triggers[i].midiport);

		if (port) {
			if (port.opened) {
				console.log(clc.cyan.bold('Trigger port already opened: ') + Triggers[i].midiport);
			}
			else {
				console.log(clc.cyan.bold('Attempting to open MIDI port used in a Trigger: ' + Triggers[i].midiport));

				navigator().openMidiIn(Triggers[i].midiport)
				.or(function () {
					console.log(clc.red.bold('Cannot open port.'));
				})
				.and(function() {
					for (let j = 0; j < MIDI_inputs.length; j++) {
						if (MIDI_inputs[j].name === this.name()) {
							MIDI_inputs[j].opened = true;
							break;
						}
					}
					console.log(clc.green.bold('Port opened successfully: ' + Triggers[i].midiport));
					this.connect(receiveMIDI.bind({'midiport': Triggers[i].midiport}));
				});
				break;
			}
		}
		else {
			console.log(clc.red.bold('MIDI Port used in Trigger not found: ') + Triggers[i].midiport);
		}
	}
}

function saveMIDITriggers() {
	try {
		console.log(clc.bold('Saving MIDI Triggers to file...'));
		var myJson = {
			Triggers: Triggers 
		};

		fs.writeFileSync(midi_trigger_file, JSON.stringify(myJson, null, 1), 'utf8', function(error) {
			if (error)
			{ 
				console.log(clc.red.bold('Error saving MIDI triggers to file: ' + error));
			}
			else
			{
				console.log(clc.green.bold('MIDI Triggers saved to file.'));
			}
		});	
	}
	catch (error) {
		console.log(clc.red.bold('Error saving MIDI triggers to file: ' + error));
	}
}

function GetPorts() {
	navigator.requestMIDIAccess().then(function(webmidi) {
		console.log(clc.magentaBright.bold('MIDI Output Ports'));
		webmidi.outputs.forEach(function(port) { console.log(clc.magenta(port.name)); });
		console.log(clc.cyanBright.bold('MIDI Input Ports'));
		webmidi.inputs.forEach(function(port) { console.log(clc.cyan(port.name)); });
		let info = navigator.info();
		
		MIDI_outputs = info.outputs;
		
		//retain the 'opened' property when reloading the array
		let temp_inputs = info.inputs;
		for (let i = 0; i < temp_inputs.length; i++) {
			let port = MIDI_inputs.find( ({ name }) => name === temp_inputs[i].name);
			if (port) {
				if (port.opened) {
					temp_inputs[i].opened = port.opened;
				}
			}
		}
		
		MIDI_inputs = temp_inputs;
		
		loadMIDITriggers();
		
	}, function(err) {
		if (err) {
			console.log(clc.red.bold(err));
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
		return {result: 'error', error: error};		
	}
}

function ClosePort(midiObj) {
	let found = false;
	
	if (midiObj.midiport) {
		let portName = midiObj.midiport;
		console.log(clc.cyan.bold('Attempting to close MIDI port: ' + portName));

		for (let i = 0; i < MIDI_inputs.length; i++) {
			if (MIDI_inputs[i].name === portName) {
				MIDI_inputs[i].opened = false;
				found = true;
				break;
			}
		}

		if (found) {
			console.log(clc.green.bold('Port closed successfully: ' + portName));
			return {result: 'midiin-port-closed', name: portName};
		}
		else {
			console.log(clc.red.bold('Cannot close port.'));
			return {result: 'midiin-port-cannot-be-closed'};
		}
	}
}

function SendMIDI(midiObj, callback) {		
	if (midiObj.midiport) {
		let index = null;

		MIDI_outputs.find((o, i) => {
			if (o.name === midiObj.midiport) {
				index = i;
			}
		});

		if (index === null) {
			callback({result: 'invalid-midi-port'});
		}
		else {
			if (midiObj.midicommand) {
				if (IncomingMIDIRelayTypes.includes(midiObj.midicommand)) {
					switch(midiObj.midicommand)
					{
						case 'noteon':
							SendMIDI_Note('on', midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.note), parseInt(midiObj.velocity), callback);
							break;
						case 'noteoff':
							SendMIDI_Note('off', midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.note), parseInt(midiObj.velocity), callback);
							break;
						case 'aftertouch':
							SendMIDI_Aftertouch(midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.note), parseInt(midiObj.value), callback);
							break;
						case 'cc':
							SendMIDI_CC(midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.controller), parseInt(midiObj.value), callback);
							break;
						case 'pc':
							SendMIDI_PC(midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.value), callback);
							break;
						case 'pressure':
							SendMIDI_Pressure(midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.value), callback);
							break;
						case 'pitchbend':
							SendMIDI_PitchBend(midiObj.midiport, parseInt(midiObj.channel), parseInt(midiObj.value), callback);
							break;
						case 'msc':
							SendMIDI_MSC(midiObj.midiport, midiObj.deviceid, midiObj.commandformat, midiObj.command, midiObj.cue, midiObj.cuelist, midiObj.cuepath, callback);
							break;
						case 'sysex':
							SendMIDI_SysEx(midiObj.midiport, midiObj.message, callback);
							break;
						default:
							callback({result: 'invalid-midi-command'});
							break;
					}	
				}
				else {
					callback({result: 'invalid-midi-command'});
				}
			}
			else {
				callback({result: 'invalid-midi-command'});
			}		
		}
	}
	else {
		callback({result: 'invalid-midi-port'});
	}
}

function SendMIDI_Note(messageType, midiPort, channel, note, velocity, callback) {
	try {
		switch(messageType) {
			case 'on':
				console.log(clc.magenta.bold('Sending Note On to Port: ') + midiPort);
				break;
			case 'off':
				console.log(clc.magenta.bold('Sending Note Off to Port: ') + midiPort);
				break;
			default:
				break;
		}
		
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
			channel = 0;
			}
			if (!Number.isInteger(note)) {
				note = 21;
			}
			if (!Number.isInteger(velocity)) {
				if (messageType === 'on') {
					velocity = 127;
				}
				else {
					velocity = 0;
				}
			}

			let midiObj = {channel: channel, note: note, velocity: velocity};
			console.log(midiObj);
			
			let msg = null;
			
			let returnObj;
			
			let rawmessage = '';
			
			switch(messageType) {
				case 'on':
					msg = navigator.MIDI.noteOn(channel, note, velocity);
					this.send(msg).close();
					console.log(clc.magenta.bold('Note On Sent.'));
					for (let i = 0; i < msg.length; i++) {
						rawmessage += msg[i];
						if (i < (msg.length-1)) {
							rawmessage += ',';
						}
					}
					AddToLog(midiPort, 'noteon', rawmessage);
					returnObj = {result: 'noteon-sent-successfully', midiport: midiPort, note: note, channel: channel, velocity: velocity, message: rawmessage};
					break;
				case 'off':
					msg = navigator.MIDI.noteOff(channel, note, velocity);
					this.send(msg).close();
					console.log(clc.magenta.bold('Note Off Sent.'));
					for (let i = 0; i < msg.length; i++) {
						rawmessage += msg[i];
						if (i < (msg.length-1)) {
							rawmessage += ',';
						}
					}
					AddToLog(midiPort, 'noteoff', rawmessage);
					returnObj = {result: 'noteoff-sent-successfully', midiport: midiPort, note: note, channel: channel, velocity: velocity, message: rawmessage};
					break;
				default:
					break;
			}
			
			callback(returnObj);
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_Aftertouch(midiPort, channel, note, value, callback) {
	try {
		console.log(clc.magenta.bold('Sending Polyphonic AfterTouch to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
				channel = 0;
			}
			if (!Number.isInteger(note)) {
				note = 21;
			}
			if (!Number.isInteger(value)) {
				value = 1;
			}

			let midiObj = {channel: channel, note: note, value: value};
			console.log(midiObj);
			
			let msg = navigator.MIDI.aftertouch(channel, note, value);
			this.send(msg).close();

			console.log(clc.magenta.bold('Polyphonic Aftertouch Sent.'));
			let rawmessage = '';
			for (let i = 0; i < msg.length; i++) {
				rawmessage += msg[i];
				if (i < (msg.length-1)) {
					rawmessage += ',';
				}
			}
			AddToLog(midiPort, 'aftertouch', rawmessage);
			callback({result: 'aftertouch-sent-successfully', midiport: midiPort, channel: channel, note: note, value: value, message: rawmessage});
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_CC(midiPort, channel, controller, value, callback) {
		try {
		console.log(clc.magenta.bold('Sending Control Change to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
				channel = 0;
			}
			if (!Number.isInteger(controller)) {
				controller = 0;
			}
			if (!Number.isInteger(value)) {
				value = 1;
			}

			let midiObj = {channel: channel, controller: controller, value: value};
			console.log(midiObj);
			
			let msg = navigator.MIDI.control(channel, controller, value);
			this.send(msg).close();

			console.log(clc.magenta.bold('Control Change Sent.'));
			let rawmessage = '';
			for (let i = 0; i < msg.length; i++) {
				rawmessage += msg[i];
				if (i < (msg.length-1)) {
					rawmessage += ',';
				}
			}
			AddToLog(midiPort, 'cc', rawmessage);
			callback({result: 'cc-sent-successfully', midiport: midiPort, channel: channel, controller: controller, value: value, message: rawmessage});
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_PC(midiPort, channel, value, callback) {
	try {
		console.log(clc.magenta.bold('Sending Program Change to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
				channel = 0;
			}
			if (!Number.isInteger(value)) {
				value = 1;
			}

			let midiObj = {channel: channel, value: value};
			console.log(midiObj);

			let msg = navigator.MIDI.program(channel, value);
			this.send(msg).close();

			console.log(clc.magenta.bold('Program Change Sent.'));
			let rawmessage = '';
			for (let i = 0; i < msg.length; i++) {
				rawmessage += msg[i];
				if (i < (msg.length-1)) {
					rawmessage += ',';
				}
			}
			AddToLog(midiPort, 'pc', rawmessage);
			callback({result: 'pc-sent-successfully', midiport: midiPort, channel: channel, value: value, message: rawmessage});
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_Pressure(midiPort, channel, value, callback) {
	try {
		console.log(clc.magenta.bold('Sending Channel Pressure / Aftertouch to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
				channel = 0;
			}
			if (!Number.isInteger(value)) {
				value = 1;
			}

			let midiObj = {channel: channel, value: value};
			console.log(midiObj);
			
			let msg = navigator.MIDI.pressure(channel, value);
			this.send(msg).close();

			console.log(clc.magenta.bold('Channel Pressure / Aftertouch Sent.'));
			let rawmessage = '';
			for (let i = 0; i < msg.length; i++) {
				rawmessage += msg[i];
				if (i < (msg.length-1)) {
					rawmessage += ',';
				}
			}
			AddToLog(midiPort, 'pressure', rawmessage);
			callback({result: 'pressure-sent-successfully', midiport: midiPort, channel: channel, value: value, message: rawmessage});
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_PitchBend(midiPort, channel, value, callback) {
		try {
		console.log(clc.magenta.bold('Sending Pitch Bend to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			if (!Number.isInteger(channel)) {
				channel = 0;
			}
			if (!Number.isInteger(value)) {
				value = 1;
			}

			let midiObj = {channel: channel, value: value};
			console.log(midiObj);
			
			let msg = navigator.MIDI.pitchBend(channel, value);
			this.send(msg).close();

			console.log(clc.magenta.bold('Pitch Bend Sent.'));
			let rawmessage = '';
			for (let i = 0; i < msg.length; i++) {
				rawmessage += msg[i];
				if (i < (msg.length-1)) {
					rawmessage += ',';
				}
			}
			AddToLog(midiPort, 'pitchbend', rawmessage);
			callback({result: 'pitchbend-sent-successfully', midiport, midiPort, channel: channel, value: value, message: rawmessage});
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function SendMIDI_MSC(midiPort, deviceId, commandFormat, command, cue, cueList, cuePath, callback) {
	try {
		console.log(clc.magenta.bold('Sending MSC to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
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
			this.send(message).close();
			
			console.log(clc.magenta.bold('MSC Sent.'));
			let rawmessage = '';
			for (let i = 0; i < message.length; i++) {
				rawmessage += message[i];
				if (i < (message.length-1)) {
					rawmessage += ',';
				}
			}
				AddToLog(midiPort, 'sysex', rawmessage);
			callback({result: 'msc-sent-successfully', midiport: midiPort, deviceid: deviceId, commandformat: commandFormat, command: command, cue: cue, cuelist: cueList, cuepath: cuePath, message: message});
		});
	}
	catch(error) {
		return {result: 'error', error: error};
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
	if (deviceId >= 0x00 && deviceId <= 0x6F) {
		return _.parseInt(deviceId);
	}
	
	throw new Error('Integer deviceIds must be between 0 (0x00) and 111 (0x6F)');
}

function SendMIDI_SysEx(midiPort, message, callback) {
	try {
		console.log(clc.magenta.bold('Sending SysEx MIDI Message to Port: ') + midiPort);
		
		let port = navigator().openMidiOut(midiPort)
		.or(function() {
			callback({result: 'could-not-open-midi-out'});
		})
		.and(function() {
			let messageArray = message.replace(' ', ',').split(',');
			let statusByte = messageArray[0];
			if (statusByte.toLowerCase().indexOf('0x') === -1) { //if the status byte was not provided in hexadecimal notation
				//convert it to hexadecimal for comparison
				statusByte = parseInt(statusByte, 10).toString(16);
			}
			else {
				statusByte = statusByte.substring(2,4).toLowerCase();
			}
			if (statusByte.toLowerCase() !== 'f0') {
				//not a SysEx message
				console.log(clc.red.bold('Not a valid SysEx message.'));
				console.log(messageArray);
				callback({result: 'sysex-invalid', message: messageArray});
			}
			else {
				let midiObj = {message: messageArray};
				console.log(midiObj);
				
				this.send(messageArray).close();

				console.log(clc.magenta.bold('SysEx Sent.'));
				let rawmessage = '';
				for (let i = 0; i < messageArray.length; i++) {
					rawmessage += messageArray[i];
					if (i < (messageArray.length-1)) {
						rawmessage += ',';
					}
				}
				AddToLog(midiPort, 'sysex', rawmessage);
				callback({result: 'sysex-sent-successfully', midiport: midiPort, message: rawmessage});
			}
		});
	}
	catch(error) {
		callback({result: 'error', error: error});
	}
}

function AddToLog(midiPort, midiCommand, message) {
	let relayObj = {};
	relayObj.midiport = midiPort;
	relayObj.midicommand = midiCommand;
	relayObj.message = message;
	relayObj.datetime = Date.now();
	MIDIRelaysLog.push(relayObj);
}

function CheckLog(midiPort, midiCommand, message, time) {
	let passed = true;
	
	for (let i = 0; i < MIDIRelaysLog.length; i++) {
		if (MIDIRelaysLog[i].midiport === midiPort) {
			if (MIDIRelaysLog[i].midicommand === midiCommand) {
				if (MIDIRelaysLog[i].message === message) {
					//check to see when it arrived, it could be a bounceback
					if (time - MIDIRelaysLog[i].datetime < 15) {
						//bounceback, send false
						passed = false;
					}
				}
			}
		}
	}
	
	CleanUpLog();
	
	return passed;
}

function CleanUpLog() {
	//loops through the array and removes anything older than 60000ms (1 minute)
	let time = Date.now();
	
	for (let i = 0; i < MIDIRelaysLog.length; i++) {
		if (time - MIDIRelaysLog.datetime > 60000) {
			MIDIRelaysLog.splice(i, 1);
			i--;
		}
	}
}

function receiveMIDI(midiArg) {
	let midiObj = {};
	
	let statusBytes = [
		{byte: '8', type: 'noteoff'},
		{byte: '9', type: 'noteon'},
		{byte: 'A', type: 'aftertouch'},
		{byte: 'B', type: 'cc'},
		{byte: 'C', type: 'pc'},
		{byte: 'D', type: 'pressure'},
		{byte: 'E', type: 'pitchbend'},
		{byte: 'F', type: 'sysex'}
	]
	
	let midiType = midiArg[0].toString(16).substring(0,1).toUpperCase();
	let statusByte = statusBytes.find( ({ byte }) => byte === midiType);
	if (statusByte) {
		let midiCommand = statusByte.type;
		midiObj.midicommand = midiCommand;
	}
	
	midiObj.midiport = this.midiport;
	
	switch(midiObj.midicommand) {
		case 'noteon':
			midiObj.channel = midiArg.getChannel();
			midiObj.note = midiArg.getNote();
			midiObj.velocity = midiArg.getVelocity();
			break;
		case 'noteoff':
			midiObj.channel = midiArg.getChannel();
			midiObj.note = midiArg.getNote();
			midiObj.velocity = midiArg.getVelocity();
			break;
		case 'aftertouch':
			midiObj.channel = midiArg.getChannel();
			midiObj.note = midiArg.getNote();
			midiObj.value = parseInt(midiArg[2]);
			break;
		case 'cc':
			midiObj.channel = midiArg.getChannel();
			midiObj.controller = parseInt(midiArg[1]);
			midiObj.value = parseInt(midiArg[2]);
			break;
		case 'pc':
			midiObj.channel = midiArg.getChannel();
			midiObj.value = parseInt(midiArg[1]);
			break;
		case 'pressure':
			midiObj.channel = midiArg.getChannel();
			midiObj.value = parseInt(midiArg[1]);
			break;
		case 'pitchbend':
			midiObj.channel = midiArg.getChannel();
			let lsb = parseInt(midiArg[1]) << 0;
			let msb = parseInt(midiArg[2]) << 7;
			midiObj.value = lsb+msb;
			break;
		case 'sysex':
			midiObj.message = '';
			for (let i = 0; i < midiArg.length; i++) {
				midiObj.message += midiArg[i];
				if (i < (midiArg.length-1)) {
					midiObj.message += ',';
				}
			}			
			break;
		default:
			midiObj.midicommand = 'unsupported';
			break;
	}
	
	midiObj.rawmessage = '';
	for (let i = 0; i < midiArg.length; i++) {
		midiObj.rawmessage += midiArg[i];
		if (i < (midiArg.length-1)) {
			midiObj.rawmessage += ',';
		}
	}
	
	if (IncomingMIDIMessageTypes.includes(midiObj.midicommand)) {
		processMIDI(midiObj);
	}
	else {
		console.log(clc.red.bold('The incoming MIDI message type is not implemented at this time.'));
		console.log(midiArg.toString());
	}
}

function processMIDI(midiObj) {	
	let port = MIDI_inputs.find( ({ name }) => name === midiObj.midiport);
	
	if (port.opened) {
		let passed = true;
		
		passed = CheckLog(midiObj.midiport, midiObj.midicommand, midiObj.rawmessage, Date.now());
		
		if (passed) {
			console.log(clc.cyan.bold('Processing MIDI Triggers for: ') + midiObj.midiport + ' ' + clc.magenta(midiObj.midicommand));
			console.log(midiObj);
			for (let i = 0; i < Triggers.length; i++) {
				if ((Triggers[i].midiport === midiObj.midiport) && (Triggers[i].midicommand === midiObj.midicommand)) {
					switch(Triggers[i].midicommand) {
						case 'noteon':
						case 'noteoff':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if (parseInt(Triggers[i].note) === parseInt(midiObj.note)) {
									if ((parseInt(Triggers[i].velocity) === parseInt(midiObj.velocity)) || (Triggers[i].velocity === '*')) {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i]);
									}
								}
							}
							break;
						case 'aftertouch':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if (parseInt(Triggers[i].note) === parseInt(midiObj.note)) {
									if ((parseInt(Triggers[i].value) === parseInt(midiObj.value)) || (Triggers[i].value === '*')) {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i]);
									}
								}
							}
							break;
						case 'cc':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if (parseInt(Triggers[i].controller) === parseInt(midiObj.controller)) {
									if ((parseInt(Triggers[i].value) === parseInt(midiObj.value)) || (Triggers[i].value === '*')) {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i]);
									}
								}
							}
							break;
						case 'pc':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if ((parseInt(Triggers[i].value) === parseInt(midiObj.value)) || (Triggers[i].value === '*')) {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i]);
								}
							}
							break;
						case 'pressure':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if ((parseInt(Triggers[i].value) === parseInt(midiObj.value)) || (Triggers[i].value === '*')) {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i]);
								}
							}
							break;
						case 'pitchbend':
							if ((parseInt(Triggers[i].channel) === parseInt(midiObj.channel)) || (Triggers[i].channel === '*')) {
								if ((parseInt(Triggers[i].value) === parseInt(midiObj.value)) || (Triggers[i].value === '*')) {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i]);	
								}
							}
							break;
						case 'sysex':
							if (Triggers[i].message === midiObj.message) {
								setTimeout(runMIDITrigger, 1, Triggers[i]);
							}
							break;
						default:
							break;
					}
				}
			}
		}
	}
	else {
		console.log('This MIDI port is currently closed: ' + midiObj.midiport);
	}
}

function runMIDITrigger(midiTriggerObj) {
	console.log(clc.cyan.bold('Running MIDI Trigger: ' + midiTriggerObj.id));
	
	switch(midiTriggerObj.actiontype) {
		case 'http':
			console.log(clc.cyan('Type: HTTP'));
			runMIDITrigger_HTTP(midiTriggerObj);
			break;
		case 'applescript':
			console.log(clc.cyan('Type: AppleScript'));
			runMIDITrigger_AppleScript(midiTriggerObj.applescript);
			break;
		case 'shellscript':
			console.log(clc.cyan('Type: Shell Script'));
			runMIDITrigger_ShellScript(midiTriggerObj.shellscript);
			break;
		default:
			console.log(clc.red.bold('This action type is not currently supported: ') + midiTriggerObj.actiontype);
			break;
	}
}

function runMIDITrigger_HTTP(midiTriggerObj) {
	console.log(clc.cyan('URL: ') + midiTriggerObj.url);
	if (midiTriggerObj.jsondata) {
		//if JSON data is present, send as HTTP POST with the data, otherwise send it as GET
		try {
			console.log(clc.cyan('JSON Data: '));
			console.log(midiTriggerObj.jsondata);
			
			request.post(
				midiTriggerObj.url,
				{ json: JSON.parse(midiTriggerObj.jsondata), strictSSL: false },
				function (error, response, body) {
					if (!error && response.statusCode == 200) {
						console.log(body);
						console.log(clc.cyan.bold('HTTP Command Sent.'));
					}
					else {
						console.log(clc.red.bold('Error sending HTTP Post:'));
						console.log(error);
						console.log(response);
						console.log(body);
					}
				}
			);
		}
		catch (error) {
			console.log(clc.red.bold('Invalid JSON Data: ') + error);
		}
	}
	else {
		http.get(midiTriggerObj.url, (resp) => {
			let data = '';

			resp.on('data', (chunk) => {
				data += chunk;
			});

			resp.on('end', () => {
				console.log(data);
			});

		}).on('error', (err) => {
			console.log('Error: ' + err.message);
		});
	}
}

function runMIDITrigger_AppleScript(applescript) {
	//run the specified AppleScript
	
	if (process.platform === 'darwin') {
		var osascript = require('node-osascript');

		console.log(clc.cyan.bold('Executing AppleScript:'));
		console.log(applescript);

		osascript.execute(applescript, function(err, result, raw) {
			if (err) {
				console.log(clc.red(err));
			}
			console.log('AppleScript result: ' + result);
			console.log('AppleScript raw: ' + raw);
		});
	}
	else {
		console.log(clc.red.bold('Unable to execute specified AppleScript: Process is not running on MacOS platform.'));
	}
}

function runMIDITrigger_ShellScript(shellscript) {
	exec(shellscript, (err, stdout, stderr) => {
		if (err) {
			//some err occurred
			console.error(err);
		}
		else {
			// the *entire* stdout and stderr (buffered)
			console.log(`stdout: ${stdout}`);
			console.log(`stderr: ${stderr}`);
		}
	});
}

function uuidv4() { //unique UUID generator for IDs
	return 'xxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function isHex(h) {
	let a = parseInt(h,16);
	return (a.toString(16) === h.toLowerCase());
}

function AddTrigger(triggerObj) {
	//add the Trigger to the array
	triggerObj.id = 'trigger-' + uuidv4();
	
	let passed = true;
	
	let index = null;
	
	if (triggerObj.midiport) {
		MIDI_inputs.find((o, i) => {
			if (o.name === triggerObj.midiport) {
				index = i;
			}
		});

		if (index === null) {
			passed = false;
			return 'invalid-midi-port';
		}
	}
	else {
		return 'invalid-midi-port';
	}
	
	if (triggerObj.midicommand) {
		if (!IncomingMIDIMessageTypes.includes(triggerObj.midicommand.toLowerCase())) {
			return 'invalid-midi-command';
		}
		else {
			switch(triggerObj.midicommand) {
				case 'noteon':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.velocity)) {
						if (triggerObj.velocity !== '*') {
							triggerObj.velocity = 1;
						}
					}
					break;
				case 'noteoff':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.velocity)) {
						if (triggerObj.velocity !== '*') {
							triggerObj.velocity = 0;
						}
					}
					break;
				case 'aftertouch':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'cc':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.controller)) {
						triggerObj.controller = 21;
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pc':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pressure':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pitchbend':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						triggerObj.value = 0;
					}
					break;
				case 'sysex':
					let msgArray = triggerObj.message.replace(' ', ',').split(',');
					triggerObj.message = '';
					for (let i = 0; i < msgArray.length; i++) {
						if (isHex(msgArray[i])) {
							//convert hex to dec
							triggerObj.message += parseInt(msgArray[i], 16);
						}
						else {
							//assume dec
							triggerObj.message += parseInt(msgArray[i]);
						}
						if (i < (msgArray-1)) {
							triggerObj.message += ',';
						}
					}
					break;
				default:
					break;
			}
		}
	}
	else {
		return 'invalid-midi-command';
	}
	
	if (triggerObj.actiontype) {
		if (!ActionTypes.includes(triggerObj.actiontype.toLowerCase())) {
			return 'invalid-action-type';
		}
	}
	else {
		return 'invalid-action-type';
	}
	
	if (passed) {
		Triggers.push(triggerObj);
		console.log(clc.cyan.bold('New MIDI Trigger Added - ' + triggerObj.id));
		saveMIDITriggers();
		
		if (triggerObj.midiport) {			
			for (let i = 0; i < MIDI_inputs.length; i++) {
				if (MIDI_inputs[i].name === triggerObj.midiport) {
					if (!MIDI_inputs[i].opened) {
						console.log(clc.cyan.bold('Attempting to open MIDI port: ' + triggerObj.midiport));
						navigator().openMidiIn(triggerObj.midiport)
						.or(function () {
							console.log(clc.red.bold('Cannot open MIDI port specified in trigger. It may no longer be available.'));
							return 'trigger-added-midiin-port-cannot-be-opened';
						})
						.and(function() {
							for (let i = 0; i < MIDI_inputs.length; i++) {
								if (MIDI_inputs[i].name === this.name()) {
									MIDI_inputs[i].opened = true;
									break;
								}
							}
							console.log(clc.green.bold('Port opened successfully: ' + triggerObj.midiport));
							this.connect(receiveMIDI.bind({'midiport': triggerObj.midiport}));
							return 'trigger-added';	
						});
					}
					else {
						return 'trigger-added';
					}
				}
			}
		}
	}
}

function EditTrigger(triggerObj) {
	//edit the Trigger in the array	
	let passed = true;
	
	let index = null;
	
	if (triggerObj.midiport) {
		MIDI_inputs.find((o, i) => {
			if (o.name === triggerObj.midiport) {
				index = i;
			}
		});

		if (index === null) {
			passed = false;
			return 'invalid-midi-port';
		}
	}
	else {
		return 'invalid-midi-port';
	}
	
	if (triggerObj.midicommand) {
		if (!IncomingMIDIMessageTypes.includes(triggerObj.midicommand.toLowerCase())) {
			return 'invalid-midi-command';
		}
		else {
			switch(triggerObj.midicommand) {
				case 'noteon':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.velocity)) {
						if (triggerObj.velocity !== '*') {
							triggerObj.velocity = 1;
						}
					}
					break;
				case 'noteoff':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.velocity)) {
						if (triggerObj.velocity !== '*') {
							triggerObj.velocity = 0;
						}
					}
					break;
				case 'aftertouch':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.note)) {
						triggerObj.note = 21;
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'cc':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.controller)) {
						triggerObj.controller = 21;
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pc':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pressure':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						if (triggerObj.value !== '*') {
							triggerObj.value = 0;
						}
					}
					break;
				case 'pitchbend':
					if (!Number.isInteger(triggerObj.channel)) {
						if (triggerObj.channel !== '*') {
							triggerObj.channel = 0;
						}
					}
					if (!Number.isInteger(triggerObj.value)) {
						triggerObj.value = 0;
					}
					break;
				case 'sysex':
					let msgArray = triggerObj.message.replace(' ', ',').split(',');
					triggerObj.message = '';
					for (let i = 0; i < msgArray.length; i++) {
						if (isHex(msgArray[i])) {
							//convert hex to dec
							triggerObj.message += parseInt(msgArray[i], 16);
						}
						else {
							//assume dec
							triggerObj.message += parseInt(msgArray[i]);
						}
						if (i < (msgArray-1)) {
							triggerObj.message += ',';
						}
					}
					break;
				default:
					break;
			}
		}
	}
	else {
		return 'invalid-midi-command';
	}
	
	if (triggerObj.actiontype) {
		if (!ActionTypes.includes(triggerObj.actiontype.toLowerCase())) {
			return 'invalid-action-type';
		}
	}
	else {
		return 'invalid-action-type';
	}
	
	if (passed) {
		let tempTriggers = [];
		tempTriggers.push(triggerObj);
		Triggers = Triggers.map(obj => tempTriggers.find(o => o.id === obj.id) || obj);
		
		console.log(clc.cyan.bold('MIDI Trigger Edited - ' + triggerObj.id));
		saveMIDITriggers();
		
		if (triggerObj.midiport) {			
			for (let i = 0; i < MIDI_inputs.length; i++) {
				if (MIDI_inputs[i].name === triggerObj.midiport) {
					if (!MIDI_inputs[i].opened) {
						console.log(clc.cyan.bold('Attempting to open MIDI port: ' + triggerObj.midiport));
						navigator().openMidiIn(triggerObj.midiport)
						.or(function () {
							console.log(clc.red.bold('Cannot open MIDI port specified in trigger. It may no longer be available.'));
							return 'trigger-edited-midiin-port-cannot-be-opened';
						})
						.and(function() {
							for (let i = 0; i < MIDI_inputs.length; i++) {
								if (MIDI_inputs[i].name === this.name()) {
									MIDI_inputs[i].opened = true;
									break;
								}
							}
							console.log(clc.green.bold('Port opened successfully: ' + triggerObj.midiport));
							this.connect(receiveMIDI.bind({'midiport': triggerObj.midiport}));
							return 'trigger-edited';	
						});
					}
					else {
						return 'trigger-edited';
					}
				}
			}
		}
	}
}

function DeleteTrigger(triggerID) {
	//delete the specified trigger from the array
	let index = null;

	Triggers.find((o, i) => {
		if (o.id === triggerID)
		{
			index = i;
		}
	});

	if (index !== null) {
		Triggers.splice(index, 1);
		console.log(clc.cyan.bold('MIDI Trigger Deleted - ' + triggerID));
		saveMIDITriggers();
		return 'trigger-deleted';
	}
	else {
		return 'trigger-not-found';
	}
}

process.on('uncaughtException', function(err) {
	if(err.errno === 'EADDRINUSE') {
		console.log(clc.red.bold('Unable to start server on port ' + listenPort + '.') + ' Is midi-relay already running?');
		process.exit(1);
	}
	else {
		if (err.toString().indexOf(' has more than 20 characters') > -1) {
			//MDNS error that doesn't really affect midi-relay
			console.log('MDNS Error: ' + err.toString());
		}
		else {
			console.log('midi-relay Error occurred:');	
			console.log(err);
			process.exit(1);
		}
	}
});

setUpApp();