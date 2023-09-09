//MIDI library variables
var navigator = require('jzz');

const request = require('request');
const http = require('http');

const notifications = require('./notifications.js');
const contextmenu = require('./contextmenu.js');

const config = require('./config.js');

const _ = require('lodash');

var logger = navigator.Widget({ _receive: function(msg) { console.log('virtual message received: '); console.log(msg.toString()); }});

function createVirtualMIDIPort() {
	navigator.addMidiOut('midi-relay', logger);
}

function GetPorts(showNotification) {
	navigator.requestMIDIAccess().then(function(webmidi) {	
		let info = navigator.info();

		global.MIDI_OUTPUTS = info.outputs;
		
		//retain the 'opened' property when reloading the array
		let temp_inputs = info.inputs;
		for (let i = 0; i < temp_inputs.length; i++) {
			let port = global.MIDI_INPUTS.find(({ name }) => name === temp_inputs[i].name);
			if (port) {
				if (port.opened) {
					temp_inputs[i].opened = port.opened;
				}
			}
		}

		global.MIDI_INPUTS = temp_inputs;

		loadMIDITriggers(); //open the port used in the triggers

		if (showNotification == true) {
			let bodyText = '';

			for (let i = 0; i <  global.MIDI_OUTPUTS.length; i++) {
				bodyText += global.MIDI_OUTPUTS[i].name + '\n';
			}

			notifications.showNotification({
				title: `${global.MIDI_OUTPUTS.length} MIDI Output Ports Found.`,
				body: bodyText
			});
		}
		
		contextmenu.buildContextMenu();
	}, function(err) {
		if (err) {
			console.log(err, 'error');
			throw new Error(err);
		}
	});
}

function refreshPorts(showNotification) {
	try {
		navigator().refresh();
		GetPorts(showNotification);
	}
	catch(error) {
		//emit error
	}
}

