// Construit l'APK Android de version et le dépose dans release/ (racine du dépôt).
// Usage : EXPO_PUBLIC_API_URL=https://… npm run build:apk
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.join(__dirname, '..')
const apiUrl = process.env.EXPO_PUBLIC_API_URL
if (!apiUrl) {
  console.error('Indique l’adresse du serveur : EXPO_PUBLIC_API_URL=https://… npm run build:apk')
  process.exit(1)
}
const env = { ...process.env, NODE_ENV: 'production' }
const run = (cmd, cwd = root) => execSync(cmd, { cwd, env, stdio: 'inherit' })

run('npx expo prebuild --platform android --clean --no-install')
// Cache de projet Gradle hors du dossier du projet : sous Windows, l'analyse
// antivirus du dossier bloque parfois ses déplacements de fichiers.
const cacheDir = path.join(os.homedir(), '.gradle-projects', 'keskonbouf')
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'
run(`${gradlew} assembleRelease -x lint --project-cache-dir "${cacheDir}"`, path.join(root, 'android'))

const { version } = require('../app.json').expo
const local = /^http:\/\//.test(apiUrl) ? '-local' : ''
const signed = fs.existsSync(path.join(root, 'credentials', 'keystore.properties')) ? '' : '-debug'
const out = path.join(root, '..', 'release', `keskonbouf-${version}${local}${signed}.apk`)
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.copyFileSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), out)
console.log(`\nAPK : ${out}`)
