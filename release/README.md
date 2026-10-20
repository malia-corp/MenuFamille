# Versions de test

APK Android de test de l'application mobile (`mobile/`). Les fichiers `.apk` sont générés ici mais restent hors du dépôt (`.gitignore`) : ils se partagent à la main.

## Installer sur un téléphone

1. Copier l'APK sur le téléphone (câble, e-mail, Drive…) et l'ouvrir.
2. Accepter l'installation depuis une source inconnue si Android le demande.
3. Le téléphone doit être sur **le même Wi-Fi** que le poste de développement, où le serveur web tourne avec `npm run dev -- -H 0.0.0.0`.

L'adresse du serveur est intégrée à l'APK au moment de la construction (`EXPO_PUBLIC_API_URL`). Si l'IP du poste change, il faut reconstruire l'APK.

## Reconstruire

Prérequis : JDK 17, SDK Android (variable `ANDROID_HOME`).

```bash
cd mobile
npm run prebuild:android          # régénère mobile/android depuis app.json
cd android
EXPO_PUBLIC_API_URL=http://<IP-du-poste>:3000 ./gradlew assembleRelease
# APK : mobile/android/app/build/outputs/apk/release/app-release.apk
```

Puis copier l'APK dans `release/` en le nommant `keskonbouf-<version>-test.apk`.

## Limites d'une version de test

- Signée avec la clé de débogage : à ne pas publier sur le Play Store.
- Trafic HTTP en clair autorisé (`usesCleartextTraffic`) pour joindre le serveur de développement ; à retirer pour une version publique servie en HTTPS.
