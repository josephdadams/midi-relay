const { Notification, nativeImage } = require('electron')

const config = require('./config.js')

function showNotification(notificationObj) {
	const icon = nativeImage.createFromDataURL(config.get('icon'))

	if (config.get('allowNotifications') || notificationObj.showNotification == true) {
		let NOTIFICATION_TITLE = notificationObj.title || 'midi-relay Notification'
		let NOTIFICATION_BODY = notificationObj.body || ''
		new Notification({
			title: NOTIFICATION_TITLE,
			subtitle: NOTIFICATION_BODY,
			icon: icon,
			silent: true,
		}).show()
	}
}

module.exports = {
	showNotification(notificationObj) {
		showNotification(notificationObj)
	},
}
