const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const util = require('./util.js');
const config = require('./config.js');
const notifications = require('./notifications.js');

const package_json = require('./package.json');
const VERSION = package_json.version;

var server = null;
var httpServer = null;
var io = null;

class API {
	static start(port) {
		//starts the REST API
		server = express();

		httpServer = new http.Server(server);
		io = new socketio.Server(httpServer, { allowEIO3: true });

		server.use(express.json()); //parse json in body

		server.get('/', function (req, res) {
			res.sendFile('index.html', { root: __dirname });
		});

		server.get('/version', function (req, res) {
			res.send({version: VERSION});
		});

		server.get('/control_status', function (req, res) {
			res.send({control_status: config.get('allowControl')});
		});

		server.get('/midi_outputs', function (req, res) {
			res.send(util.getMIDIOutputs());
		});

		server.get('/refresh', function (req, res) {
			util.refreshPorts();
			res.send({result: 'refresh-command-sent'});
		});

		server.post('/sendmidi', function (req, res) {
			let midiObj = req.body;

			function sendResult(json) {
				res.send(json);
			}

			util.sendMIDI(midiObj, sendResult);
		});

		server.get('/sendmidi', function (req,res) {
			let midiObj = req.query;

			function sendResult(json) {
				res.send(json);
			}

			util.sendMIDI(midiObj, sendResult);
		});

		server.use(function (req, res) {
			res.status(404).send({error: true, url: req.originalUrl + ' not found.'});
		});
		
		io.sockets.on('connection', (socket) => {
			let ipAddr = socket.handshake.address;
			socket.emit('control_status', config.get('allowControl'));

			socket.on('version', function() {
				socket.emit('version', VERSION);
			});

			socket.on('control_status', function() {
				socket.emit('control_status', config.get('allowControl'));
			});

			socket.on('midi_outputs', function() {
				socket.emit('midi_outputs', util.getMIDIOutputs());
			});

			socket.on('refresh', function() {
				util.refreshPorts();
			});

			socket.on('sendmidi', function(midiObj) {
				if (midiObj) {
					util.sendMIDI(midiObj, function(result) {
						socket.emit('result', result);
					});
				}
			});
		});

		try {
			httpServer.listen(port);
			console.log('REST/Socket.io API server started on: ' + port);	
		}
		catch(error) {
			if (error.toString().indexOf('EADDRINUSE') > -1) {
				notifications.showNotification({
					title: 'Error',
					body: 'Unable to start server. is midi-relay already running?',
					showNotification: true
				});
			}
		}
		
		util.startUp();
	}

	static sendControlStatus() {
		io.sockets.emit('control_status', config.get('allowControl'));
	}
}

module.exports = API;