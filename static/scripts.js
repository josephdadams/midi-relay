const toggleSwitch = document.getElementById('chkLightDarkMode');
const toggleIcon = document.getElementById('toggle-icon');

const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

let availableTriggers = [];

function toggleDarkLightMode(mode) {
 	// Change icon
  mode === DARK_THEME
    ? toggleIcon.children[1].classList.replace('fa-sun', 'fa-moon')
    : toggleIcon.children[1].classList.replace('fa-moon', 'fa-sun');
}

// Switch Theme Dynamically
function switchTheme(event) {
  if (event.target.checked) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    toggleDarkLightMode(DARK_THEME);
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    toggleDarkLightMode(LIGHT_THEME);
  }
}

// Event Listeners
toggleSwitch.addEventListener('change', switchTheme);

// Check Local Storage For Theme
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (currentTheme === 'dark') {
    toggleSwitch.checked = true;
    toggleDarkLightMode(DARK_THEME);
  }
}

const socket = io();

function onLoad() {

	socket.on('connect', function() {
		// Connected
		loadSettings();
	});

	socket.on('midi_inputs', function(data) {
		MIDI_INPUTS = data;

		let selectMIDIPort = document.getElementById('selectMIDIPort');

		function removeOptions(selectElement) {
			var i, L = selectElement.options.length - 1;
			for(i = L; i >= 0; i--) {
			   selectElement.remove(i);
			}
		 }
		 
		 // using the function:
		 removeOptions(selectMIDIPort);

		let el = document.createElement('option');
		el.textContent = '(Choose a Type)';
		el.value = "";
		selectMIDIPort.appendChild(el);

		for (let i = 0; i < data.length; i++)
		{	
			let opt = data[i];
			let el = document.createElement('option');
			el.textContent = opt.name;
			el.value = opt.name;
			selectMIDIPort.appendChild(el);
		}
	});

	socket.on('triggers', function(triggers) {
		availableTriggers = triggers;
		let divTriggers = document.getElementById('divTriggers');
	
		let tableTriggers = document.createElement('table');
		tableTriggers.setAttribute("id", "triggersTable")

		divTriggers.innerHTML = '';
		
		let trHeader = document.createElement('tr');
		let tdHeaderMIDIPort = document.createElement('td');
		tdHeaderMIDIPort.innerHTML = '<b>MIDI In Port</b>';
		trHeader.appendChild(tdHeaderMIDIPort);
		let tdHeaderMIDICommand = document.createElement('td');
		tdHeaderMIDICommand.innerHTML = '<b>Command</b>';
		trHeader.appendChild(tdHeaderMIDICommand);
		let tdHeaderMIDIData = document.createElement('td');
		tdHeaderMIDIData.innerHTML = '<b>Data</b>';
		trHeader.appendChild(tdHeaderMIDIData);
		let tdHeaderMIDIDescription = document.createElement('td');
		tdHeaderMIDIDescription.innerHTML = '<b>Description</b>';
		trHeader.appendChild(tdHeaderMIDIDescription);
		let tdHeaderEditButton = document.createElement('td');
		trHeader.appendChild(tdHeaderEditButton);
		let tdHeaderDeleteButton = document.createElement('td');
		trHeader.appendChild(tdHeaderDeleteButton);
		
		tableTriggers.appendChild(trHeader);

		if (!triggers.length) {
			let trTrigger = document.createElement('tr');
			let td = document.createElement('td');
			td.setAttribute("colspan", 4)
			td.setAttribute("align", "center")
			td.innerHTML = 'No Triggers Available';
			td.className = 'borderTop';
			trTrigger.appendChild(td);
			tableTriggers.appendChild(trTrigger);
		}

		for (let i = 0; i < triggers.length; i++)
		{
			let trTrigger = document.createElement('tr');
			
			/*let tdTriggerID = document.createElement('td');
			tdTriggerID.innerHTML = data[i].id;
			trTrigger.appendChild(tdTriggerID);*/
			
			let tdTriggerMIDIPort = document.createElement('td');
			tdTriggerMIDIPort.innerHTML = triggers[i].midiport;
			tdTriggerMIDIPort.className = 'borderTop';
			trTrigger.appendChild(tdTriggerMIDIPort);
			
			let tdTriggerMIDICommand = document.createElement('td');
			tdTriggerMIDICommand.innerHTML = triggers[i].midicommand;
			tdTriggerMIDICommand.style.textAlign = 'center';
			tdTriggerMIDICommand.className = 'borderTop';
			trTrigger.appendChild(tdTriggerMIDICommand);
			
			let tdTriggerMIDIData = document.createElement('td');
			tdTriggerMIDIData.className = 'borderTop';
			
			let spanTriggerMIDIChannel, spanTriggerMIDINote, spanTriggerMIDIVelocity, spanTriggerMIDIController, spanTriggerMIDIValue, spanTriggerMIDISysExMessage;
			
			switch(triggers[i].midicommand) {
				case 'noteon':
				case 'noteoff':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
					
					spanTriggerMIDINote = document.createElement('span');
					spanTriggerMIDINote.innerHTML = 'Note: ' + triggers[i].note;
					spanTriggerMIDINote.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDINote);
					
					spanTriggerMIDIVelocity = document.createElement('span');
					spanTriggerMIDIVelocity.innerHTML = 'Velocity: ' + ((triggers[i].velocity === '*') ? '*' : parseInt(triggers[i].velocity));
					spanTriggerMIDIVelocity.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIVelocity);
					break;
				case 'aftertouch':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
					
					spanTriggerMIDINote = document.createElement('span');
					spanTriggerMIDINote.innerHTML = 'Note: ' + triggers[i].note;
					spanTriggerMIDINote.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDINote);
					
					spanTriggerMIDIValue = document.createElement('span');
					spanTriggerMIDIValue.innerHTML = 'Value: ' + ((triggers[i].value === '*') ? '*' : parseInt(triggers[i].value));
					spanTriggerMIDIValue.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIValue);
					break;
				case 'cc':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));	
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
					
					spanTriggerMIDIController = document.createElement('span');
					spanTriggerMIDIController.innerHTML = 'Controller: ' + ((triggers[i].controller === '*') ? '*' : parseInt(triggers[i].controller));
					spanTriggerMIDIController.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIController);
					
					spanTriggerMIDIValue = document.createElement('span');
					spanTriggerMIDIValue.innerHTML = 'Value: ' + ((triggers[i].value === '*') ? '*' : parseInt(triggers[i].value));
					spanTriggerMIDIValue.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIValue);
					break;
				case 'pc':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
													
					spanTriggerMIDIValue = document.createElement('span');
					spanTriggerMIDIValue.innerHTML = 'Value: ' + ((triggers[i].value === '*') ? '*' : parseInt(triggers[i].value));
					spanTriggerMIDIValue.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIValue);
					break;
				case 'pressure':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
					
					spanTriggerMIDIValue = document.createElement('span');
					spanTriggerMIDIValue.innerHTML = 'Value: ' + ((triggers[i].value === '*') ? '*' : parseInt(triggers[i].value));
					spanTriggerMIDIValue.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIValue);
					break;
				case 'pitchbend':
					spanTriggerMIDIChannel = document.createElement('span');
					spanTriggerMIDIChannel.innerHTML = 'Channel: ' + ((triggers[i].channel === '*') ? '*' : (parseInt(triggers[i].channel)+1));
					spanTriggerMIDIChannel.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIChannel);
													
					spanTriggerMIDIValue = document.createElement('span');
					spanTriggerMIDIValue.innerHTML = 'Value: ' + triggers[i].value;
					spanTriggerMIDIValue.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDIValue);
					break;
				case 'sysex':
					spanTriggerMIDISysExMessage = document.createElement('span');
					spanTriggerMIDISysExMessage.innerHTML = 'SysEx: ' + triggers[i].message;
					spanTriggerMIDISysExMessage.style.display = 'block';
					tdTriggerMIDIData.appendChild(spanTriggerMIDISysExMessage);
					break;
				default:
					break;
			}
			
			trTrigger.appendChild(tdTriggerMIDIData);
			
			let tdTriggerMIDIDescription = document.createElement('td');
			tdTriggerMIDIDescription.innerHTML = ((triggers[i].description) ? triggers[i].description : '');
			tdTriggerMIDIDescription.className = 'borderTop';
			trTrigger.appendChild(tdTriggerMIDIDescription);

			let tdBtnEditTrigger = document.createElement('td');
			tdBtnEditTrigger.className = 'borderTop';
			let btnEditTrigger = document.createElement('button');
			btnEditTrigger.innerHTML = 'Edit';
			btnEditTrigger.setAttribute('onclick', 'ShowEditTrigger(\'' + triggers[i].id + '\');');
			tdBtnEditTrigger.appendChild(btnEditTrigger);
			trTrigger.appendChild(tdBtnEditTrigger);
			
			let tdBtnDeleteTrigger = document.createElement('td');
			tdBtnDeleteTrigger.className = 'borderTop';
			let btnDeleteTrigger = document.createElement('button');
			btnDeleteTrigger.innerHTML = 'Delete';
			btnDeleteTrigger.setAttribute('onclick', 'DeleteTrigger(\'' + triggers[i].id + '\');');
			tdBtnDeleteTrigger.appendChild(btnDeleteTrigger);
			trTrigger.appendChild(tdBtnDeleteTrigger);
			
			tableTriggers.appendChild(trTrigger);
		}
		
		divTriggers.appendChild(tableTriggers);
	});

	socket.on('triggers_download', function(triggers) {
		let filename = 'midi-relay-triggers' + '_' + getFormattedTime();
		let type = 'text/plain;charset=UTF-8';

		download(JSON.stringify(triggers, null, 2), filename, type);
	});

	socket.on('disconnect', function() {
		console.log('disconnected');
	});
}

