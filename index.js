'use strict'
const path = require('path')
const { app, BrowserWindow, Tray, nativeImage } = require('electron')
/// const {autoUpdater} = require('electron-updater');
const { is } = require('electron-util')
const unhandled = require('electron-unhandled')
const debug = require('electron-debug')
const contextMenu = require('electron-context-menu')
const config = require('./config.js')
const util = require('./util.js')
const API = require('./api.js')

const notifications = require('./notifications.js')

global.tray = undefined

global.win = undefined

global.MIDI_INPUTS = []
global.MIDI_OUTPUTS = []

global.IncomingMIDIRelayTypes = ['noteon', 'noteoff', 'aftertouch', 'cc', 'pc', 'pressure', 'pitchbend', 'msc', 'sysex']

global.MIDIRelaysLog = [] //global array of MIDI messages and the datetime they were sent

global.MDNS_HOSTS = []

global.sendControlStatus = function () {
	API.sendControlStatus()
}

global.refreshPorts = function () {
	util.refreshPorts()
}

global.toggleInputDisabled = function (inputId) {
	util.toggleInputDisabled(inputId)
}

global.isInputDisabled = function (inputId) {
	return util.isInputDisabled(inputId)
}

global.startRescanInterval = function () {
	util.startRescanInterval()
}

global.RESCAN_INTERVAL = null

global.sendMIDIBack = function (midiObj) {
	API.sendMIDIBack(midiObj)
}

unhandled()
//debug();
contextMenu()

// Note: Must match `build.appId` in package.json
app.setAppUserModelId(config.get('appUserModelId'))

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

const createMainWindow = async () => {
	global.win = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
		title: app.name,
		show: true,
		x: 0,
		y: 0,
		width: 500,
		height: 800,
		frame: true,
		transparent: false,
		shadow: false,
	})

	global.win.on('ready-to-show', () => {
		if (config.get('showLicense') == true) {
			global.win.show()
		} else {
			global.win.hide()
		}
	})

	global.win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		global.win = undefined
	})

	await global.win.loadFile(path.join(__dirname, 'index.html'))

	return global.win
}

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit()
}

app.on('second-instance', () => {
	if (global.win) {
		if (global.win.isMinimized()) {
			global.win.restore()
		}

		//global.win.show();
	}
})

app.on('window-all-closed', () => {
	if (!is.macos) {
		//app.quit();
	}
})

app.on('activate', async () => {
	if (!global.win) {
		global.win = await createMainWindow()
	}
})
;(async () => {
	await app.whenReady()

	global.win = await createMainWindow()

	const icon = nativeImage.createFromDataURL(config.get('icon'))
	global.tray = new Tray(icon.resize({ width: 24, height: 24 }))

	global.tray.setToolTip('midi-relay')

	if (process.platform === 'darwin') {
	app.dock.hide()
}

	API.start(config.get('apiPort'))
})()

function gracefulShutdown() {
	try {
		util.shutdownMIDI && util.shutdownMIDI()
	} catch {}
}

app.on('before-quit', gracefulShutdown)
app.on('will-quit', gracefulShutdown)

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

process.on('uncaughtException', (err) => {
	try {
		notifications.showNotification({
			title: 'Uncaught Exception',
			body: `The following uncaught exception occurred:\n\n${err.stack || err}`,
			showNotification: true,
		})
	} catch {}
	setTimeout(() => process.exit(1), 10000) // ← invoke later
})
