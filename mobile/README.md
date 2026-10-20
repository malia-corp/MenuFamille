# KeskonBouf — application mobile

Version React Native (Expo SDK 51, expo-router) de KeskonBouf. Elle reprend les écrans de la version web et appelle **les mêmes routes `/api/*`** du serveur Next.js : il faut donc qu'il tourne.

## Démarrer

```bash
cd mobile
npm install
cp .env.example .env   # puis renseigner les trois variables
npx expo start         # QR code à scanner avec Expo Go, ou touches a / i
```

Variables (`.env`) :

- `EXPO_PUBLIC_API_URL` : adresse du serveur Next.js. Sur un téléphone, l'IP du poste sur le réseau local (ex. `http://192.168.1.20:3000`), pas `localhost`. Lancer le web avec `npm run dev -- -H 0.0.0.0` pour qu'il soit joignable.
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` : mêmes valeurs que `NEXT_PUBLIC_SUPABASE_*` côté web.

## Vérifier

```bash
npm run typecheck                    # tsc --noEmit
npx expo export --platform web       # contrôle que tout se résout au bundling
```

## Organisation

- `app/` : écrans (expo-router). `(auth)` connexion et premier lancement ; `(tabs)` onglets (Accueil, Menu, Recettes, Ma table pour la planificatrice ; Accueil, Sondages, Avis, Ma table pour un membre) ; `s/[token]` sondage public sans compte.
- `src/components/ui` : composants de la charte (boutons, feuilles, sélecteurs, toasts…), `src/theme.ts` les jetons de couleur, rayons et polices du web.
- `src/lib` : client API (jeton Bearer, cache hors connexion), session, Supabase, rappels locaux.
- `src/shared` : utilitaires repris du web (`lib/utils`, `lib/constants`).

Écarts avec le web (connexion par code seulement, rappels locaux au lieu du push…) : voir `docs/ecarts-implementation.md`, section 4.
