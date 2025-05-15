//MIDI library variables
const midi = require('midi')

const request = require('request')
const http = require('http')

const notifications = require('./notifications.js')
const contextmenu = require('./contextmenu.js')

const config = require('./config.js')

const _ = require('lodash')

let virtualOutput = new midi.Output()
let virtualInput = new midi.Input()

function createVirtualMIDIPort() {
	try {
		virtualOutput.openVirtualPort('midi-relay')
		virtualInput.openVirtualPort('midi-relay')

		virtualInput.ignoreTypes(false, false, false)

		virtualInput.on('message', (deltaTime, message) => {
			console.log('virtual message received:')
			console.log(message)
			receiveMIDI('midi-relay', message)
		})

		notifications.showNotification({
			title: 'Virtual MIDI Port',
			body: 'Virtual MIDI Port Created: midi-relay',
			showNotification: true,
		})
	} catch (error) {
		console.warn('Virtual ports not supported on this platform or failed to create:', error.message)
		notifications.showNotification({
			title: 'Virtual MIDI Port Error',
			body: 'Unable to create virtual MIDI port. Virtual ports not supported on this platform or failed to create.',
			showNotification: true,
		})
	}
}

const inputMap = new Map()
const outputMap = new Map()

function GetPorts(showNotification) {
	global.MIDI_OUTPUTS = []
	global.MIDI_INPUTS = []

	const output = new midi.Output()
	const input = new midi.Input()

	for (let i = 0; i < output.getPortCount(); i++) {
		const name = output.getPortName(i)
		global.MIDI_OUTPUTS.push({ id: name, name })
		outputMap.set(name, i)
	}

	for (let i = 0; i < input.getPortCount(); i++) {
		const name = input.getPortName(i)
		const alreadyExists = global.MIDI_INPUTS.find((p) => p.name === name)
		if (!alreadyExists) {
			global.MIDI_INPUTS.push({ id: i, name, opened: false })
		}
	}

	let portsToOpen = global.MIDI_INPUTS.filter((port) => !isInputDisabled(port.id) && !port.opened)
	portsToOpen.forEach((port) => OpenPort(port.name))

	loadMIDITriggers()

	if (showNotification) {
		let bodyText = global.MIDI_OUTPUTS.map((port) => port.name).join('\n')
		notifications.showNotification({
			title: `${global.MIDI_OUTPUTS.length} MIDI Output Ports Found.`,
			body: bodyText,
			showNotification: true,
		})
	}

	contextmenu.buildContextMenu()
}

function OpenPort(portName) {
	if (inputMap.has(portName)) {
		// Already opened
		return
	}

	const input = new midi.Input()
	const portCount = input.getPortCount()

	for (let i = 0; i < portCount; i++) {
		if (input.getPortName(i) === portName) {
			try {
				input.openPort(i)
				input.ignoreTypes(false, false, false)

				input.on('message', (deltaTime, message) => {
					receiveMIDI(portName, message)
				})

				inputMap.set(portName, input)

				let port = global.MIDI_INPUTS.find((p) => p.name === portName)
				if (port) port.opened = true

				notifications.showNotification({
					title: `MIDI Port Opened: ${portName}`,
					body: `MIDI Port Opened: ${portName}`,
					showNotification: true,
				})
			} catch (err) {
				console.warn(`Error opening MIDI port ${portName}:`, err)
			}
			break
		}
	}
}

function refreshPorts(showNotification) {
	try {
		GetPorts(showNotification)
	} catch (error) {
		//emit error
	}
}

