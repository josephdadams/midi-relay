'use strict'

const config = require('./config.js')
const util = require('./util.js')
const API = require('./api.js')
const notifications = require('./notifications.js')

const isElectron = !!process.versions.electron

// Shared globals (used by util/API)
global.MIDI_INPUTS = []
global.MIDI_OUTPUTS = []

global.IncomingMIDIRelayTypes = ['noteon', 'noteoff', 'aftertouch', 'cc', 'pc', 'pressure', 'pitchbend', 'msc', 'sysex']

global.MIDIRelaysLog = []
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

function gracefulShutdown() {
	try {
		util.shutdownMIDI && util.shutdownMIDI()
	} catch {}
}

/* ===============================
   HEADLESS NODE MODE (Pi)
   =============================== */

if (!isElectron) {
	console.log('Starting midi-relay in headless mode...')

	API.start(config.get('apiPort'))

	process.on('SIGINT', () => {
		gracefulShutdown()
		process.exit(0)
	})

	process.on('SIGTERM', () => {
		gracefulShutdown()
		process.exit(0)
	})

	process.on('uncaughtException', (err) => {
		console.error('Uncaught Exception:', err)
		setTimeout(() => process.exit(1), 5000)
	})

	return
}

/* ===============================
   ELECTRON MODE (Desktop)
   =============================== */

const path = require('path')
const { app, BrowserWindow, Tray, nativeImage } = require('electron')
const { is } = require('electron-util')
const unhandled = require('electron-unhandled')
const contextMenu = require('electron-context-menu')

global.tray = undefined
global.win = undefined

unhandled()
contextMenu()

app.setAppUserModelId(config.get('appUserModelId'))

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
		global.win = undefined
	})

	await global.win.loadFile(path.join(__dirname, 'index.html'))

	return global.win
}

if (!app.requestSingleInstanceLock()) {
	app.quit()
}

app.on('second-instance', () => {
	if (global.win) {
		if (global.win.isMinimized()) {
			global.win.restore()
		}
	}
})

app.on('window-all-closed', () => {
	if (!is.macos) {
		// keep running in tray
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

app.on('before-quit', gracefulShutdown)
app.on('will-quit', gracefulShutdown)

process.on('uncaughtException', (err) => {
	try {
		notifications.showNotification({
			title: 'Uncaught Exception',
			body: `The following uncaught exception occurred:\n\n${err.stack || err}`,
			showNotification: true,
		})
	} catch {}
	setTimeout(() => process.exit(1), 10000)
})