var selectedTriggerId = null;
var triggers = [];

var MIDI_INPUTS = [];
			
var MIDI_NOTES = [
	{id: 0, label: '0 - unassigned'},
	{id: 1, label: '1 - unassigned'},
	{id: 2, label: '2 - unassigned'},
	{id: 3, label: '3 - unassigned'},
	{id: 4, label: '4 - unassigned'},
	{id: 5, label: '5 - unassigned'},
	{id: 6, label: '6 - unassigned'},
	{id: 7, label: '7 - unassigned'},
	{id: 8, label: '8 - unassigned'},
	{id: 9, label: '9 - unassigned'},
	{id: 10, label: '10 - unassigned'},
	{id: 11, label: '11 - unassigned'},
	{id: 12, label: '12 - unassigned'},
	{id: 13, label: '13 - unassigned'},
	{id: 14, label: '14 - unassigned'},
	{id: 15, label: '15 - unassigned'},
	{id: 16, label: '16 - unassigned'},
	{id: 17, label: '17 - unassigned'},
	{id: 18, label: '18 - unassigned'},
	{id: 19, label: '19 - unassigned'},
	{id: 20, label: '20 - unassigned'},
	{id: 21, label: '21 - A0', selected: true},
	{id: 22, label: '22 - A#0'},
	{id: 23, label: '23 - B0'},
	{id: 24, label: '24 - C1'},
	{id: 25, label: '25 - C#1'},
	{id: 26, label: '26 - D1'},
	{id: 27, label: '27 - D#1'},
	{id: 28, label: '28 - E1'},
	{id: 29, label: '29 - F1'},
	{id: 30, label: '30 - F#1'},
	{id: 31, label: '31 - G1'},
	{id: 32, label: '32 - G#1'},
	{id: 33, label: '33 - A1'},
	{id: 34, label: '34 - A#1'},
	{id: 35, label: '35 - B1'},
	{id: 36, label: '36 - C2'},
	{id: 37, label: '37 - C#2'},
	{id: 38, label: '38 - D2'},
	{id: 39, label: '39 - D#2'},
	{id: 40, label: '40 - E2'},
	{id: 41, label: '41 - F2'},
	{id: 42, label: '42 - F#2'},
	{id: 43, label: '43 - G2'},
	{id: 44, label: '44 - G#2'},
	{id: 45, label: '45 - A2'},
	{id: 46, label: '46 - A#2'},
	{id: 47, label: '47 - B2'},
	{id: 48, label: '48 - C3'},
	{id: 49, label: '49 - C#3'},
	{id: 50, label: '50 - D3'},
	{id: 51, label: '51 - D#3'},
	{id: 52, label: '52 - E3'},
	{id: 53, label: '53 - F3'},
	{id: 54, label: '54 - F#3'},
	{id: 55, label: '55 - G3'},
	{id: 56, label: '56 - G#3'},
	{id: 57, label: '57 - A3'},
	{id: 58, label: '58 - A#3'},
	{id: 59, label: '59 - B3'},
	{id: 60, label: '60 - C4'},
	{id: 61, label: '61 - C#4'},
	{id: 62, label: '62 - D4'},
	{id: 63, label: '63 - D#4'},
	{id: 64, label: '64 - E4'},
	{id: 65, label: '65 - F4'},
	{id: 66, label: '66 - F#4'},
	{id: 67, label: '67 - G4'},
	{id: 68, label: '68 - G#4'},
	{id: 69, label: '69 - A4'},
	{id: 70, label: '70 - A#4'},
	{id: 71, label: '71 - B4'},
	{id: 72, label: '72 - C5'},
	{id: 73, label: '73 - C#5'},
	{id: 74, label: '74 - D5'},
	{id: 75, label: '75 - D#5'},
	{id: 76, label: '76 - E5'},
	{id: 77, label: '77 - F5'},
	{id: 78, label: '78 - F#5'},
	{id: 79, label: '79 - G5'},
	{id: 80, label: '80 - G#5'},
	{id: 81, label: '81 - A5'},
	{id: 82, label: '82 - A#5'},
	{id: 83, label: '83 - B5'},
	{id: 84, label: '84 - C6'},
	{id: 85, label: '85 - C#6'},
	{id: 86, label: '86 - D6'},
	{id: 87, label: '87 - D#6'},
	{id: 88, label: '88 - E6'},
	{id: 89, label: '89 - F6'},
	{id: 90, label: '90 - F#6'},
	{id: 91, label: '91 - G6'},
	{id: 92, label: '92 - G#6'},
	{id: 93, label: '93 - A6'},
	{id: 94, label: '94 - A#6'},
	{id: 95, label: '95 - B6'},
	{id: 96, label: '96 - C7'},
	{id: 97, label: '97 - C#7'},
	{id: 98, label: '98 - D7'},
	{id: 99, label: '99 - D#7'},
	{id: 100, label: '100 - E7'},
	{id: 101, label: '101 - F7'},
	{id: 102, label: '102 - F#7'},
	{id: 103, label: '103 - G7'},
	{id: 104, label: '104 - G#7'},
	{id: 105, label: '105 - A7'},
	{id: 106, label: '106 - A#7'},
	{id: 107, label: '107 - B7'},
	{id: 108, label: '108 - C8'},
	{id: 109, label: '109 - C#8'},
	{id: 110, label: '110 - D8'},
	{id: 111, label: '111 - D#8'},
	{id: 112, label: '112 - E8'},
	{id: 113, label: '113 - F8'},
	{id: 114, label: '114 - F#8'},
	{id: 115, label: '115 - G8'},
	{id: 116, label: '116 - G#8'},
	{id: 117, label: '117 - A8'},
	{id: 118, label: '118 - A#8'},
	{id: 119, label: '119 - B8'},
	{id: 120, label: '120 - C9'},
	{id: 121, label: '121 - C#9'},
	{id: 122, label: '122 - D9'},
	{id: 123, label: '123 - D#9'},
	{id: 124, label: '124 - E9'},
	{id: 125, label: '125 - F9'},
	{id: 126, label: '126 - F#9'},
	{id: 127, label: '127 - G9'}
];
			