function sendMIDI(midiObj, callback) {
	const portIndex = outputMap.get(midiObj.midiport)
	if (typeof portIndex !== 'number') {
		callback({ result: 'invalid-midi-port' })
		return
	}

	const output = new midi.Output()
	output.openPort(portIndex)

	let message = []

	switch (midiObj.midicommand.toLowerCase()) {
		case 'noteon':
			message = [0x90 + midiObj.channel, midiObj.note, midiObj.velocity || 127]
			break
		case 'noteoff':
			message = [0x80 + midiObj.channel, midiObj.note, midiObj.velocity || 0]
			break
		case 'cc':
			message = [0xb0 + midiObj.channel, midiObj.controller, midiObj.value]
			break
		case 'pc':
			message = [0xc0 + midiObj.channel, midiObj.value]
			break
		case 'pressure':
			message = [0xd0 + midiObj.channel, midiObj.value]
			break
		case 'pitchbend':
			const lsb = midiObj.value & 0x7f
			const msb = (midiObj.value >> 7) & 0x7f
			message = [0xe0 + midiObj.channel, lsb, msb]
			break
		case 'sysex':
			message = midiObj.message.split(',').map((v) => parseInt(v))
			break
		case 'msc':
			message = BuildMSC(
				midiObj.deviceid,
				midiObj.commandformat,
				midiObj.command,
				midiObj.cue,
				midiObj.cuelist,
				midiObj.cuepath,
			)
			break
		default:
			callback({ result: 'invalid-midi-command' })
			return
	}

	try {
		output.sendMessage(message)
		callback({ result: 'midi-sent-successfully', midiObj, message })
	} catch (err) {
		callback({ result: 'error', error: err.message })
	} finally {
		output.closePort()
	}
}

function BuildMSC(deviceId, commandFormat, command, cue, cueList, cuePath) {
	let deviceId_hex = null
	let commandFormat_hex = null
	let command_hex = null
	let cue_hex = null
	let cueList_hex = null
	let cuePath_hex = null

	try {
		deviceId_hex = isNaN(parseInt(deviceId)) ? parseStringDeviceId(deviceId) : parseIntegerDeviceId(parseInt(deviceId))
	} catch (err) {
		console.warn('Error parsing MSC deviceId:', err.message)
		return []
	}

	switch (commandFormat) {
		case 'lighting.general':
			commandFormat_hex = 0x01
			break
		case 'sound.general':
			commandFormat_hex = 0x10
			break
		case 'machinery.general':
			commandFormat_hex = 0x20
			break
		case 'video.general':
			commandFormat_hex = 0x30
			break
		case 'projection.general':
			commandFormat_hex = 0x40
			break
		case 'processcontrol.general':
			commandFormat_hex = 0x50
			break
		case 'pyro.general':
			commandFormat_hex = 0x60
			break
		default:
			commandFormat_hex = 0x7f
			break
	}

	switch (command) {
		case 'go':
			command_hex = 0x01
			break
		case 'stop':
			command_hex = 0x02
			break
		case 'gojam':
			command_hex = 0x10
			break
		case 'resume':
			command_hex = 0x03
			break
		case 'timedgo':
			command_hex = 0x04
			break
		case 'load':
			command_hex = 0x05
			break
		case 'set':
			command_hex = 0x06
			break
		case 'fire':
			command_hex = 0x07
			break
		case 'alloff':
			command_hex = 0x08
			break
		case 'restore':
			command_hex = 0x09
			break
		case 'reset':
			command_hex = 0x0a
			break
		case 'gooff':
			command_hex = 0x0b
			break
		case 'opencuelist':
			command_hex = 0x01b
			break
		case 'closecuelist':
			command_hex = 0x01c
			break
		case 'startclock':
			command_hex = 0x015
			break
		case 'stopclock':
			command_hex = 0x016
			break
		default:
			command_hex = 0x01
			break
	}

	if (cue !== '' && cue !== undefined) {
		cue_hex = stringToByteArray(cue)
	}

	if (cueList !== '' && cueList !== undefined) {
		cueList_hex = stringToByteArray(cueList)
	}

	if (cuePath !== '' && cuePath !== undefined) {
		cuePath_hex = stringToByteArray(cuePath)
	}

	var message = [0xf0, 0x7f, deviceId_hex, 0x02, commandFormat_hex, command_hex]

	if (cue_hex !== null) {
		message.push(cue_hex)
	}

	if (cueList_hex !== null) {
		message.push(0x00)
		message.push(cueList_hex)
	}

	if (cuePath_hex !== null) {
		message.push(0x00)
		message.push(cuePath_hex)
	}

	message.push(0xf7)

	return _.flatten(message)
}

function stringToByteArray(str) {
	if (str.toString) {
		str = str.toString()
	}

	var ret = []
	for (var i = 0; i < str.length; i++) {
		var char = parseInt(str.charCodeAt(i))
		ret.push(char)
	}
	return ret
}

