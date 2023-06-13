'use strict';

const {app, systemPreferences} = require('electron');

const config = require('./config.js');

const midi = require('./midi.js');
const mdns = require('./mdns.js');

const notifications = require('./notifications.js');
const contextmenu = require('./contextmenu.js');

function subscribeToNotifications() { //system events that can notify the app of a system change - perhaps like USB device being plugged in
	let allowedEvents = config.get('allowedEvents');
	for (let i = 0; i < allowedEvents.length; i++) {
		systemPreferences.subscribeNotification(allowedEvents[i], (event, userInfo) => {
			processNotification(event, userInfo);
		});
	}
}

function processNotification(event, info) { //process the system event
	try {
		if (config.get('allowedEvents').includes(event)) {
			//do the stuff with the things
			switch(event) {
				default:
					break;
			}
		}
	}
	catch(error) {
		console.log(error);
	}
}

function startRescanInterval() {
	if (config.get('allowRescan')) {
		global.RESCAN_INTERVAL = setInterval(() => {
			midi.refreshPorts(false);
		}, 60000);
	}
	else {
		clearInterval(global.RESCAN_INTERVAL);
	}
}

module.exports = {
	startUp() {
		contextmenu.buildContextMenu();
		midi.startMIDI();
		//mdns.startMDNS();
		startRescanInterval();
		subscribeToNotifications(); //for system notifications to alert the app of changes like usb devices detected
	},

	getMIDIOutputs() {
		return global.MIDI_OUTPUTS
	},

	sendMIDI(midiObj, callback) {
		midi.sendMIDI(midiObj, callback);
	},

	refreshPorts() {
		midi.refreshPorts(true);
	},

	startRescanInterval() {
		startRescanInterval();
	}
}