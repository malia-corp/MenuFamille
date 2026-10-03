# BACKLOG Phase 2

Fonctionnalités identifiées comme utiles mais hors scope du MVP (CDC section 5).
À prioriser après la livraison du MVP.

| Feature | Contexte / Source de l'idée |
|---|---|
| Catégorie "Sauce" séparée dans `categories` (ex. soupe de poisson, friture de tomate) | Évoquée par la développeuse pendant le plan `recipe_associations` (sprint modèle v2). L'étape de réconciliation des catégories avait été explicitement écartée à ce moment-là — à statuer dans un sprint dédié aux catégories. |
| Historique des votes (résultats des sondages des semaines passées) | Bouton « Historique des votes » de la maquette desktop des résultats (sprint 4, `/votes/results`). La page affiche uniquement le plan demandé (ou le plus récent) ; une navigation entre semaines passées serait une évolution. |
| Notes / avis sur les recettes (« ★ 4.9 », tri « Plus populaires (note) ») | Maquettes du carnet culinaire (sprint 4). Aucun système d'avis par recette : remplacé par le nombre de favoris du foyer et le tri « Plus planifiées ». |
| Filtre « Moment de la journée » sur le carnet | Maquette desktop du carnet (sprint 4). Les recettes ne sont pas rattachées à un type de repas ; il faudrait l'inférer de l'historique de planification ou le saisir. |
| Critères express « Favoris enfants », « Sans arachide », « Économique » + encart « Conseil du marché » | Maquette desktop du carnet (sprint 4). Aucune donnée derrière (préférences enfants, allergènes structurés, coût, conseils saisonniers). Seul « < 30 min » est implémenté. |
| Numérisation d'un carnet manuscrit / photo (scan) | Bloc « Magie Express » de l'ajout de recette (sprint 4). Bouton présent en « Bientôt disponible » ; fonctionnalité exclue du MVP (décision de cadrage n°4). |
| Archiver une recette | Menu options du détail mobile (sprint 4). Pas de colonne d'archivage ; seuls Modifier / Partager / Supprimer sont proposés. |
| Aperçu de la recette avant enregistrement (desktop) | Bouton « Aperçu » de la maquette d'ajout desktop (sprint 4). |
| Langue & unités culinaires (mesures locales : sodabi, oloko…, sélecteur métrique/local) | Page Paramètres (sprint 4). Aucun modèle de données pour la langue ni les unités ; lignes présentes en « Bientôt disponible ». |
| « Menu du jour sur WhatsApp » (envoi automatique quotidien à la famille) | Maquette du profil (sprint 4). Nécessite une intégration WhatsApp Business ; non implémenté. |
| Indicateur « X kg de denrées économisées » | Maquette du profil (sprint 4). Aucune donnée de quantités achetées/gaspillées pour le calculer. |
| Statut actif/inactif d'un cercle + sélecteur multi-cercles | Maquette mobile du cercle (sprint 4). Pas de notion de cercle actif (cf. docs/ecarts-implementation.md #1) ; un seul cercle affiché. |
| Convives ponctuels (invités du week-end) | Maquette mobile du cercle (sprint 4). Aucun modèle d'invité temporaire. |
| Rôle familial et âge des membres (« Papa », « Fille · 12 ans ») | Maquettes du cercle (sprint 4). `family_circle_members` ne porte que planificatrice/membre. |
| Relance d'un membre (« Rappeler ») et statut de connexion | Maquette desktop du cercle (sprint 4). |
| Réinitialisation du code d'invitation | Maquette desktop du cercle (sprint 4). Le QR code est implémenté, pas la régénération. |
| Heure de service sur l'avis post-repas (« Servi à 12h30 ») | Maquette /feedback (sprint 4). L'heure n'est pas chargée avec le plan. |
| Dictée vocale du commentaire d'avis | Icône micro de la maquette /feedback (sprint 4), en « Bientôt disponible ». |