var MIDI_CONTROLLERS = [
	{id: 0, label: '0 - Bank Select (MSB)'},
	{id: 1, label: '1 - Modulation Wheel (MSB)'},
	{id: 2, label: '2 - Breath Controler (MSB)'},
	{id: 3, label: '3 - Undefined (MSB)'},
	{id: 4, label: '4 - Foot Pedal (MSB)'},
	{id: 5, label: '5 - Portamento Time (MSB)'},
	{id: 6, label: '6 - Data Entry (MSB)'},
	{id: 7, label: '7 - Volume (MSB)'},
	{id: 8, label: '8 - Balance (MSB)'},
	{id: 9, label: '9 - Undefined (MSB)'},
	{id: 10, label: '10 - Pan (MSB)'},
	{id: 11, label: '11 - Expression (MSB)'},
	{id: 12, label: '12 - Effect Controller 1 (MSB)'},
	{id: 13, label: '13 - Effect Controller 2 (MSB)'},
	{id: 14, label: '14 - Undefined (MSB)'},
	{id: 15, label: '15 - Undefined (MSB)'},
	{id: 16, label: '16 - General Purpose (MSB)'},
	{id: 17, label: '17 - General Purpose (MSB)'},
	{id: 18, label: '18 - General Purpose (MSB)'},
	{id: 19, label: '19 - General Purpose (MSB)'},
	{id: 20, label: '20 - Undefined (MSB)'},
	{id: 21, label: '21 - Undefined (MSB)'},
	{id: 22, label: '22 - Undefined (MSB)'},
	{id: 23, label: '23 - Undefined (MSB)'},
	{id: 24, label: '24 - Undefined (MSB)'},
	{id: 25, label: '25 - Undefined (MSB)'},
	{id: 26, label: '26 - Undefined (MSB)'},
	{id: 27, label: '27 - Undefined (MSB)'},
	{id: 28, label: '28 - Undefined (MSB)'},
	{id: 29, label: '29 - Undefined (MSB)'},
	{id: 30, label: '30 - Undefined (MSB)'},
	{id: 31, label: '31 - Undefined (MSB)'},
	{id: 32, label: '32 - Bank Select (LSB)'},
	{id: 33, label: '33 - Modulation Wheel (LSB)'},
	{id: 34, label: '34 - Breath Controler (LSB)'},
	{id: 35, label: '35 - Undefined (LSB)'},
	{id: 36, label: '36 - Foot Pedal (LSB)'},
	{id: 37, label: '37 - Portamento Time (LSB)'},
	{id: 38, label: '38 - Data Entry (LSB)'},
	{id: 39, label: '39 - Volume (LSB)'},
	{id: 40, label: '40 - Balance (LSB)'},
	{id: 41, label: '41 - Undefined (LSB)'},
	{id: 42, label: '42 - Pan (LSB)'},
	{id: 43, label: '43 - Expression (LSB)'},
	{id: 44, label: '44 - Effect Controller 1 (LSB)'},
	{id: 45, label: '45 - Effect Controller 2 (LSB)'},
	{id: 46, label: '46 - Undefined (LSB)'},
	{id: 47, label: '47 - Undefined (LSB)'},
	{id: 48, label: '48 - General Purpose (LSB)'},
	{id: 49, label: '49 - General Purpose (LSB)'},
	{id: 50, label: '50 - General Purpose (LSB)'},
	{id: 51, label: '51 - General Purpose (LSB)'},
	{id: 52, label: '52 - Undefined (LSB)'},
	{id: 53, label: '53 - Undefined (LSB)'},
	{id: 54, label: '54 - Undefined (LSB)'},
	{id: 55, label: '55 - Undefined (LSB)'},
	{id: 56, label: '56 - Undefined (LSB)'},
	{id: 57, label: '57 - Undefined (LSB)'},
	{id: 58, label: '58 - Undefined (LSB)'},
	{id: 59, label: '59 - Undefined (LSB)'},
	{id: 60, label: '60 - Undefined (LSB)'},
	{id: 61, label: '61 - Undefined (LSB)'},
	{id: 62, label: '62 - Undefined (LSB)'},
	{id: 63, label: '63 - Undefined (LSB)'},
	{id: 64, label: '64 - Damper Pedal on/off'},
	{id: 65, label: '65 - Portamento on/off'},
	{id: 66, label: '66 - Sostenuto Pedal on/off'},
	{id: 67, label: '67 - Soft Pedal on/off'},
	{id: 68, label: '68 - Legato Pedal on/off'},
	{id: 69, label: '69 - Hold Pedal 2 on/off'},
	{id: 70, label: '70 - Sound Variation'},
	{id: 71, label: '71 - Sound Timbre'},
	{id: 72, label: '72 - Sound Release Time'},
	{id: 73, label: '73 - Sound Attack Time'},
	{id: 74, label: '74 - Sound Brightness'},
	{id: 75, label: '75 - Sound Control 6'},
	{id: 76, label: '76 - Sound Control 7'},
	{id: 77, label: '77 - Sound Control 8'},
	{id: 78, label: '78 - Sound Control 9'},
	{id: 79, label: '79 - Sound Control 10'},
	{id: 80, label: '80 - General Purpose Button'},
	{id: 81, label: '81 - General Purpose Button'},
	{id: 82, label: '82 - General Purpose Button'},
	{id: 83, label: '83 - General Purpose Button'},
	{id: 84, label: '84 - Undefined on/off'},
	{id: 85, label: '85 - Undefined on/off'},
	{id: 86, label: '86 - ndefined on/off'},
	{id: 87, label: '87 - Undefined on/off'},
	{id: 88, label: '88 - Undefined on/off'},
	{id: 89, label: '89 - Undefined on/off'},
	{id: 90, label: '90 - Undefined on/off'},
	{id: 91, label: '91 - Effects/Reverb Level'},
	{id: 92, label: '92 - Tremulo Level'},
	{id: 93, label: '93 - Chorus Level'},
	{id: 94, label: '94 - Celeste (Detune) Level'},
	{id: 95, label: '95 - Phaser Level'},
	{id: 96, label: '96 - Data Entry +1'},
	{id: 97, label: '97 - Data Entry -1'},
	{id: 98, label: '98 - NRPN (MSB)'},
	{id: 99, label: '99 - NRPN (LSB)'},
	{id: 100, label: '100 - RPN (MSB)'},
	{id: 101, label: '101 - RPN (LSB)'},
	{id: 102, label: '102 - Undefined'},
	{id: 103, label: '103 - Undefined'},
	{id: 104, label: '104 - Undefined'},
	{id: 105, label: '105 - Undefined'},
	{id: 106, label: '106 - Undefined'},
	{id: 107, label: '107 - Undefined'},
	{id: 108, label: '108 - Undefined'},
	{id: 109, label: '109 - Undefined'},
	{id: 110, label: '110 - Undefined'},
	{id: 111, label: '111 - Undefined'},
	{id: 112, label: '112 - Undefined'},
	{id: 113, label: '113 - Undefined'},
	{id: 114, label: '114 - Undefined'},
	{id: 115, label: '115 - Undefined'},
	{id: 116, label: '116 - Undefined'},
	{id: 117, label: '117 - Undefined'},
	{id: 118, label: '118 - Undefined'},
	{id: 119, label: '119 - Undefined'},
	{id: 120, label: '120 - All Sound Off'},
	{id: 121, label: '121 - Reset All Controllers'},
	{id: 122, label: '122 - Local Switch on/off'},
	{id: 123, label: '123 - All Notes Off'},
	{id: 124, label: '124 - Omni Mode Off'},
	{id: 125, label: '125 - Omni Mode On'},
	{id: 126, label: '126 - Monophonic Mode On'},
	{id: 127, label: '127 - Polyphonic Mode On'}
];
			
