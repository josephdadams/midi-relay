'use strict'

let systemPreferences = null

// Only require Electron when running inside Electron
if (process.versions.electron) {
	const electron = require('electron')
	systemPreferences = electron.systemPreferences
}

const config = require('./config.js')

const midi = require('./midi.js')
const mdns = require('./mdns.js')

const notifications = require('./notifications.js')
const contextmenu = require('./contextmenu.js')

function subscribeToNotifications() {
	// Skip entirely in headless mode
	if (!systemPreferences) return

	let allowedEvents = config.get('allowedEvents') || []

	for (let i = 0; i < allowedEvents.length; i++) {
		systemPreferences.subscribeNotification(allowedEvents[i], (event, userInfo) => {
			processNotification(event, userInfo)
		})
	}
}

function processNotification(event, info) {
	try {
		if ((config.get('allowedEvents') || []).includes(event)) {
			switch (event) {
				default:
					break
			}
		}
	} catch (error) {
		console.log(error)
	}
}

function startRescanInterval() {
	if (config.get('allowRescan')) {
		global.RESCAN_INTERVAL = setInterval(() => {
			midi.refreshPorts(false)
		}, 60000)
	} else {
		clearInterval(global.RESCAN_INTERVAL)
	}
}

module.exports = {
	startUp() {
		// Only build context menu in Electron
		if (process.versions.electron) {
			contextmenu.buildContextMenu()
		}

		midi.startMIDI()
		// mdns.startMDNS();
		startRescanInterval()

		// Only subscribe to system notifications in Electron
		subscribeToNotifications()
	},

	getMIDIOutputs() {
		return global.MIDI_OUTPUTS
	},

	getMIDIInputs() {
		return global.MIDI_INPUTS
	},

	sendMIDI(midiObj, callback) {
		midi.sendMIDI(midiObj, callback)
	},

	refreshPorts() {
		midi.refreshPorts(true)
	},

	startRescanInterval() {
		startRescanInterval()
	},

	getTriggers() {
		return config.get('triggers')
	},

	addTrigger(triggerObj) {
		midi.addTrigger(triggerObj)
	},

	updateTrigger(triggerObj) {
		midi.updateTrigger(triggerObj)
	},

	deleteTrigger(triggerId) {
		midi.deleteTrigger(triggerId)
	},

	toggleInputDisabled(inputId) {
		midi.toggleInputDisabled(inputId)
	},

	isInputDisabled(inputId) {
		return midi.isInputDisabled(inputId)
	},

	shutdownMIDI() {
		midi.shutdownMIDI()
	},
}
