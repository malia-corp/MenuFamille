// Metro (bundler Expo) : configuration par défaut, plus un module vide pour
// @opentelemetry/api, importé dynamiquement (et facultatif) par supabase-js.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const OPTIONAL = new Set(['@opentelemetry/api'])
const resolve = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (OPTIONAL.has(moduleName)) return { type: 'empty' }
  return (resolve ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
