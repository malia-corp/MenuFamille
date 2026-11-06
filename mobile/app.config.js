// Complète app.json selon l'adresse du serveur intégrée à la version :
// HTTP en clair autorisé seulement pour un serveur de développement (http://),
// jamais pour un serveur public en HTTPS.
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? ''
  const cleartext = apiUrl.startsWith('http://')
  const plugins = (config.plugins ?? []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties')
  return {
    ...config,
    plugins: [
      ...plugins,
      ['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }],
      './plugins/withReleaseSigning',
    ],
  }
}
