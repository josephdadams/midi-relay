const mdns = require('mdns-js');

var mdns_service = null; //mdns advertisement service variable
var mdns_browser = null; //mdns browser variable

function startMDNS() {
	mdns_service = mdns.createAdvertisement(mdns.tcp('midi-relay'), listenPort, {
		name:'midi-relay',
		txt:{
			txtvers:version
		}
	});
	
	mdns_service.start();
	
	mdns_browser = mdns.createBrowser(mdns.tcp('midi-relay'));

	mdns_browser.on('ready', function onReady() {
		mdns_browser.discover();
	});

	mdns_browser.on('update', function onUpdate(data) {
		for (let i = 0; i < data.type.length; i++) {
			if (data.type[i].name === 'midi-relay') {
				MDNS_AddHost(data.host, data.addresses[0], data.port);
			}	
		}
	});
}

function MDNS_AddHost(host, address, port) {
	// first check to see if it's already in the list, and don't add it if so
	let isFound = false;

	for (let i = 0; i < global.MDNS_HOSTS.length; i++) {
		if (global.MDNS_HOSTS[i].address === address) {
			isFound = true;
			global.MDNS_HOSTS[i].port = port;
			break;
		}
	}

	if (!isFound) {
		let mdnsObj = {};
		mdnsObj.name = host;
		mdnsObj.address = address;
		mdnsObj.port = port;
		global.MDNS_HOSTS.push(mdnsObj);
	}
}

module.exports = {
	startMDNS() {
		startMDNS();
	}
}