function sendMIDI(midiObj, callback) {
	if (midiObj.midiport) {
		let midiPortObj = global.MIDI_OUTPUTS.find((port) => port.name == midiObj.midiport);

		if (midiPortObj) {
			if (midiObj.midicommand) {
				if (global.IncomingMIDIRelayTypes.includes(midiObj.midicommand)) {
					let port = navigator().openMidiOut(midiObj.midiport)
					.or(function () {
						callback({ result: 'could-not-open-midi-out' });
					})
					.and(function () {
						try {
							if (!Number.isInteger(midiObj.channel)) {
								midiObj.channel = 0;
							}
							if (!Number.isInteger(midiObj.note)) {
								midiObj.note = 21;
							}
							if (!Number.isInteger(midiObj.velocity)) {
								if (midiObj.midicommand === 'noteon') {
									midiObj.velocity = 127;
								}
								else if(midiObj.midicommand === 'noteoff') {
									midiObj.velocity = 0;
								}
							}
							if (!Number.isInteger(midiObj.value)) {
								midiObj.value = 1;
							}
							
							let msg = null;
							
							let returnObj;
							
							let rawmessage = '';
							
							switch(midiObj.midicommand.toLowerCase()) {
								case 'noteon':
									msg = navigator.MIDI.noteOn(midiObj.channel, midiObj.note, midiObj.velocity);
									break;
								case 'noteoff':
									msg = navigator.MIDI.noteOff(midiObj.channel, midiObj.note, midiObj.velocity);
									break;
								case 'aftertouch':
									msg = navigator.MIDI.aftertouch(midiObj.channel, midiObj.note, midiObj.value);
									break;
								case 'cc':
									msg = navigator.MIDI.control(midiObj.channel, midiObj.controller, midiObj.value);
									break;
								case 'pc':
									msg = navigator.MIDI.program(midiObj.channel, midiObj.value);
									break;
								case 'pressure':
									msg = navigator.MIDI.pressure(midiObj.channel, midiObj.value);
									break;
								case 'pitchbend':
									msg = navigator.MIDI.pitchBend(midiObj.channel, midiObj.value);
									break;
								case 'msc':
									msg = BuildMSC(midiObj.deviceid, midiObj.commandformat, midiObj.command, midiObj.cue, midiObj.cuelist, midiObj.cuepath);
									break;	
								case 'sysex':
									try {
										msg = midiObj.message.split(',');
									}
									catch(error) {
										//some error converting the message into an array, like maybe missing commas
									}
									break;
								default:
									break;
							}

							if (msg !== null) {
								this.send(msg);

								for (let i = 0; i < msg.length; i++) {
									rawmessage += msg[i];
									if (i < (msg.length-1)) {
										rawmessage += ',';
									}
								}
								returnObj = {result: 'midi-sent-successfully', midiObj: midiObj, message: rawmessage};
								console.log(returnObj);
								AddToLog(midiObj.midiport, midiObj.midicommand, rawmessage);
								callback(returnObj);
							}
						}
						catch(error) {
							callback({result: 'error', error: error});
						}
					});
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

function AddToLog(midiPort, midiCommand, message) {
	let relayObj = {};
	relayObj.midiport = midiPort;
	relayObj.midicommand = midiCommand;
	relayObj.message = message;
	relayObj.datetime = Date.now();
	global.MIDIRelaysLog.push(relayObj);
}

function CheckLog(midiPort, midiCommand, message, time) {
	let passed = true;

	for (let i = 0; i < global.MIDIRelaysLog.length; i++) {
		if (global.MIDIRelaysLog[i].midiport === midiPort) {
			if (global.MIDIRelaysLog[i].midicommand === midiCommand) {
				if (global.MIDIRelaysLog[i].message === message) {
					//check to see when it arrived, it could be a bounceback
					if (time - global.MIDIRelaysLog[i].datetime < 15) {
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

	for (let i = 0; i < global.MIDIRelaysLog.length; i++) {
		if (time - global.MIDIRelaysLog.datetime > 60000) {
			global.MIDIRelaysLog.splice(i, 1);
			i--;
		}
	}
}

function loadMIDITriggers() {
	let Triggers = config.get('triggers');

	for (let i = 0; i < Triggers.length; i++) {
		let port = global.MIDI_INPUTS.find(({ name }) => name === Triggers[i].midiport);

		if (port) {
			if (!port.opened) {
				navigator().openMidiIn(Triggers[i].midiport)
					.or(function () {
						//error opening
					})
					.and(function () {
						for (let j = 0; j < global.MIDI_INPUTS.length; j++) {
							if (global.MIDI_INPUTS[j].name === this.name()) {
								global.MIDI_INPUTS[j].opened = true;
								break;
							}
						}
						this.connect(receiveMIDI.bind({ 'midiport': Triggers[i].midiport }));
					});
				break;
			}
		}
	}
}

function OpenPort(midiport) {
	navigator().openMidiIn(midiport)
	.or(function () {
		//error opening
	})
	.and(function () {
		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === this.name()) {
				global.MIDI_INPUTS[i].opened = true;
				break;
			}
		}
		this.connect(receiveMIDI.bind({ 'midiport': midiport }));
	});
}

function ClosePort(midiObj) {
	let found = false;

	if (midiObj.midiport) {
		let portName = midiObj.midiport;
		
		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === portName) {
				global.MIDI_INPUTS[i].opened = false;
				found = true;
				break;
			}
		}
	}
}

function receiveMIDI(midiArg) {
	let midiObj = {};

	let statusBytes = [
		{ byte: '8', type: 'noteoff' },
		{ byte: '9', type: 'noteon' },
		{ byte: 'A', type: 'aftertouch' },
		{ byte: 'B', type: 'cc' },
		{ byte: 'C', type: 'pc' },
		{ byte: 'D', type: 'pressure' },
		{ byte: 'E', type: 'pitchbend' },
		{ byte: 'F', type: 'sysex' }
	]

	let midiType = midiArg[0].toString(16).substring(0, 1).toUpperCase();
	let statusByte = statusBytes.find(({ byte }) => byte === midiType);
	if (statusByte) {
		let midiCommand = statusByte.type;
		midiObj.midicommand = midiCommand;
	}

	midiObj.midiport = this.midiport;

	switch (midiObj.midicommand) {
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
			midiObj.value = lsb + msb;
			break;
		case 'sysex':
			midiObj.message = '';
			for (let i = 0; i < midiArg.length; i++) {
				midiObj.message += midiArg[i];
				if (i < (midiArg.length - 1)) {
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
		if (i < (midiArg.length - 1)) {
			midiObj.rawmessage += ',';
		}
	}

	processMIDI(midiObj);
}

function processMIDI(midiObj) {
	let Triggers = config.get('triggers');

	let port = global.MIDI_INPUTS.find(({ name }) => name === midiObj.midiport);

	if (port.opened) {
		let passed = true;
		passed = CheckLog(midiObj.midiport, midiObj.midicommand, midiObj.rawmessage, Date.now()); //debounce, make sure we didn't already process this message
		if (passed) {
			for (let i = 0; i < Triggers.length; i++) {
				if ((Triggers[i].midiport === midiObj.midiport) && (Triggers[i].midicommand === midiObj.midicommand)) {
					switch (Triggers[i].midicommand) {
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
}

function runMIDITrigger(midiTriggerObj) {
	switch (midiTriggerObj.actiontype) {
		case 'http':
			runMIDITrigger_HTTP(midiTriggerObj);
			break;
		default:
			break;
	}
}

function runMIDITrigger_HTTP(midiTriggerObj) {
	if (midiTriggerObj.jsondata) {
		//if JSON data is present, send as HTTP POST with the data, otherwise send it as GET
		try {
			request.post(
				midiTriggerObj.url,
				{ json: JSON.parse(midiTriggerObj.jsondata), strictSSL: false },
				function (error, response, body) {
					if (!error && response.statusCode == 200) {
						console.log(body);
					}
					else {
						console.log(error);
						console.log(response);
						console.log(body);
					}
				}
			);
		}
		catch (error) {
			
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

function uuidv4() { //unique UUID generator for IDs
	return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function isHex(h) {
	let a = parseInt(h, 16);
	return (a.toString(16) === h.toLowerCase());
}

function addTrigger(triggerObj) {
	//add the Trigger to the array
	triggerObj.id = 'trigger-' + uuidv4();

	switch (triggerObj.midicommand) {
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
				if (i < (msgArray - 1)) {
					triggerObj.message += ',';
				}
			}
			break;
		default:
			break;
	}

	let Triggers = config.get('triggers');
	Triggers.push(triggerObj);
	config.set('triggers', Triggers);

	if (triggerObj.midiport) {
		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === triggerObj.midiport) {
				if (!global.MIDI_INPUTS[i].opened) {
					OpenPort(triggerObj.midiport);
				}
			}
		}
	}
}

function updateTrigger(triggerObj) {
	//update the Trigger in the array
	let Triggers = config.get('triggers');

	switch (triggerObj.midicommand) {
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
				if (i < (msgArray - 1)) {
					triggerObj.message += ',';
				}
			}
			break;
		default:
			break;
	}
		
	let tempTriggers = [];
	tempTriggers.push(triggerObj);
	Triggers = Triggers.map(obj => tempTriggers.find(o => o.id === obj.id) || obj);

	config.set('triggers', Triggers);

	if (triggerObj.midiport) {

		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === triggerObj.midiport) {
				if (!global.MIDI_INPUTS[i].opened) {
					OpenPort(triggerObj.midiport);
				}
			}
		}
	}

	config.set('triggers', Triggers);
}

function deleteTrigger(triggerID) {
	//delete the specified trigger from the array
	let Triggers = config.get('triggers');
	Triggers.find((o, i) => {
		if (o.id === triggerID) {
			Triggers.splice(i, 1);
		}
	});

	config.set('triggers', Triggers);
}


module.exports = {
	startMIDI() {
		createVirtualMIDIPort();
		GetPorts(true);
	},

	sendMIDI(midiObj, callback) {
		sendMIDI(midiObj, callback);
	},

	refreshPorts() {
		refreshPorts();
	},

	addTrigger(triggerObj) {
		addTrigger(triggerObj);
	},

	updateTrigger(triggerObj) {
		updateTrigger(triggerObj);
	},

	deleteTrigger(triggerId) {
		deleteTrigger(triggerId);
	}
}