function parseStringDeviceId(deviceId) {
	deviceId = deviceId.toLowerCase()
	if (deviceId === 'all') {
		return 0x7f
	}

	var match = deviceId.match(/^G(\d{1,2})$/i)
	if (match) {
		var g = parseInt(match[1])
		if (g < 1 || g > 15) {
			throw new Error('Group numbers must be within 1 and 15.')
		}
		return 0x6f + g
	}

	throw new Error('Invalid deviceId.')
}

function parseIntegerDeviceId(deviceId) {
	if (deviceId >= 0x00 && deviceId <= 0x6f) {
		return _.parseInt(deviceId)
	}

	throw new Error('Integer deviceIds must be between 0 (0x00) and 111 (0x6F)')
}

function CheckLog(midiPort, midiCommand, message, time) {
	let passed = true

	if (!global.MIDIRelaysLog) {
		global.MIDIRelaysLog = []
	}

	for (let i = 0; i < global.MIDIRelaysLog.length; i++) {
		if (global.MIDIRelaysLog[i].midiport === midiPort) {
			if (global.MIDIRelaysLog[i].midicommand === midiCommand) {
				if (global.MIDIRelaysLog[i].message === message) {
					//check to see when it arrived, it could be a bounceback
					if (time - global.MIDIRelaysLog[i].datetime < 15) {
						//bounceback, send false
						passed = false
					}
				}
			}
		}
	}

	CleanUpLog()

	return passed
}

function CleanUpLog() {
	//loops through the array and removes anything older than 60000ms (1 minute)
	let time = Date.now()

	if (!global.MIDIRelaysLog) {
		global.MIDIRelaysLog = []
	}

	for (let i = 0; i < global.MIDIRelaysLog.length; i++) {
		if (time - global.MIDIRelaysLog[i].datetime > 60000) {
			global.MIDIRelaysLog.splice(i, 1)
			i--
		}
	}
}

function loadMIDITriggers() {
	let Triggers = config.get('triggers')

	for (let i = 0; i < Triggers.length; i++) {
		let port = global.MIDI_INPUTS.find(({ name }) => name === Triggers[i].midiport)

		if (port) {
			if (!port.opened) {
				OpenPort(Triggers[i].midiport)
				break
			}
		}
	}
}

function receiveMIDI(portName, message) {
	const status = message[0] >> 4
	const channel = message[0] & 0xf
	const data1 = message[1]
	const data2 = message[2]

	let midiObj = {
		midiport: portName,
		rawmessage: message.join(','),
		channel: channel,
	}

	console.log('MIDI message received:')
	console.log('Port:', portName)
	console.log('Status:', status)
	console.log('Channel:', channel)
	console.log('Data1:', data1)
	console.log('Data2:', data2)
	console.log('Raw message:', message.join(','))

	switch (status) {
		case 8:
			midiObj.midicommand = 'noteoff'
			midiObj.note = data1
			midiObj.velocity = data2
			break
		case 9:
			midiObj.midicommand = 'noteon'
			midiObj.note = data1
			midiObj.velocity = data2
			break
		case 11:
			midiObj.midicommand = 'cc'
			midiObj.controller = data1
			midiObj.value = data2
			break
		case 12:
			midiObj.midicommand = 'pc'
			midiObj.value = data1
			break
		case 13:
			midiObj.midicommand = 'pressure'
			midiObj.value = data1
			break
		case 14:
			midiObj.midicommand = 'pitchbend'
			midiObj.value = data1 + (data2 << 7)
			break
		case 15:
			midiObj.midicommand = 'sysex'
			midiObj.message = message.join(',')
			break
		default:
			midiObj.midicommand = 'unsupported'
	}

	processMIDI(midiObj)
	global.sendMIDIBack(midiObj)
}

