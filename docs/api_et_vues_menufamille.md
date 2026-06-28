# MenuFamille — Inventaire des vues front et des API back

**Basé sur la maquette Claude Design (`MenuFamille (1).html`) + Cahier des Charges v3.0**
Organisé par fonctionnalité. Chaque section liste les vues front à réaliser, puis les endpoints back nécessaires.

---

## 1. Compte & Onboarding

### Vues front
- `/onboarding` — écran d'accueil non connecté : présentation + connexion (magic link) + création/adhésion à un cercle

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/magic-link` | Envoie un lien de connexion par email |
| GET | `/api/auth/verify` | Valide le token du lien et ouvre une session |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/users/me` | Profil de l'utilisateur connecté |
| PUT | `/api/users/me` | Mise à jour profil (nom, taille du foyer, préférences alimentaires) |
| POST | `/api/users/me/onboarding` | Finalise l'onboarding (1er paramétrage) |

---

## 2. Accueil & navigation

### Vues front
- `/home` — écran principal (variante « hero » et variante « agenda »), carte du jour, accès rapide
- Drawer (menu latéral) — composant partagé, pas une route dédiée
- Barre de navigation basse (Menu / Recettes / Courses / Garde-manger) — composant partagé

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/meal-plans/current` | Plan de menu de la semaine en cours (pour l'écran d'accueil) |
| GET | `/api/users/me/summary` | Compteurs (recettes partagées, repas planifiés) pour l'accueil/profil |

---

## 3. Configuration des types de repas

### Vues front
- `/plan/configure` — étape 1 (stepper) : activer/désactiver les 4 types de repas, choisir le mode (modèle semaine / quotidien)

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me/meal-config` | Configuration actuelle des 4 types de repas |
| PUT | `/api/users/me/meal-config` | Mise à jour en bloc (is_active, mode, display_order par type) |

---

## 4. Génération et édition du menu

### Vues front
- `/plan/generating` — écran de chargement (progression Recettes → Variété → Restrictions → Saison)
- `/plan/review` — grille de révision (28 cases max), sections par type de repas, bascule modèle/quotidien, verrouillage
- Modal **Sélecteur de repas** (picker) — ouvert depuis une case de la grille
- Modal **Nouveau repas personnalisé** — formulaire (infos, tags, ingrédients, étapes) ouvert depuis le picker
- `/plan/confirm` — écran de confirmation (célébration + récapitulatif + actions suivantes)

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/meal-plans/generate` | Génère un nouveau plan de menu (semaine, types actifs) |
| GET | `/api/meal-plans/:id` | Détail d'un plan (tous les items) |
| PATCH | `/api/meal-plans/:id/items/:itemId` | Remplace/déplace un repas dans une case |
| POST | `/api/meal-plans/:id/items/:itemId/lock` | Verrouille/déverrouille une case |
| POST | `/api/meal-plans/:id/items` | Crée un repas personnalisé et l'assigne à une case (déclenche la vérification de doublon si visibilité ≠ privée) |
| POST | `/api/meal-plans/:id/finalize` | Valide la semaine (statut → finalized), démarre le chrono côté serveur si pertinent |
| POST | `/api/meal-plans/:id/share` | Génère/renvoie le `share_token` + lien public |

---

## 5. Carnet de recettes & contribution

### Vues front
- `/recipes` — liste du carnet (filtres par tag, recherche)
- `/recipes/:id` — détail d'une recette (ingrédients à l'échelle, étapes, favoris, sélecteur de visibilité)
- `/recipes/add` — formulaire d'ajout manuel (infos, tags, ingrédients, étapes)
- `/recipes/scan` — capture/scan d'une recette (photo → extraction IA) — *variante de l'import URL côté produit*
- Modal **Recette déjà connue ?** (doublon) — déclenchée à l'enregistrement

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/recipes` | Liste filtrée (scope: mine / cercle / communauté, tags, recherche) |
| GET | `/api/recipes/:id` | Détail d'une recette |
| POST | `/api/recipes` | Création (visibilité incluse) |
| PUT | `/api/recipes/:id` | Mise à jour (y compris changement de visibilité) |
| DELETE | `/api/recipes/:id` | Suppression |
| POST | `/api/recipes/check-duplicate` | Calcule la similarité de nom dans le périmètre visé, renvoie les correspondances (auteur, photo, score) |
| POST | `/api/recipes/:id/use-existing` | Ajoute une recette existante aux favoris (issue du dialogue de doublon) |
| POST | `/api/recipes/:id/variant` | Crée une variante liée (parent_recipe_id + variant_label) |
| POST | `/api/recipes/import-url` | Scrape + parse une URL, renvoie les champs pré-remplis (non sauvegardé) |
| POST | `/api/recipes/scan` | Reçoit une photo, extrait ingrédients/étapes via IA, renvoie les champs pré-remplis |
| POST | `/api/recipes/:id/favorite` | Bascule favori |
| GET | `/api/categories` | Catégories de recettes |
| GET | `/api/pantry-categories` | Catégories de courses/garde-manger (réf. communes) |

