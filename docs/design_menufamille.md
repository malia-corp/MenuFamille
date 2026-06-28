# MenuFamille — Brief de design

**Document de référence pour la génération des maquettes (Claude Design)**
Version 1.0 — Juin 2026 — basé sur le Cahier des Charges v3.0

---

## 1. Contexte produit

MenuFamille est une PWA mobile-first qui permet à une famille béninoise/africaine de planifier son menu hebdomadaire en moins de 2 minutes, de recueillir l'avis nuancé des proches via un sondage (pas un vote), et de générer automatiquement sa liste de courses. Le produit est pensé pour évoluer du cercle familial vers des usages communautaires et professionnels sans refonte visuelle.

**Public** : familles béninoises et africaines francophones, connexion mobile souvent limitée, usage dominant WhatsApp.
**Persona principale** : Rosine, 34 ans, Planificatrice du foyer — peu de temps, veut une interface qui ne lui fait jamais réfléchir.

**Réfère toi également aux elements dans le Dossier compressé (.zip):"stitch_menufamille_african_meal_planner" pour améliorer le rendu**
---

## 2. Identité de marque

| Élément | Valeur |
|---|---|
| Nom | MenuFamille (provisoire) |
| Ton | Chaleureux, rassurant, jamais infantilisant. On s'adresse à une adulte compétente et occupée. |
| Promesse | « 2 minutes pour planifier, zéro charge mentale » |
| Inspiration visuelle | Marché ouest-africain : terracotta, épices, vert frais, papier kraft — pas une esthétique « app tech » froide |

---

## 3. Principes de design

