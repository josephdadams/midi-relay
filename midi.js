//MIDI library variables
var navigator = require('jzz');

const notifications = require('./notifications.js');
const contextmenu = require('./contextmenu.js');

const _ = require('lodash');

var logger = navigator.Widget({ _receive: function(msg) { console.log('virtual message received: '); console.log(msg.toString()); }});

function createVirtualMIDIPort() {
	navigator.addMidiOut('midi-relay', logger);
}

function GetPorts() {
	navigator.requestMIDIAccess().then(function(webmidi) {	
		let info = navigator.info();

		global.MIDI_OUTPUTS = info.outputs;

		let bodyText = '';

		for (let i = 0; i <  global.MIDI_OUTPUTS.length; i++) {
			bodyText += global.MIDI_OUTPUTS[i].name + '\n';
		}

		notifications.showNotification({
			title: `${global.MIDI_OUTPUTS.length} MIDI Output Ports Found.`,
			body: bodyText
		});

		contextmenu.buildContextMenu();
	}, function(err) {
		if (err) {
			console.log(err, 'error');
			throw new Error(err);
		}
	});
}

function refreshPorts() {
	try {
		navigator().refresh();
		GetPorts();
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
									msg = midiObj.message;
									break;
								default:
									break;
							}

							if (msg !== null) {
								this.send(msg).close();

								for (let i = 0; i < msg.length; i++) {
									rawmessage += msg[i];
									if (i < (msg.length-1)) {
										rawmessage += ',';
									}
								}
								returnObj = {result: 'midi-sent-successfully', midiObj: midiObj, message: rawmessage};
								console.log(returnObj);
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

module.exports = {
	startMIDI() {
		createVirtualMIDIPort();
		GetPorts();
	},

	sendMIDI(midiObj, callback) {
		sendMIDI(midiObj, callback);
	},

	refreshPorts() {
		refreshPorts();
	}
}