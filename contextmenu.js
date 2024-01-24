const { app, Menu, shell } = require('electron');

const config = require('./config.js');

const package_json = require('./package.json');
const VERSION = package_json.version;

function buildContextMenu() {
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'midi-relay: v' + VERSION,
			enabled: false
		},
		{
			label: 'API running on port: ' + config.get('apiPort'),
			enabled: false
		},
		{
			label: 'MIDI Input Ports Detected: ' + global.MIDI_INPUTS.length,
			enabled: false
		},
		{
			label: 'MIDI Output Ports Detected: ' + global.MIDI_OUTPUTS.length,
			enabled: false
		},
		{
			label: 'Rescan for MIDI Ports',
			click: function () {
				global.refreshPorts();
			}
		},
		{
			label: 'Periodically Rescan for MIDI Ports',
			type: 'checkbox',
			checked: config.get('allowRescan'),
			click: function () {
				config.set('allowRescan', !config.get('allowRescan'));
				global.startRescanInterval();
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Allow MIDI Remote Control',
			type: 'checkbox',
			checked: config.get('allowControl'),
			click: function () {
				config.set('allowControl', !config.get('allowControl'));
				global.sendControlStatus();
			}
		},
		{
			label: 'Show Notifications',
			type: 'checkbox',
			checked: config.get('allowNotifications'),
			click: function () {
				config.set('allowNotifications', !config.get('allowNotifications'));
			}
		},
		{
			type: 'separator'
		},
		{
			label: 'Show License on Startup',
			type: 'checkbox',
			checked: config.get('showLicense'),
			click: function () {
				config.set('showLicense', !config.get('showLicense'));
			}
		},
		{
			label: 'Open MIDI Input Trigger Settings',
			click: function() {
				shell.openExternal(`http://127.0.0.1:${config.get('apiPort')}`)
			}
		},
		{
			label: 'Request Help/Support',
			click: function() {
				shell.openExternal(config.get('supportUrl'))
			}
		},
		{
			label: 'Quit',
			click: function () {
				app.quit();
			}
		}
	]);

	tray.setContextMenu(contextMenu);
}

module.exports = {
	buildContextMenu() {
		buildContextMenu();
	}
}