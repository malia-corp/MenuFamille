-- ============================================================================
-- MenuFamille — Seed Sprint 0 Jour 3
-- Catégories, catégories de garde-manger, recettes communautaires de référence,
-- messages de feedback prêts. Champs conformes à docs/sql/0002_recipes.sql et
-- docs/sql/0004_survey_feedback.sql — aucun champ inventé.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATEGORIES (UUID fixes pour pouvoir les référencer directement dans les
-- recettes ci-dessous, sans sous-requêtes)
-- ----------------------------------------------------------------------------
insert into categories (id, name, slug, icon, color) values
  ('10000000-0000-0000-0000-000000000001', 'Plat principal',        'plat-principal',        '🍛', '#D4572A'),
  ('10000000-0000-0000-0000-000000000002', 'Entrée',                'entree',                 '🥗', '#2A7D4F'),
  ('10000000-0000-0000-0000-000000000003', 'Dessert',               'dessert',                '🍮', '#F5A623'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce',                 'sauce',                  '🍲', '#D4572A'),
  ('10000000-0000-0000-0000-000000000005', 'Boisson',               'boisson',                '🥤', '#2A7D4F'),
  ('10000000-0000-0000-0000-000000000006', 'Bouillie & céréales',   'bouillie-cereales',      '🥣', '#F5A623'),
  ('10000000-0000-0000-0000-000000000007', 'Beignets & snacks',     'beignets-snacks',        '🍩', '#D4572A'),
  ('10000000-0000-0000-0000-000000000008', 'Soupe',                 'soupe',                  '🍜', '#2A7D4F');

-- ----------------------------------------------------------------------------
-- PANTRY_CATEGORIES
-- ----------------------------------------------------------------------------
insert into pantry_categories (id, name, icon, sort_order) values
  ('20000000-0000-0000-0000-000000000001', 'Féculents',                '🌾', 1),
  ('20000000-0000-0000-0000-000000000002', 'Viandes & poissons',       '🍖', 2),
  ('20000000-0000-0000-0000-000000000003', 'Légumes & fruits',         '🥬', 3),
  ('20000000-0000-0000-0000-000000000004', 'Épices & condiments',      '🌶️', 4),
  ('20000000-0000-0000-0000-000000000005', 'Produits laitiers',        '🧀', 5),
  ('20000000-0000-0000-0000-000000000006', 'Divers',                   '🛒', 6);

-- ----------------------------------------------------------------------------
-- RECIPES — recettes de référence communautaires (user_id = null : recettes
-- de base, pas attachées à un compte personnel)
-- ----------------------------------------------------------------------------
insert into recipes
  (category_id, name, slug, name_fingerprint, description, prep_time_min, cook_time_min, servings, difficulty, visibility)
values
  -- Plat principal
  ('10000000-0000-0000-0000-000000000001', 'Riz au gras', 'riz-au-gras', 'riz au gras', 'Riz cuit dans une sauce tomate riche à la viande et aux légumes.', 20, 40, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Igname pilée', 'igname-pilee', 'igname pilee', 'Igname bouillie puis pilée jusqu''à obtenir une pâte lisse, servie avec une sauce.', 15, 45, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Amiwo', 'amiwo', 'amiwo', 'Pâte de maïs rouge à la tomate et au piment, spécialité béninoise.', 20, 35, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Wassa-wassa', 'wassa-wassa', 'wassa wassa', 'Riz béninois cuit avec feuilles et épices locales.', 15, 30, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Atassi', 'atassi', 'atassi', 'Riz et haricots cuits ensemble, accompagnés d''une sauce tomate épicée.', 15, 40, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Ayimolou', 'ayimolou', 'ayimolou', 'Riz au haricot mijoté à l''huile rouge, plat convivial du dimanche.', 15, 35, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Gbékou', 'gbekou', 'gbekou', 'Viande de bœuf mijotée en sauce épicée, servie avec un féculent.', 20, 60, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Poulet braisé', 'poulet-braise', 'poulet braise', 'Poulet mariné puis grillé, servi avec une sauce piquante.', 30, 35, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Poisson braisé', 'poisson-braise', 'poisson braise', 'Poisson entier mariné aux épices puis grillé au charbon.', 20, 25, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Foutou banane', 'foutou-banane', 'foutou banane', 'Banane plantain et igname pilées ensemble, accompagnement traditionnel.', 20, 40, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Attiéké au poisson', 'attieke-au-poisson', 'attieke au poisson', 'Semoule de manioc fermentée servie avec du poisson grillé.', 15, 25, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Tô de mil', 'to-de-mil', 'to de mil', 'Pâte de mil ferme, accompagnement classique des sauces sahéliennes.', 10, 30, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Riz jollof', 'riz-jollof', 'riz jollof', 'Riz mijoté dans une sauce tomate épicée à l''ouest-africaine.', 15, 45, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Pâte de maïs blanche', 'pate-de-mais-blanche', 'pate de mais blanche', 'Pâte de maïs nature, base neutre pour accompagner les sauces.', 10, 25, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Gari foto', 'gari-foto', 'gari foto', 'Semoule de manioc sautée aux légumes, œufs et épices.', 15, 20, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000001', 'Akpessi', 'akpessi', 'akpessi', 'Riz épicé béninois cuit avec piment et tomate fraîche.', 15, 35, 4, 'moyen', 'community'),

  -- Entrée
  ('10000000-0000-0000-0000-000000000002', 'Salade d''avocat à la béninoise', 'salade-avocat-beninoise', 'salade d avocat a la beninoise', 'Avocat, tomate et oignon assaisonnés au citron et au piment.', 10, 0, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000002', 'Salade de concombre épicée', 'salade-concombre-epicee', 'salade de concombre epicee', 'Concombre frais relevé d''un assaisonnement citronné et pimenté.', 10, 0, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000002', 'Tchatchanga grillé', 'tchatchanga-grille', 'tchatchanga grille', 'Brochettes de bœuf marinées aux épices, grillées au charbon de bois.', 25, 15, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000002', 'Acra de poisson', 'acra-de-poisson', 'acra de poisson', 'Petits beignets de poisson émietté, épicés et frits.', 20, 15, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000002', 'Beignets de crevette', 'beignets-de-crevette', 'beignets de crevette', 'Crevettes enrobées de pâte légère et frites, en entrée conviviale.', 20, 15, 4, 'moyen', 'community'),

  -- Dessert
  ('10000000-0000-0000-0000-000000000003', 'Gâteau à la banane plantain', 'gateau-banane-plantain', 'gateau a la banane plantain', 'Gâteau moelleux à base de banane plantain bien mûre.', 20, 40, 8, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000003', 'Bofrot sucré', 'bofrot-sucre', 'bofrot sucre', 'Beignets sucrés moelleux, collation traditionnelle ouest-africaine.', 15, 15, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000003', 'Salade de fruits tropicaux', 'salade-fruits-tropicaux', 'salade de fruits tropicaux', 'Mangue, ananas et papaye coupés en dés, servis frais.', 15, 0, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000003', 'Gâteau de patate douce', 'gateau-patate-douce', 'gateau de patate douce', 'Gâteau dense et parfumé à la patate douce et à la noix de muscade.', 20, 45, 8, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000003', 'Akpan', 'akpan', 'akpan', 'Bouillie de maïs fermenté sucrée, servie fraîche en dessert.', 15, 0, 4, 'facile', 'community'),

  -- Sauce
  ('10000000-0000-0000-0000-000000000004', 'Sauce tomate épicée', 'sauce-tomate-epicee', 'sauce tomate epicee', 'Sauce tomate maison relevée au piment, base de nombreux plats.', 10, 25, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce arachide', 'sauce-arachide', 'sauce arachide', 'Sauce onctueuse à la pâte d''arachide, viande et légumes.', 15, 40, 6, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce graine', 'sauce-graine', 'sauce graine', 'Sauce à base de noix de palme, riche et parfumée.', 20, 50, 6, 'difficile', 'community'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce gombo', 'sauce-gombo', 'sauce gombo', 'Sauce filante au gombo frais, accompagne pâtes et riz.', 15, 30, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce feuille', 'sauce-feuille', 'sauce feuille', 'Sauce aux feuilles vertes locales mijotées à l''huile rouge.', 15, 30, 6, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000004', 'Sauce piment Ata din-din', 'sauce-piment-ata-din-din', 'sauce piment ata din din', 'Sauce pimentée concentrée, à utiliser avec modération.', 10, 15, 8, 'facile', 'community'),

  -- Boisson
  ('10000000-0000-0000-0000-000000000005', 'Bissap', 'bissap', 'bissap', 'Jus glacé d''hibiscus, sucré et parfumé à la menthe.', 15, 10, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000005', 'Jus de gingembre', 'jus-de-gingembre', 'jus de gingembre', 'Boisson rafraîchissante au gingembre frais, légèrement piquante.', 15, 0, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000005', 'Jus de tamarin', 'jus-de-tamarin', 'jus de tamarin', 'Jus acidulé à base de pulpe de tamarin, servi bien frais.', 20, 10, 6, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000005', 'Lait de coco maison', 'lait-de-coco-maison', 'lait de coco maison', 'Lait de coco pressé maison, base de nombreuses recettes sucrées.', 20, 0, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000005', 'Jus ananas-gingembre', 'jus-ananas-gingembre', 'jus ananas gingembre', 'Mélange rafraîchissant d''ananas frais et de gingembre.', 15, 0, 6, 'facile', 'community'),

  -- Bouillie & céréales
  ('10000000-0000-0000-0000-000000000006', 'Bouillie de maïs (Ogi)', 'bouillie-de-mais-ogi', 'bouillie de mais ogi', 'Bouillie légère de maïs fermenté, petit-déjeuner classique.', 10, 15, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Akassa', 'akassa', 'akassa', 'Boule de maïs fermenté cuite à la vapeur, servie avec une sauce.', 20, 30, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Bouillie de mil', 'bouillie-de-mil', 'bouillie de mil', 'Bouillie nourrissante à base de farine de mil et de lait.', 10, 15, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Pain à l''omelette', 'pain-a-l-omelette', 'pain a l omelette', 'Pain garni d''une omelette aux oignons et au piment, en-cas du matin.', 10, 10, 2, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Bouillie de soja (Tonwato)', 'bouillie-de-soja-tonwato', 'bouillie de soja tonwato', 'Bouillie protéinée à base de lait de soja maison.', 15, 20, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Bouillie de riz au lait', 'bouillie-de-riz-au-lait', 'bouillie de riz au lait', 'Riz cuit doucement dans du lait sucré à la vanille.', 10, 25, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Gari au lait', 'gari-au-lait', 'gari au lait', 'Semoule de manioc réhydratée au lait sucré, en-cas rapide.', 5, 0, 2, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000006', 'Bouillie d''avoine au gingembre', 'bouillie-avoine-gingembre', 'bouillie d avoine au gingembre', 'Bouillie d''avoine parfumée au gingembre frais et à la cannelle.', 10, 15, 4, 'facile', 'community'),

  -- Beignets & snacks
  ('10000000-0000-0000-0000-000000000007', 'Akara', 'akara', 'akara', 'Beignets de haricot niébé moulu, frits et croustillants.', 30, 15, 6, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000007', 'Koliko', 'koliko', 'koliko', 'Frites d''igname épicées, servies avec une sauce pimentée.', 15, 20, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000007', 'Chips de banane plantain', 'chips-banane-plantain', 'chips de banane plantain', 'Fines tranches de banane plantain frites et croustillantes.', 10, 15, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000007', 'Galettes de manioc', 'galettes-de-manioc', 'galettes de manioc', 'Galettes croustillantes à base de manioc râpé.', 20, 20, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000007', 'Samoussas à la viande', 'samoussas-a-la-viande', 'samoussas a la viande', 'Triangles croustillants farcis de viande hachée épicée.', 30, 15, 6, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000007', 'Beignets de patate douce', 'beignets-patate-douce', 'beignets de patate douce', 'Beignets moelleux à la patate douce, légèrement sucrés.', 20, 15, 6, 'facile', 'community'),

  -- Soupe
  ('10000000-0000-0000-0000-000000000008', 'Soupe de légumes', 'soupe-de-legumes', 'soupe de legumes', 'Soupe légère aux légumes de saison, réconfortante et simple.', 15, 30, 4, 'facile', 'community'),
  ('10000000-0000-0000-0000-000000000008', 'Soupe d''arachide', 'soupe-d-arachide', 'soupe d arachide', 'Soupe onctueuse à la pâte d''arachide et au poulet.', 15, 35, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000008', 'Soupe de poisson fumé', 'soupe-de-poisson-fume', 'soupe de poisson fume', 'Bouillon parfumé au poisson fumé et aux légumes.', 15, 30, 4, 'moyen', 'community'),
  ('10000000-0000-0000-0000-000000000008', 'Soupe gombo claire', 'soupe-gombo-claire', 'soupe gombo claire', 'Bouillon léger au gombo, servi chaud en entrée.', 10, 25, 4, 'facile', 'community');

-- ----------------------------------------------------------------------------
-- FEEDBACK_TEMPLATES — 4 messages par catégorie de note, mappés aux 3 emojis
-- 😊 = excellent · 😐 = correct · 😕 = decevant (décision projet docs/decisions.md #3)
-- ----------------------------------------------------------------------------
insert into feedback_templates (category, message, sort_order, is_active) values
  ('excellent', 'Excellent repas, toute la famille a adoré !', 1, true),
  ('excellent', 'Un délice, à refaire très vite !', 2, true),
  ('excellent', 'Parfait pour ce soir, rien à redire !', 3, true),
  ('excellent', 'Les enfants ont demandé une deuxième part !', 4, true),
  ('correct', 'Correct, mais manquait un peu de saveur.', 1, true),
  ('correct', 'Bien, sans être inoubliable.', 2, true),
  ('correct', 'Mangeable, sans plus.', 3, true),
  ('correct', 'Pas mal, à améliorer la prochaine fois.', 4, true),
  ('decevant', 'Pas apprécié cette fois-ci.', 1, true),
  ('decevant', 'Trop épicé pour les enfants.', 2, true),
  ('decevant', 'À éviter la prochaine fois.', 3, true),
  ('decevant', 'Le repas n''a pas plu, à revoir.', 4, true);