function loadSettings() {
	//gets the latest list of MIDI Ports from the API
	getMIDIInputs();
	getTriggers();
	
	populateDropdowns();
}
			
function getMIDIInputs() {
	socket.emit('getMidiInputs');
}

function getTriggers() {
	socket.emit('getTriggers');
}

function populateDropdowns() {
	let selectMIDIChannel = document.getElementById('selectMIDIChannel');
	let selectMIDINote = document.getElementById('selectMIDINote');
	let selectMIDIVelocity = document.getElementById('selectMIDIVelocity');
	let selectMIDIController = document.getElementById('selectMIDIController');
	let selectMIDIValue = document.getElementById('selectMIDIValue');
	
	//build MIDI Channels list
	let el = document.createElement('option');
	el.textContent = '*';
	el.value = '*';
	selectMIDIChannel.appendChild(el.cloneNode(true));
	
	for (let i = 1; i <= 16; i++) {
		let el = document.createElement('option');
		el.textContent = i;
		el.value = i-1;
		selectMIDIChannel.appendChild(el.cloneNode(true));
	}
	
	//build MIDI Notes list
	for(let i = 0; i < MIDI_NOTES.length; i++) {
		let opt = MIDI_NOTES[i];
		let el = document.createElement('option');
		el.textContent = opt.label;
		el.value = opt.id;
		if (opt.selected) {
			el.defaultSelected = true;
		}
		selectMIDINote.appendChild(el.cloneNode(true));
	}

	//build MIDI Velocity and Value list
	el = document.createElement('option');
	el.textContent = '*';
	el.value = '*';
	selectMIDIVelocity.appendChild(el.cloneNode(true));
	selectMIDIValue.appendChild(el.cloneNode(true));
	
	for (let i = 0; i <= 127; i++) {
		let el = document.createElement('option');
		el.textContent = i;
		el.value = i;
		selectMIDIVelocity.appendChild(el.cloneNode(true));
		selectMIDIValue.appendChild(el.cloneNode(true));
	}
	
	//build MIDI Controller list
	for(var i = 0; i < MIDI_CONTROLLERS.length; i++) {
		var opt = MIDI_CONTROLLERS[i];
		let el = document.createElement('option');
		el.textContent = opt.label;
		el.value = opt.id;
		selectMIDIController.appendChild(el.cloneNode(true));
	}
}

