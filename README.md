# MenuFamille

PWA mobile-first de planification de menus hebdomadaires pour familles béninoises et africaines francophones. L'application permet à une planificatrice de générer un menu de la semaine, de le partager avec sa famille pour recueillir des avis, de gérer un carnet de recettes communautaire et de générer automatiquement une liste de courses.

Conçue pour fonctionner sur réseau lent et hors connexion, avec une interface en français pensée pour le contexte ouest-africain.

## Source de vérité

Toute la spécification fonctionnelle et technique est dans [`docs/MenuFamille_CDC_v3.docx`](docs/MenuFamille_CDC_v3.docx). Les décisions de cadrage du Sprint 0 sont résumées dans [`docs/decisions.md`](docs/decisions.md).

## Stack technique

- **Front** : Next.js 14 (App Router) · Tailwind CSS · shadcn/ui · Zustand
- **Back** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Infra** : Vercel (CI/CD + hébergement) · extension PostgreSQL `pg_trgm`
- **PWA** : Service Worker pour mode hors connexion

## Installation locale

```bash
# 1. Cloner le repo
git clone <url-du-repo>
cd MenuFamille

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir les valeurs Supabase dans .env.local

# 4. Lancer le serveur de développement
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
app/              Next.js App Router (pages et API routes)
lib/              Utilitaires et clients Supabase
  supabase/       Client typé, helpers auth
components/       Composants React partagés
  ui/             Composants shadcn/ui
supabase/
  migrations/     Migrations SQL (domain-split)
  seed/           Scripts de données initiales
docs/             Spécifications et documentation
```

## Conventions

Voir [`CLAUDE.md`](CLAUDE.md) pour les conventions de commit, le garde-fou de périmètre et le format de session de travail.
