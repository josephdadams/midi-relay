// notifications.js
'use strict'

const path = require('path')
const config = require('./config.js')

let Notification = null
let nativeImage = null

// Only load Electron when running inside Electron
if (process.versions.electron) {
  const electron = require('electron')
  Notification = electron.Notification
  nativeImage = electron.nativeImage
}

// simple 1s rate limiter per title
const lastShown = new Map()
const RATE_LIMIT_MS = 1000

function getIcon() {
  if (!nativeImage) return undefined

  try {
    const dataUrl = config.get('icon')
    if (dataUrl) {
      const img = nativeImage.createFromDataURL(dataUrl)
      if (!img.isEmpty()) return img
    }
  } catch {}

  try {
    const fallback = nativeImage.createFromPath(
      path.join(__dirname, 'static', 'icon.png')
    )
    if (!fallback.isEmpty()) return fallback
  } catch {}

  return undefined
}

function isHeadlessLinux() {
  return (
    process.platform === 'linux' &&
    !process.env.DISPLAY &&
    !process.env.WAYLAND_DISPLAY
  )
}

function showNotification(notificationObj = {}) {
  const allow =
    config.get('allowNotifications') ||
    notificationObj.showNotification === true

  if (!allow) return

  const title = String(notificationObj.title || 'midi-relay')
  const body = String(notificationObj.body || '')

  // If not in Electron runtime, just log
  if (!Notification) {
    console.log(`NOTIFY: ${title} — ${body}`)
    return
  }

  // Headless or unsupported -> log instead of throwing
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
    body,
    icon: getIcon(),
    silent: true,
  }

  if (process.platform === 'darwin' && body) {
    options.subtitle = body
  }

  try {
    new Notification(options).show()
  } catch (err) {
    console.warn('Notification failed, logging instead:', err)
    console.log(`NOTIFY: ${title} — ${body}`)
  }
}

module.exports = { showNotification }