function processMIDI(midiObj) {
	let Triggers = config.get('triggers')

	let port = global.MIDI_INPUTS.find(({ name }) => name === midiObj.midiport)

	if (port.opened) {
		let passed = true
		passed = CheckLog(midiObj.midiport, midiObj.midicommand, midiObj.rawmessage, Date.now()) //debounce, make sure we didn't already process this message
		if (passed) {
			for (let i = 0; i < Triggers.length; i++) {
				if (Triggers[i].midiport === midiObj.midiport && Triggers[i].midicommand === midiObj.midicommand) {
					switch (Triggers[i].midicommand) {
						case 'noteon':
						case 'noteoff':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].note) === parseInt(midiObj.note)) {
									if (parseInt(Triggers[i].velocity) === parseInt(midiObj.velocity) || Triggers[i].velocity === '*') {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i])
									}
								}
							}
							break
						case 'aftertouch':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].note) === parseInt(midiObj.note)) {
									if (parseInt(Triggers[i].value) === parseInt(midiObj.value) || Triggers[i].value === '*') {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i])
									}
								}
							}
							break
						case 'cc':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].controller) === parseInt(midiObj.controller)) {
									if (parseInt(Triggers[i].value) === parseInt(midiObj.value) || Triggers[i].value === '*') {
										//trigger is a match, run the trigger
										setTimeout(runMIDITrigger, 1, Triggers[i])
									}
								}
							}
							break
						case 'pc':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].value) === parseInt(midiObj.value) || Triggers[i].value === '*') {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i])
								}
							}
							break
						case 'pressure':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].value) === parseInt(midiObj.value) || Triggers[i].value === '*') {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i])
								}
							}
							break
						case 'pitchbend':
							if (parseInt(Triggers[i].channel) === parseInt(midiObj.channel) || Triggers[i].channel === '*') {
								if (parseInt(Triggers[i].value) === parseInt(midiObj.value) || Triggers[i].value === '*') {
									//trigger is a match, run the trigger
									setTimeout(runMIDITrigger, 1, Triggers[i])
								}
							}
							break
						case 'sysex':
							if (Triggers[i].message === midiObj.message) {
								setTimeout(runMIDITrigger, 1, Triggers[i])
							}
							break
						default:
							break
					}
				}
			}
		}
	}
}

function runMIDITrigger(midiTriggerObj) {
	switch (midiTriggerObj.actiontype) {
		case 'http':
			runMIDITrigger_HTTP(midiTriggerObj)
			break
		default:
			break
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
						console.log(body)
					} else {
						console.log(error)
						console.log(response)
						console.log(body)
					}
				},
			)
		} catch (error) {}
	} else {
		http
			.get(midiTriggerObj.url, (resp) => {
				let data = ''

				resp.on('data', (chunk) => {
					data += chunk
				})

				resp.on('end', () => {
					console.log(data)
				})
			})
			.on('error', (err) => {
				console.log('Error: ' + err.message)
			})
	}
}

function uuidv4() {
	//unique UUID generator for IDs
	return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

function isHex(h) {
	let a = parseInt(h, 16)
	return a.toString(16) === h.toLowerCase()
}

function addTrigger(triggerObj) {
	//add the Trigger to the array
	triggerObj.id = 'trigger-' + uuidv4()

	switch (triggerObj.midicommand) {
		case 'noteon':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.velocity)) {
				if (triggerObj.velocity !== '*') {
					triggerObj.velocity = 1
				}
			}
			break
		case 'noteoff':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.velocity)) {
				if (triggerObj.velocity !== '*') {
					triggerObj.velocity = 0
				}
			}
			break
		case 'aftertouch':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'cc':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.controller)) {
				triggerObj.controller = 21
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pc':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pressure':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pitchbend':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				triggerObj.value = 0
			}
			break
		case 'sysex':
			let msgArray = triggerObj.message.replace(' ', ',').split(',')
			triggerObj.message = ''
			for (let i = 0; i < msgArray.length; i++) {
				if (isHex(msgArray[i])) {
					//convert hex to dec
					triggerObj.message += parseInt(msgArray[i], 16)
				} else {
					//assume dec
					triggerObj.message += parseInt(msgArray[i])
				}
				if (i < msgArray - 1) {
					triggerObj.message += ','
				}
			}
			break
		default:
			break
	}

	let Triggers = config.get('triggers')
	Triggers.push(triggerObj)
	config.set('triggers', Triggers)

	if (triggerObj.midiport) {
		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === triggerObj.midiport) {
				if (!global.MIDI_INPUTS[i].opened) {
					OpenPort(triggerObj.midiport)
				}
			}
		}
	}
}

