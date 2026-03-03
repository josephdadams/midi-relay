if (!process.versions.electron) {
  process.exit(0)
}

require('child_process').execSync('electron-builder install-app-deps', {
  stdio: 'inherit',
})