function DeleteTrigger(triggerID) {
	socket.emit('trigger_delete', triggerID);

	getTriggers();
}
			
function ShowAddTrigger() {
	formReset();
	let btnShowAddTrigger = document.getElementById('btnShowAddTrigger');
	btnShowAddTrigger.style.display = 'none';
	
	let divTriggerFields = document.getElementById('divTriggerFields');
	divTriggerFields.style.display = 'block';

	let btnAddTrigger = document.getElementById('btnAddTrigger');
	btnAddTrigger.style.display = 'inline-block';

	let btnEditTrigger = document.getElementById('btnEditTrigger');
	btnEditTrigger.style.display = 'none';
}

function ShowEditTrigger(id) {
	selectedTriggerId = id;
	triggers = availableTriggers;
	for (let i = 0; i < triggers.length; i++) {
		if (triggers[i].id === id) {
			let selectMIDIPort = document.getElementById('selectMIDIPort');
			let selectMIDIMessageType = document.getElementById('selectMIDIMessageType');
			let selectMIDIChannel = document.getElementById('selectMIDIChannel');
			let selectMIDINote = document.getElementById('selectMIDINote');
			let selectMIDIVelocity = document.getElementById('selectMIDIVelocity');
			let selectMIDIValue = document.getElementById('selectMIDIValue');
			let selectMIDIController = document.getElementById('selectMIDIController');
			let inputMIDIPitchBendValue = document.getElementById('inputMIDIPitchBendValue');
			let inputMIDISysExMessage = document.getElementById('inputMIDISysExMessage');

			let selectActionType = document.getElementById('selectActionType');

			selectMIDIPort.options[0].selected = true;
			for (let j = 0; j < selectMIDIPort.options.length; j++){
				if (selectMIDIPort.options[j].value === triggers[i].midiport){
					selectMIDIPort.options[j].selected = true;
					break;
				}
			}

			for (let j = 0; j < selectMIDIMessageType.options.length; j++){
				if (selectMIDIMessageType.options[j].value === triggers[i].midicommand){
					selectMIDIMessageType.options[j].selected = true;
					break;
				}
			}

			showMIDIMessageOptions();

			switch(triggers[i].midicommand) {
				case 'noteon':
				case 'noteoff':
				for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDINote.options.length; j++){
						if (selectMIDINote.options[j].value === triggers[i].note.toString()){
							selectMIDINote.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIVelocity.options.length; j++){
						if (selectMIDIVelocity.options[j].value === triggers[i].velocity.toString()){
							selectMIDIVelocity.options[j].selected = true;
							break;
						}
					}
					break;
				case 'aftertouch':
					for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDINote.options.length; j++){
						if (selectMIDINote.options[j].value === triggers[i].note.toString()){
							selectMIDINote.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIValue.options.length; j++){
						if (selectMIDIValue.options[j].value == triggers[i].value.toString()){
							selectMIDIValue.options[j].selected = true;
							break;
						}
					}
					break;
				case 'cc':
					for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIController.options.length; j++){
						if (selectMIDIController.options[j].value == triggers[i].controller.toString()){
							selectMIDIController.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIValue.options.length; j++){
						if (selectMIDIValue.options[j].value == triggers[i].value.toString()){
							selectMIDIValue.options[j].selected = true;
							break;
						}
					}
					break;
				case 'pc':
					for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIValue.options.length; j++){
						if (selectMIDIValue.options[j].value == triggers[i].value.toString()){
							selectMIDIValue.options[j].selected = true;
							break;
						}
					}
					break;
				case 'pressure':
					for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					for (let j = 0; j < selectMIDIValue.options.length; j++){
						if (selectMIDIValue.options[j].value == triggers[i].value.toString()){
							selectMIDIValue.options[j].selected = true;
							break;
						}
					}
					break;
				case 'pitchbend':
					for (let j = 0; j < selectMIDIChannel.options.length; j++){
						if (selectMIDIChannel.options[j].value === triggers[i].channel.toString()){
							selectMIDIChannel.options[j].selected = true;
							break;
						}
					}
					inputMIDIPitchBendValue.value = triggers[i].value;
					break;
				case 'sysex':
					inputMIDISysExMessage.value = triggers[i].message;
					break;
			}

			for (let j = 0; j < selectActionType.options.length; j++){
				if (selectActionType.options[j].value == triggers[i].actiontype.toString()){
					selectActionType.options[j].selected = true;
					break;
				}
			}

			switch(triggers[i].actiontype) {
				case 'http':
					document.getElementById('txtURL').value = triggers[i].url;
					if (triggers[i].jsondata) {
						document.getElementById('txtJSONData').value = triggers[i].jsondata;
					}
					break;
				case 'applescript':
					document.getElementById('txtAppleScript').value = triggers[i].applescript;
					break;
				case 'shellscript':
					document.getElementById('txtShellScript').value = triggers[i].shellscript;
					break;
				default:
					break;
			}

			document.getElementById('txtDescription').value = triggers[i].description;

			showActionTypeOptions();

			break;
		}
	}

	let btnShowAddTrigger = document.getElementById('btnShowAddTrigger');
	btnShowAddTrigger.style.display = 'none';
	
	let divTriggerFields = document.getElementById('divTriggerFields');
	divTriggerFields.style.display = 'block';

	let btnAddTrigger = document.getElementById('btnAddTrigger');
	btnAddTrigger.style.display = 'none';

	let btnEditTrigger = document.getElementById('btnEditTrigger');
	btnEditTrigger.style.display = 'inline-block';
}

