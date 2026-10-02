# MenuFamille — Tests utilisateurs (Sprint 6 Jour 4)

5 profils, chacun avec un scénario en actions à effectuer. On note le comportement observé (hésitation, mauvais chemin pris, abandon, question posée à voix haute) — pas si le résultat correspond à l'attendu.

---

## 1. Rosine — planificatrice@menufamille.test

**Contexte préparé avant la session** : cercle "Famille Rosine" créé, config Déjeuner + Dîner actifs (quotidien), Petit-déjeuner actif (modèle semaine), menu de la semaine déjà généré et partagé, 2-3 réponses de sondage pré-remplies.

**Scénario — la planificatrice hebdomadaire :**
1. Se connecter (OTP email)
2. Depuis l'accueil, aller sur le menu de la semaine (`/plan`)
3. Changer un repas qu'elle n'aime pas (bottom sheet, choisir une autre recette)
4. Verrouiller un repas qu'elle veut garder pour la semaine suivante
5. Ouvrir les résultats du sondage déjà en cours (`/plan/[id]/survey`) et regarder qui a répondu
6. Copier à nouveau le lien de partage et l'envoyer (simulé) à un membre du cercle

**Observer** : sait-elle où trouver le sondage sans qu'on lui montre ? Comprend-elle la différence entre "verrouiller" et "modifier" ? Hésite-t-elle sur la copie du lien ?

---

## 2. Awa — pas de compte

**Contexte préparé** : aucun. Elle reçoit uniquement le lien `/s/[token]` de Rosine (simulé — lui donner l'URL directement).

**Scénario — la répondante externe :**
1. Ouvrir le lien reçu, sans jamais se connecter
2. Regarder le menu de la semaine affiché
3. Donner son avis (😊/😐/😕) sur au moins 3 repas
4. Laisser un commentaire sur un repas
5. Essayer de retrouver ce lien plus tard (fermer l'onglet, le rouvrir depuis l'historique du navigateur)

**Observer** : comprend-elle qu'elle n'a pas besoin de créer de compte ? Saisit-elle son prénom sans qu'on le lui demande ? Le fait de ne pas avoir de compte la déstabilise-t-elle à un moment ?

---

## 3. Fatima — debutante@menufamille.test

**Contexte préparé** : compte créé (email confirmé), mais onboarding non terminé — aucun cercle, aucune config de repas.

**Scénario — la toute première utilisation :**
1. Se connecter (OTP email)
2. Suivre le parcours d'onboarding jusqu'au bout, sans aide
3. Créer son propre cercle familial (ou rejoindre si elle a un code — à ne pas lui donner pour ce scénario)
4. Configurer ses types de repas (`/plan/configure`)
5. Générer son premier menu

**Observer** : à quel moment abandonne-t-elle si elle abandonne ? Comprend-elle ce qu'est un "cercle familial" avant qu'on le lui explique ? Le parcours onboarding → configuration → génération lui semble-t-il long ?

---

## 4. Koffi — membre@menufamille.test

**Contexte préparé** : a déjà rejoint le cercle de Rosine via code d'invitation, a déjà noté 2 repas dans l'onglet Avis.

**Scénario — le membre du cercle, pas le planificateur :**
1. Se connecter
2. Consulter le menu de la semaine du cercle (lecture, sans y toucher)
3. Aller dans l'onglet Avis (`/feedback`) et noter un repas non encore noté
4. Regarder le carnet de recettes du cercle (`/recipes`, scope "Famille")
5. Essayer de modifier un repas du menu (voir ce qu'il se passe — il n'est pas censé pouvoir, selon son rôle dans le cercle)

**Observer** : comprend-il la distinction entre "son avis" (Feedback) et "le sondage" (Survey), qui se ressemblent ? Cherche-t-il à modifier le menu alors que ce n'est pas son rôle ?

---

## 5. Adjoua — contributrice@menufamille.test

**Contexte préparé** : a déjà 2 recettes (1 sauce + accompagnement en composition, 1 plat complet seul), 1 en visibilité communauté, 1 en privé.

**Scénario — l'ajout de recette :**
1. Se connecter
2. Ajouter une nouvelle recette avec une composition (ex. un plat + un accompagnement à associer)
3. Choisir la visibilité "Communauté"
4. Créer volontairement une recette avec le même nom qu'une recette déjà existante (chez elle ou en communauté) et observer le dialogue de doublon
5. Éditer une de ses recettes existantes pour changer sa visibilité de "Privé" à "Cercle"

**Observer** : comprend-elle ce qu'est une "composition" (accompagnement/boisson liée) sans explication ? Que fait-elle face au dialogue de doublon (utiliser / variante / indépendante) — hésite-t-elle sur le choix ?

---

## Après chaque session

Faire remplir `formulaire-retour.md` seul·e, sans qu'on soit dans la pièce ou en visio active.
