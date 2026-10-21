// Signature des versions Android avec la clé KeskonBouf (credentials/, hors dépôt).
// Ajouté à android/app/build.gradle à chaque « expo prebuild » : sans le fichier
// credentials/keystore.properties, la version reste signée avec la clé de débogage.
const { withAppBuildGradle } = require('expo/config-plugins')

const MARK = '// kkb-release-signing'

const SIGNING = `
${MARK}
def kkbKeystoreProps = new Properties()
def kkbKeystoreFile = rootProject.file('../credentials/keystore.properties')
if (kkbKeystoreFile.exists()) { kkbKeystoreFile.withInputStream { kkbKeystoreProps.load(it) } }
android {
    signingConfigs {
        kkbRelease {
            if (kkbKeystoreFile.exists()) {
                storeFile rootProject.file('../credentials/' + kkbKeystoreProps['storeFile'])
                storePassword kkbKeystoreProps['storePassword']
                keyAlias kkbKeystoreProps['keyAlias']
                keyPassword kkbKeystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            if (kkbKeystoreFile.exists()) { signingConfig signingConfigs.kkbRelease }
        }
    }
}
`

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    if (!cfg.modResults.contents.includes(MARK)) cfg.modResults.contents += SIGNING
    return cfg
  })
}