function showMIDIMessageOptions() {
	let selectMIDIMessageType = document.getElementById('selectMIDIMessageType');
	let midiCommand = selectMIDIMessageType.options[selectMIDIMessageType.selectedIndex].value;
	
	switch(midiCommand) {
		case 'noteon':
		case 'noteoff':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'aftertouch':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'cc':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'pc':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'pressure':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'pitchbend':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'block';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
		case 'sysex':
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'block';
			break;
		default:
			document.getElementById('divMIDIMessage_Options_Channel').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Note').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Velocity').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Controller').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_PitchBend_Value').style.display = 'none';
			document.getElementById('divMIDIMessage_Options_SysExMessage').style.display = 'none';
			break;
	}
}

function showActionTypeOptions() {
	let selectActionType = document.getElementById('selectActionType');
	let actionType = selectActionType.options[selectActionType.selectedIndex].value;
	
	switch(actionType) {
		case 'http':
			document.getElementById('divMIDIMessage_ActionType_HTTP').style.display = 'block';
			break;
		default:
			document.getElementById('divMIDIMessage_ActionType_HTTP').style.display = 'none';
			document.getElementById('divMIDIMessage_ActionType_AppleScript').style.display = 'none';
			document.getElementById('divMIDIMessage_ActionType_ShellScript').style.display = 'none';
			break;
	}
}