function updateTrigger(triggerObj) {
	//update the Trigger in the array
	let Triggers = config.get('triggers')

	switch (triggerObj.midicommand) {
		case 'noteon':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.velocity)) {
				if (triggerObj.velocity !== '*') {
					triggerObj.velocity = 1
				}
			}
			break
		case 'noteoff':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.velocity)) {
				if (triggerObj.velocity !== '*') {
					triggerObj.velocity = 0
				}
			}
			break
		case 'aftertouch':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.note)) {
				triggerObj.note = 21
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'cc':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.controller)) {
				triggerObj.controller = 21
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pc':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pressure':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				if (triggerObj.value !== '*') {
					triggerObj.value = 0
				}
			}
			break
		case 'pitchbend':
			if (!Number.isInteger(triggerObj.channel)) {
				if (triggerObj.channel !== '*') {
					triggerObj.channel = 0
				}
			}
			if (!Number.isInteger(triggerObj.value)) {
				triggerObj.value = 0
			}
			break
		case 'sysex':
			let msgArray = triggerObj.message.replace(' ', ',').split(',')
			triggerObj.message = ''
			for (let i = 0; i < msgArray.length; i++) {
				if (isHex(msgArray[i])) {
					//convert hex to dec
					triggerObj.message += parseInt(msgArray[i], 16)
				} else {
					//assume dec
					triggerObj.message += parseInt(msgArray[i])
				}
				if (i < msgArray - 1) {
					triggerObj.message += ','
				}
			}
			break
		default:
			break
	}

	let tempTriggers = []
	tempTriggers.push(triggerObj)
	Triggers = Triggers.map((obj) => tempTriggers.find((o) => o.id === obj.id) || obj)

	if (triggerObj.midiport) {
		for (let i = 0; i < global.MIDI_INPUTS.length; i++) {
			if (global.MIDI_INPUTS[i].name === triggerObj.midiport) {
				if (!global.MIDI_INPUTS[i].opened) {
					OpenPort(triggerObj.midiport)
				}
			}
		}
	}

	config.set('triggers', Triggers)
}

function deleteTrigger(triggerID) {
	//delete the specified trigger from the array
	let Triggers = config.get('triggers')
	Triggers.find((o, i) => {
		if (o.id === triggerID) {
			Triggers.splice(i, 1)
		}
	})

	config.set('triggers', Triggers)
}

function toggleInputDisabled(inputId) {
	let disabledInputs = config.get('disabledInputs')
	const wasDisabled = disabledInputs.includes(inputId)

	//get name from id
	const input = global.MIDI_INPUTS.find((p) => p.id === inputId)
	if (!input) {
		console.warn(`MIDI Input with ID ${inputId} not found.`)
		return
	}
	const inputName = input.name

	// Toggle state
	if (wasDisabled) {
		disabledInputs = disabledInputs.filter((id) => id !== inputId)
	} else {
		disabledInputs.push(inputId)
	}

	config.set('disabledInputs', disabledInputs)

	// Close the port if it's now disabled
	if (!wasDisabled) {
		const disabledInput = global.MIDI_INPUTS.find((p) => p.id === inputId && p.opened)
		if (disabledInput) {
			const input = inputMap.get(disabledInput.name)
			if (input && typeof input.closePort === 'function') {
				try {
					input.closePort()
					inputMap.delete(disabledInput.name)
					disabledInput.opened = false
				} catch (err) {
					console.warn(`Error closing MIDI port ${disabledInput.name}:`, err)
				}
			}
		}
	}

	// Show notification
	notifications.showNotification({
		title: `MIDI Input ${wasDisabled ? 'Enabled' : 'Disabled'}`,
		body: `MIDI Input ${inputName} ${wasDisabled ? 'enabled' : 'disabled'}`,
		showNotification: true,
	})

	// Refresh will attempt to open any now-enabled ports
	refreshPorts()
}

function isInputDisabled(inputId) {
	return config.get('disabledInputs').includes(inputId)
}

module.exports = {
	startMIDI() {
		createVirtualMIDIPort()
		GetPorts(true)
	},

	sendMIDI(midiObj, callback) {
		sendMIDI(midiObj, callback)
	},

	refreshPorts() {
		refreshPorts()
	},

	addTrigger(triggerObj) {
		addTrigger(triggerObj)
	},

	updateTrigger(triggerObj) {
		updateTrigger(triggerObj)
	},

	deleteTrigger(triggerId) {
		deleteTrigger(triggerId)
	},

	toggleInputDisabled(inputId) {
		toggleInputDisabled(inputId)
	},

	isInputDisabled(inputId) {
		return isInputDisabled(inputId)
	},
}