---

## 6. Sondage famille

### Vues front
- `/s/:token` — page publique du sondage (vue répondant) : prénom + réaction emoji par repas + commentaire
- `/results` — tableau de résultats (vue Planificatrice) : compteurs, distribution par repas, commentaires

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/surveys/:token` | Détail public du menu à sonder (sans authentification) |
| POST | `/api/surveys/:token/responses` | Enregistre une réponse complète (ou au fil de l'eau, réponse par réponse) |
| GET | `/api/meal-plans/:id/survey-results` | Résultats agrégés pour la Planificatrice |

---

## 7. Feedback post-repas

### Vues front
- `/feedback` — onglet Avis : note du repas du jour + palette de messages prêts + champ libre

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/feedback-templates?rating=` | Messages prêts disponibles pour une catégorie de note |
| POST | `/api/meal-plan-items/:id/feedback` | Enregistre la note + le message (template ou personnalisé) |
| GET | `/api/meal-plans/:id/feedback` | Récapitulatif des retours de la semaine |

---

## 8. Notifications

### Vues front
- `/notifications` — préférences : rappels de repas (déjeuner/dîner) + demande d'avis post-repas

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me/notification-prefs` | Préférences actuelles |
| PUT | `/api/users/me/notification-prefs` | Mise à jour (on/off, heure, jours, délai) |
| POST | `/api/push/subscribe` | Enregistre l'abonnement Web Push du navigateur |
| POST | `/api/push/unsubscribe` | Désabonnement |
| *(interne)* | Job planifié | Déclenche l'envoi des rappels et des demandes de feedback (pas un endpoint appelé par le front) |

---

## 9. Profil & Cercle familial

### Vues front
- `/profile` — profil (avatar, impact, membres de la famille en aperçu, préférences alimentaires, accès paramètres)
- `/circle` — gestion du cercle : code d'invitation, liste des membres, quitter le cercle

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/circles` | Crée un cercle (génère l'invite_code) |
| GET | `/api/circles/:id` | Détail du cercle |
| POST | `/api/circles/join` | Rejoint un cercle via code d'invitation |
| GET | `/api/circles/:id/members` | Liste des membres |
| DELETE | `/api/circles/:id/members/:userId` | Retire un membre / quitter le cercle |
| GET | `/api/circles/:id/invite-link` | Lien d'invitation prêt à partager (WhatsApp) |

---

## 10. Courses & garde-manger

### Vues front
- `/shopping` — liste de courses (par catégorie, cochable, partage)
- `/pantry` — garde-manger (filtres, sections par catégorie, suggestion de recette selon le stock)

### API back
| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/meal-plans/:id/shopping-list` | Récupère (ou génère si absente) la liste consolidée |
| PATCH | `/api/shopping-lists/:id/items/:itemId` | Coche/décoche un article |
| POST | `/api/shopping-lists/:id/items` | Ajoute un article manuel |
| POST | `/api/shopping-lists/:id/complete` | Clôture la liste, propose la mise à jour du garde-manger |
| GET | `/api/pantry` | Inventaire du garde-manger (sections + filtres) |
| POST | `/api/pantry/items` | Ajoute un article |
| PATCH | `/api/pantry/items/:id` | Met à jour quantité/statut |
| DELETE | `/api/pantry/items/:id` | Retire un article |
| POST | `/api/pantry/reset` | Réinitialise l'inventaire |
| GET | `/api/pantry/recipe-suggestions` | Suggestion de recette réalisable avec le stock actuel |

---

## 11. Écarts entre la maquette et le CDC v3.0 — à trancher avant développement

La maquette Claude Design simplifie volontairement certains points par rapport au cahier des charges complet. À valider avant de figer les API :

| Point | Maquette actuelle | CDC v3.0 |
|---|---|---|
| Choix au moment d'un doublon | 2 options : « Voir l'existante » / « Créer la mienne quand même » | 3 options, dont la création d'une **variante** liée (parent_recipe_id) |
| Sélecteur de visibilité à l'ajout d'une recette | Non visible dans le formulaire actuel | Privée / Cercle / Communautaire, présélection Privée |
| Réaction de feedback post-repas | Étoiles (⭐) + messages prêts | 3 emoji (😊/😐/😕) + messages prêts |
| Import de recette | Scan photo (extraction IA) | Import par URL (scraping) — les deux peuvent coexister |
| Rappels de repas | Déjeuner + Dîner seulement | 4 types configurables (Petit-déjeuner, Déjeuner, Goûter, Dîner) |

Je recommande de trancher ces 5 points avec vous avant de démarrer l'implémentation des endpoints concernés, pour éviter un aller-retour API après coup.