function AddTrigger() {			
	let selectMIDIPort = document.getElementById('selectMIDIPort');
	
	let selectActionType = document.getElementById('selectActionType');
				
	let selectMIDIMessageType = document.getElementById('selectMIDIMessageType');
	let midiCommand = selectMIDIMessageType.options[selectMIDIMessageType.selectedIndex].value;
	
	let selectMIDIChannel = document.getElementById('selectMIDIChannel');
	let selectMIDINote = document.getElementById('selectMIDINote');
	let selectMIDIVelocity = document.getElementById('selectMIDIVelocity');
	let selectMIDIValue = document.getElementById('selectMIDIValue');
	let selectMIDIController = document.getElementById('selectMIDIController');
	let inputMIDISysExMessage = document.getElementById('inputMIDISysExMessage');
	
	let triggerObj = {};
	
	triggerObj.midiport = selectMIDIPort.options[selectMIDIPort.selectedIndex].value;
	
	triggerObj.midicommand = selectMIDIMessageType.options[selectMIDIMessageType.selectedIndex].value;
	
	let channelValue, parsedChannelValue, velocityValue, parsedVelocityValue, controllerValue, parsedControllerValue, value, parsedValue;
	
	switch (midiCommand) {
		case 'noteon':
		case 'noteoff':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			triggerObj.note = parseInt(selectMIDINote.options[selectMIDINote.selectedIndex].value);

			velocityValue = selectMIDIVelocity.options[selectMIDIVelocity.selectedIndex].value;
			parsedVelocityValue = ((velocityValue === '*') ? '*' : parseInt(velocityValue));
			triggerObj.velocity = parsedVelocityValue;
			break;
		case 'aftertouch':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			triggerObj.note = parseInt(selectMIDINote.options[selectMIDINote.selectedIndex].value);

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'cc':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			controllerValue = selectMIDIController.options[selectMIDIController.selectedIndex].value;
			parsedControllerValue = ((controllerValue === '*') ? '*' : parseInt(controllerValue));
			triggerObj.controller = parsedControllerValue;

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pc':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pressure':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pitchbend':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			value = inputMIDIPitchBendValue.value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			if (parsedValue !== '*') {
				if ((parsedValue < 0) || (parsedValue > 16383)) {
					alert('Invalid Pitch Bend range. Must be between 0 and 16383.');
					return false;
				}
			}
			triggerObj.value = parsedValue;
			break;
		case 'sysex':
			triggerObj.message = inputMIDISysExMessage.value;
			break;
		default:
			alert('Invalid MIDI Command Type.');
			return false;
			break;
	}
	
	triggerObj.actiontype = selectActionType.options[selectActionType.selectedIndex].value;
	
	switch(triggerObj.actiontype) {
		case 'http':
			triggerObj.url = document.getElementById('txtURL').value;
			if (document.getElementById('txtJSONData').value !== '') {
				let jsonData = document.getElementById('txtJSONData').value;
				try {
					let jsonData_parsed = JSON.parse(jsonData);
					triggerObj.jsondata = JSON.stringify(jsonData_parsed);	
				}
				catch (error) {
					alert('The JSON you entered is not valid.');
					return false;
				}
			}
			break;
		case 'applescript':
			triggerObj.applescript = document.getElementById('txtAppleScript').value;
			break;
		case 'shellscript':
			triggerObj.shellscript = document.getElementById('txtShellScript').value;
			break;
		default:
			break;
	}
	
	triggerObj.description = document.getElementById('txtDescription').value;

	socket.emit('trigger_add', triggerObj);
	
	let btnShowAddTrigger = document.getElementById('btnShowAddTrigger');
	btnShowAddTrigger.style.display = 'block';

	let divTriggerFields = document.getElementById('divTriggerFields');
	divTriggerFields.style.display = 'none';
	
	getTriggers();
}

function EditTrigger() {
	let selectMIDIPort = document.getElementById('selectMIDIPort');
	
	let selectActionType = document.getElementById('selectActionType');
				
	let selectMIDIMessageType = document.getElementById('selectMIDIMessageType');
	let midiCommand = selectMIDIMessageType.options[selectMIDIMessageType.selectedIndex].value;
	
	let selectMIDIChannel = document.getElementById('selectMIDIChannel');
	let selectMIDINote = document.getElementById('selectMIDINote');
	let selectMIDIVelocity = document.getElementById('selectMIDIVelocity');
	let selectMIDIValue = document.getElementById('selectMIDIValue');
	let selectMIDIController = document.getElementById('selectMIDIController');
	let inputMIDISysExMessage = document.getElementById('inputMIDISysExMessage');
	
	let triggerObj = {};

	triggerObj.id = selectedTriggerId;
	
	triggerObj.midiport = selectMIDIPort.options[selectMIDIPort.selectedIndex].value;
	
	triggerObj.midicommand = selectMIDIMessageType.options[selectMIDIMessageType.selectedIndex].value;
	
	let channelValue, parsedChannelValue, velocityValue, parsedVelocityValue, controllerValue, parsedControllerValue, value, parsedValue;
	
	switch (midiCommand) {
		case 'noteon':
		case 'noteoff':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			triggerObj.note = parseInt(selectMIDINote.options[selectMIDINote.selectedIndex].value);

			velocityValue = selectMIDIVelocity.options[selectMIDIVelocity.selectedIndex].value;
			parsedVelocityValue = ((velocityValue === '*') ? '*' : parseInt(velocityValue));
			triggerObj.velocity = parsedVelocityValue;
			break;
		case 'aftertouch':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			triggerObj.note = parseInt(selectMIDINote.options[selectMIDINote.selectedIndex].value);

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'cc':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			controllerValue = selectMIDIController.options[selectMIDIController.selectedIndex].value;
			parsedControllerValue = ((controllerValue === '*') ? '*' : parseInt(controllerValue));
			triggerObj.controller = parsedControllerValue;

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pc':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pressure':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;

			value = selectMIDIValue.options[selectMIDIValue.selectedIndex].value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			triggerObj.value = parsedValue;
			break;
		case 'pitchbend':
			channelValue = selectMIDIChannel.options[selectMIDIChannel.selectedIndex].value;
			parsedChannelValue = ((channelValue === '*') ? '*' : parseInt(channelValue));
			triggerObj.channel = parsedChannelValue;
			
			value = inputMIDIPitchBendValue.value;
			parsedValue = ((value === '*') ? '*' : parseInt(value));
			if (parsedValue !== '*') {
				if ((parsedValue < 0) || (parsedValue > 16383)) {
					alert('Invalid Pitch Bend range. Must be between 0 and 16383.');
					return false;
				}
			}
			triggerObj.value = parsedValue;
			break;
		case 'sysex':
			triggerObj.message = inputMIDISysExMessage.value;
			break;
		default:
			break;
	}
	
	triggerObj.actiontype = selectActionType.options[selectActionType.selectedIndex].value;
	
	switch(triggerObj.actiontype) {
		case 'http':
			triggerObj.url = document.getElementById('txtURL').value;
			if (document.getElementById('txtJSONData').value !== '') {
				let jsonData = document.getElementById('txtJSONData').value;
				try {
					let jsonData_parsed = JSON.parse(jsonData);
					triggerObj.jsondata = JSON.stringify(jsonData_parsed);	
				}
				catch (error) {
					alert('The JSON you entered is not valid.');
					return false;
				}
			}
			break;
		case 'applescript':
			triggerObj.applescript = document.getElementById('txtAppleScript').value;
			break;
		case 'shellscript':
			triggerObj.shellscript = document.getElementById('txtShellScript').value;
			break;
		default:
			break;
	}
	
	triggerObj.description = document.getElementById('txtDescription').value;

	socket.emit('trigger_update', triggerObj);
	
	let btnShowAddTrigger = document.getElementById('btnShowAddTrigger');
	btnShowAddTrigger.style.display = 'block';

	let divTriggerFields = document.getElementById('divTriggerFields');
	divTriggerFields.style.display = 'none';
	
	getTriggers();
}

