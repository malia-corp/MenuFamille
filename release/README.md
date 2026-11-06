# Versions Android

APK de l'application mobile (`mobile/`). Les fichiers `.apk` sont générés ici mais restent hors du dépôt (`.gitignore`) : ils se partagent à la main (WhatsApp, Drive, e-mail).

## Construire

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://<adresse-publique> npm run build:apk
```

Le script régénère le projet natif (`expo prebuild`), lance Gradle et dépose `release/keskonbouf-<version>.apk`.

Prérequis : JDK 17, SDK Android (`ANDROID_HOME`).

L'adresse du serveur est intégrée à l'APK au moment de la construction :

| Adresse | Fichier produit | Usage |
| --- | --- | --- |
| `https://…` (version web en ligne) | `keskonbouf-<version>.apk` | **à partager** : fonctionne partout |
| `http://<IP-du-poste>:3000` | `keskonbouf-<version>-local.apk` | test seulement : même Wi-Fi que le poste, serveur lancé avec `npm run dev -- -H 0.0.0.0` |

Le trafic HTTP en clair n'est autorisé que pour une adresse `http://` (`mobile/app.config.js`).

Le serveur visé doit contenir la prise en charge de l'app mobile (jeton Bearer, `verify-otp` avec `client: 'mobile'`), arrivée avec la branche `feat/mobile-react-native`.

## Signature

Les APK sont signés avec la clé KeskonBouf : `mobile/credentials/keskonbouf-release.keystore` et ses mots de passe dans `mobile/credentials/keystore.properties`. Ce dossier est hors du dépôt.

**À sauvegarder en lieu sûr** (gestionnaire de mots de passe, coffre). Une version signée avec une autre clé ne peut pas mettre à jour l'app déjà installée ; sans cette clé, il faudrait désinstaller et réinstaller chez chacun.

Sans le dossier `credentials/`, le script signe avec la clé de débogage et ajoute `-debug` au nom du fichier.

## Installer

1. Ouvrir l'APK sur le téléphone.
2. Accepter l'installation depuis une source inconnue si Android le demande.
3. Pour une nouvelle version, installer le nouvel APK par-dessus : les données de connexion sont conservées.
