// notifications.js
const { Notification, nativeImage } = require('electron')
const path = require('path')
const config = require('./config.js')

// simple 1s rate limiter per title
const lastShown = new Map()
const RATE_LIMIT_MS = 1000

function getIcon() {
  try {
    const dataUrl = config.get('icon')
    if (dataUrl) {
      const img = nativeImage.createFromDataURL(dataUrl)
      if (!img.isEmpty()) return img
    }
  } catch {}
  // fallback to packaged icon
  try {
    const fallback = nativeImage.createFromPath(path.join(__dirname, 'static', 'icon.png'))
    if (!fallback.isEmpty()) return fallback
  } catch {}
  return undefined
}

function isHeadlessLinux() {
  return process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY
}

function showNotification(notificationObj = {}) {
  const allow = config.get('allowNotifications') || notificationObj.showNotification === true
  if (!allow) return

  const title = String(notificationObj.title || 'midi-relay')
  const body = String(notificationObj.body || '')

  // headless or unsupported -> log instead of throwing
  if (isHeadlessLinux() || !Notification.isSupported()) {
    console.log(`NOTIFY: ${title} — ${body}`)
    return
  }

  // rate limit by title
  const now = Date.now()
  const last = lastShown.get(title) || 0
  if (now - last < RATE_LIMIT_MS) return
  lastShown.set(title, now)

  const options = {
    title,
    body,               // used on Win/Linux
    icon: getIcon(),
    silent: true,
  }

  // keep subtitle for macOS (ignored elsewhere)
  if (process.platform === 'darwin' && body) {
    options.subtitle = body
  }

  try {
    new Notification(options).show()
  } catch (err) {
    // as a last resort, log
    console.warn('Notification failed, logging instead:', err)
    console.log(`NOTIFY: ${title} — ${body}`)
  }
}

module.exports = { showNotification }