function Cancel() {
	let btnShowAddTrigger = document.getElementById('btnShowAddTrigger');
	btnShowAddTrigger.style.display = 'block';

	let divTriggerFields = document.getElementById('divTriggerFields');
	divTriggerFields.style.display = 'none';
}

function getFormattedTime() {
	var today = new Date();
	var y = today.getFullYear();
	// JavaScript months are 0-based.
	var m = today.getMonth() + 1;
	var d = today.getDate();
	var h = today.getHours();
	var mi = today.getMinutes();
	var s = today.getSeconds();
	return y + "_" + m + "_" + d;
}

function export_triggers() {
	socket.emit('getTriggers_download');
}

function download(data, filename, type) {
	var file = new Blob([data], {type: type});
	if (window.navigator.msSaveOrOpenBlob) // IE10+
		window.navigator.msSaveOrOpenBlob(file, filename);
	else { // Others
		var a = document.createElement("a"),
				url = URL.createObjectURL(file);
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function() {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);  
		}, 0); 
	}
}

function import_triggers() {
	if (confirm('This will add all triggers in the provided file. New trigger IDs will be generated. Proceed?')) {
		let fr = new FileReader(); 
		fr.onload = function() { 
			try {
				let importTriggers = JSON.parse(fr.result);
				for (let i = 0; i < importTriggers.length; i++) {
					socket.emit('trigger_add', importTriggers[i]);
				}

				getTriggers();
			}
			catch (error) {
				alert('Invalid triggers file provided. See console for more information about this error.');
				console.log(error);
			}						
		} 
		
		try {
			fr.readAsText(document.getElementById('flImport').files[0]);
		}
		catch(error) {
			alert('No file or invalid file selected.');
		}
	}
}

function formReset() {
	let selectMIDIPort = document.getElementById('selectMIDIPort');
	let selectMIDIMessageType = document.getElementById('selectMIDIMessageType');
	let selectMIDIChannel = document.getElementById('selectMIDIChannel');
	let selectMIDINote = document.getElementById('selectMIDINote');
	let selectMIDIVelocity = document.getElementById('selectMIDIVelocity');
	let selectMIDIValue = document.getElementById('selectMIDIValue');
	let selectMIDIController = document.getElementById('selectMIDIController');
	let inputMIDIPitchBendValue = document.getElementById('inputMIDIPitchBendValue');
	let inputMIDISysExMessage = document.getElementById('inputMIDISysExMessage');

	let selectActionType = document.getElementById('selectActionType');

	selectMIDIPort.options[0].selected = true;
	selectMIDIMessageType.options[0].selected = true;
	showMIDIMessageOptions();
	selectMIDIChannel.options[0].selected = true;
	selectMIDINote.options[0].selected = true;
	selectMIDIVelocity.options[0].selected = true;
	selectMIDIController.options[0].selected = true;
	selectMIDIValue.options[0].selected = true;
	inputMIDIPitchBendValue.value = "";
	inputMIDISysExMessage.value = "";
	selectActionType.options[0].selected = true;
	document.getElementById('txtURL').value = "http://";		
	document.getElementById('txtJSONData').value = "";		
	document.getElementById('txtAppleScript').value = "";
	document.getElementById('txtShellScript').value = "";
	document.getElementById('txtDescription').value = "";
	document.getElementById('bitfocusCompanionInfoPanel').style.maxHeight = null

	showActionTypeOptions();
}

function showHideAccordion () {
	const el = document.getElementById("bitfocusCompanionHelpers")
	el.classList.toggle("active");
	const panel = el.nextElementSibling;
	if (panel.style.maxHeight) {
		panel.style.maxHeight = null;
	} else {
		panel.style.maxHeight = panel.scrollHeight + "px";
	}
}

function copyToClipboard (el) {
	const text = document.getElementById(el).innerHTML;
	if (navigator.clipboard) {
		navigator.clipboard.writeText(text);
		alert (`Text Copied: ${text}`);
	} else {
		alert('Cannot Copy Text')
	}
}