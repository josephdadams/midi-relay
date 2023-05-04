'use strict';
const path = require('path');
const {app, BrowserWindow, Tray, nativeImage} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
const unhandled = require('electron-unhandled');
const debug = require('electron-debug');
const contextMenu = require('electron-context-menu');
const config = require('./config.js');
const util = require('./util.js');
const API = require('./api.js');

const notifications = require('./notifications.js');

global.tray = undefined;

global.win = undefined;

global.MIDI_INPUTS = [];
global.MIDI_OUTPUTS = [];

global.IncomingMIDIRelayTypes = ['noteon', 'noteoff', 'aftertouch', 'cc', 'pc', 'pressure', 'pitchbend', 'msc', 'sysex'];

global.MDNS_HOSTS = [];

global.sendControlStatus = function() {
	API.sendControlStatus();
}

global.refreshPorts = function() {
	util.refreshPorts();
}

unhandled();
//debug();
contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId(config.get('appUserModelId'));
app.dock.hide();

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

// Prevent window from being garbage collected
let mainWindow;

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
		shadow: false
	});

	global.win.on('ready-to-show', () => {
		global.win.show();
	});

	global.win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	await global.win.loadFile(path.join(__dirname, 'index.html'));

	return global.win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		//mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

(async () => {
	await app.whenReady();
	
	mainWindow = await createMainWindow();

	const icon = nativeImage.createFromDataURL(config.get('icon'));
	tray = new Tray(icon.resize({ width: 24, height: 24 }));

	tray.setToolTip('midi-relay');

	API.start(config.get('apiPort'));
})();

process.on('uncaughtException', function(err) {
	notifications.showNotification({
		title: 'Uncaught Exception',
		body: `The following uncaught exception has occured:\n\n${err.toString()}\n\nThe program will exit in 10 seconds.`,
		showNotification: true
	});

	setTimeout(process.exit(1), 10000);
});