1. **Mobile-first absolu** — toute interface doit fonctionner au pouce sur un écran 5,5″, sans aucune interaction qui suppose un grand écran.
2. **Simplicité radicale** — 3 étapes maximum pour toute action principale ; jamais plus d'une décision par écran quand c'est évitable.
3. **Gros boutons** — zones de toucher ≥ 48×48 px, espacées.
4. **Texte lisible sans zoom** — 16 px minimum pour le corps de texte.
5. **Feedback immédiat** — chaque action déclenche un retour visuel (toast, animation, changement d'état) en moins de 150 ms perçus.
6. **Chargement progressif** — toujours un squelette d'interface avant le contenu réel, jamais un écran blanc.
7. **Tolérance à la connexion lente** — les écrans consultatifs (menu, courses, recettes) doivent rester utilisables hors-ligne ; le design doit prévoir un état "hors connexion" visible mais non anxiogène.
8. **Pas de pression sociale** — sur les écrans de sondage et de feedback, le ton et les couleurs doivent rassurer (le sondage n'est jamais un examen).

---

## 4. Palette de couleurs

| Rôle | Valeur | Usage |
|---|---|---|
| Primaire | `#D4572A` Terracotta | Actions principales, en-têtes, accents de marque |
| Secondaire | `#F5A623` Or africain | Accents chaleureux, badges « modèle semaine », notifications neutres |
| Accent positif | `#2A7D4F` Vert marché | Validation, réaction « J'aime », notifications réussies, cercle familial |
| Attention | `#c43030` Rouge discret | Réaction « Non », alertes non bloquantes — jamais agressif |
| Fond | `#FDF6EE` Crème chaud | Fond principal de toutes les surfaces |
| Texte | `#2C1810` Brun foncé | Texte principal (jamais de noir pur) |
| Texte secondaire | `#5A4A43` | Légendes, métadonnées |

Mapper ces couleurs sur les CSS variables déjà en usage dans les maquettes existantes (`--color-background-primary`, `--color-background-secondary`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-border-primary/secondary/tertiary`, `--color-background-success/warning/danger`, `--color-text-success/warning/danger`) pour rester compatible avec le moteur de rendu utilisé jusqu'ici.

---

## 5. Typographie & iconographie

- **Police** : Poppins (titres) + Nunito (corps de texte) — lisibilité mobile, caractère chaleureux. Fallback système : `'Anthropic Sans', sans-serif` (déjà utilisé dans les maquettes existantes).
- **Échelle** : Titre écran 18–20px / Sous-titre 13–14px / Corps 12–13px (mobile dense) / Légende 10–11px.
- **Icônes** : Phosphor Icons ou Tabler Icons, trait fin, jamais de remplissage agressif. Les emoji (😊😐😕, 🔒, ☕🍽🍎🌙) sont des éléments d'interface à part entière, pas de simples décorations — ils portent le sens de l'état (réaction, type de repas).

---

## 6. Composants UI à concevoir

Liste des composants réutilisables identifiés dans les maquettes existantes, à formaliser en un design system cohérent :

- **Carte de repas** (`meal-card`) — icône type repas, nom, badge « obligatoire », interrupteur on/off, sélecteur de mode (pills "Modèle semaine" / "Quotidien")
- **Grille hebdomadaire** — 7 colonnes, cases compactes avec état vide, verrouillé (🔒), en édition
- **Panneau d'édition inline** — liste d'options + option « + Nouveau repas personnalisé… » toujours en dernière position, visuellement distincte (bordure pointillée)
- **Formulaire de recette** — sections : infos de base, tags (chips sélectionnables), ingrédients (lignes dynamiques), étapes (numérotées, dynamiques)
- **Sélecteur de visibilité** (Privée / Cercle / Communautaire) — composant à 3 options avec icône + micro-explication, présélection sur Privée
- **Boîte de dialogue de doublon** — liste de recettes similaires (photo, auteur, score) + 3 boutons d'action clairement hiérarchisés
- **Réaction emoji** (sondage et feedback) — 3 boutons égaux (😊/😐/😕), état sélectionné avec halo coloré
- **Barre de distribution** — barres horizontales proportionnelles par réaction, avec compteur
- **Palette de messages prêts** (« vibe pills ») — chips groupées par catégorie de note, état sélectionné, option « Écrire mon propre message… » distincte (bordure pointillée)
- **Carte de notification / réglage** — icône, nom, heure, interrupteur on/off
- **Bandeau d'état de connectivité** — discret, non intrusif, en haut d'écran
- **Écran de confirmation** — emoji célébration, statistiques en cartes, actions suivantes en grille 2×2
- **Code d'invitation cercle** — affichage en gros caractères + bouton copier + bouton partager WhatsApp

---

## 7. Ton et microcopy

- Toujours en français, vocabulaire du quotidien béninois (pas de jargon « UX »).
- Vocabulaire imposé : **« donner son avis »** (jamais « voter »), **« sondage »** (jamais « vote »), **« répondant »** (jamais « votant »), **« cercle »** ou **« cercle familial »** (jamais « groupe »).
- Les messages d'erreur expliquent toujours quoi faire ensuite, jamais juste ce qui ne va pas.
- Les écrans vides (aucun repas actif, aucune réponse au sondage) ont toujours une phrase d'invitation à l'action, pas juste un état neutre.

---

## 8. Accessibilité

- Contraste texte ≥ 4,5:1 sur tous les fonds.
- Toute information portée par une couleur (réaction, statut) doit aussi être portée par un texte ou une icône — jamais la couleur seule.
- Cibles tactiles ≥ 48×48 px, espacement ≥ 8px entre cibles adjacentes.
- Navigation clavier et labels ARIA sur tous les éléments interactifs (champs, boutons, toggles).

---

## 9. Inventaire des interfaces à livrer

Plan de livraison en 20 interfaces, organisées par module fonctionnel (cf. CDC v3.0, section 5). Priorité P0 = cœur du parcours des 2 minutes, P1 = parcours secondaires fréquents, P2 = parcours occasionnels.

### Onboarding & configuration
1. **Onboarding — premier lancement** (P1) — présentation en 2–3 écrans, création du cercle familial ou rejoindre via code
2. **Configuration des types de repas** (P0) — activation/désactivation, mode Modèle/Quotidien, aperçu de grille — *référence : `meal_type_config_menufamille.html`*
3. **Gestion du cercle familial** (P1) — liste des membres, code d'invitation, quitter/inviter

### Planification
4. **Accueil — Menu de la semaine** (P0) — vue calendrier, bouton « Générer ma semaine »
5. **Génération — état de chargement** (P0) — barre de progression, items qui se valident
6. **Grille de révision du menu** (P0) — sections par type de repas, modes Modèle/Quotidien — *référence : `workflow_menu_avec_nouveau_repas.html`*
7. **Panneau d'édition d'une case** (P0) — liste d'options + nouveau repas personnalisé
8. **Formulaire de nouveau repas** (P0) — infos, tags, ingrédients, étapes
9. **Écran de confirmation de la semaine** (P0) — récapitulatif + actions suivantes

### Recettes
10. **Carnet de recettes — liste** (P1) — filtres, recherche, indicateur de visibilité par recette
11. **Détail d'une recette** (P1) — photo, ingrédients à l'échelle, étapes, sélecteur de visibilité
12. **Import de recette par URL** (P1) — champ URL, relecture des champs extraits
13. **Boîte de dialogue de résolution de doublon** (P0) — recettes similaires + 3 choix

### Sondage & feedback
14. **Page publique du sondage (répondant)** (P0) — réaction par repas, commentaire facultatif — *référence : `sondage_menu_menufamille.html`*
15. **Tableau de résultats du sondage (Planificatrice)** (P0) — distribution, commentaires, compteurs
16. **Paramètres de notifications** (P1) — rappels par repas + feedback — *référence : `notifications_feedback_menufamille.html`*
17. **Onglet Avis / feedback post-repas** (P1) — notes par jour, palette de messages prêts

### Courses & garde-manger
18. **Liste de courses** (P0) — triée par catégorie, cochable, ajout manuel
19. **Garde-manger** (P2) — inventaire, ajout rapide, réinitialisation
20. **Paramètres du profil** (P2) — préférences alimentaires, taille du foyer, gestion du compte

---

## 10. Références existantes à respecter

Ces fichiers définissent déjà le vocabulaire visuel attendu — toute nouvelle interface doit s'y conformer, pas l'inverse :

- `meal_type_config_menufamille.html` — configuration des repas
- `workflow_menu_avec_nouveau_repas.html` — grille de planification + création de repas
- `sondage_menu_menufamille.html` — sondage répondant + résultats
- `notifications_feedback_menufamille.html` — notifications + feedback
- `mcd_menufamille_v3.html` — modèle de données complet (pour la cohérence des champs affichés)
- `workflows_menufamille_complet.html` — workflow détaillé des 16 fonctionnalités

---

## 11. Ce qui n'est volontairement PAS dans ce brief

- Le détail technique (composants React, état Zustand) — voir CDC v3.0, section 9.
- Les écrans de Phase 2/3 (budget, multi-cercles avancés, mode professionnel) — hors périmètre de cette vague de maquettes.
- Toute charte graphique alternative — la palette terracotta/or/vert est un choix déjà validé, ne pas proposer d'alternative sans demande explicite.


