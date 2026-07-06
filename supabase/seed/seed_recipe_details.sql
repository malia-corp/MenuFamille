-- ============================================================================
-- MenuFamille — Seed détails recettes (ingrédients + étapes)
-- À exécuter dans Supabase Dashboard → SQL Editor
-- Utilise les slugs pour retrouver les recipe_id sans dépendre des UUIDs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Riz au gras
-- ----------------------------------------------------------------------------
DO $$
DECLARE rid uuid;
BEGIN
  SELECT id INTO rid FROM recipes WHERE slug = 'riz-au-gras';
  IF rid IS NULL THEN RAISE NOTICE 'riz-au-gras introuvable, skip'; RETURN; END IF;

  INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, sort_order) VALUES
    (rid, 'Riz long grain',          500,  'g',    1),
    (rid, 'Tomates concassées',      400,  'g',    2),
    (rid, 'Viande de bœuf',          300,  'g',    3),
    (rid, 'Huile de palme',          50,   'ml',   4),
    (rid, 'Oignon',                  1,    null,   5),
    (rid, 'Poivron rouge',           1,    null,   6),
    (rid, 'Cube de bouillon',        1,    null,   7),
    (rid, 'Sel et poivre',           null, null,   8);

  INSERT INTO recipe_steps (recipe_id, step_number, description) VALUES
    (rid, 1, 'Faire dorer les morceaux de viande dans l''huile de palme chaude sur toutes les faces. Réserver sur une assiette.'),
    (rid, 2, 'Dans la même huile, faire revenir l''oignon et le poivron émincés 3 min. Ajouter les tomates concassées et le cube de bouillon. Laisser mijoter 10 min en remuant.'),
    (rid, 3, 'Ajouter la viande réservée et le riz lavé. Couvrir d''eau à hauteur (environ 2 fois le volume du riz). Porter à ébullition, puis cuire à feu doux 25–30 min à couvert.'),
    (rid, 4, 'Vérifier la cuisson du riz, rectifier le sel. Servir chaud, garni de rondelles de poivron.');
END $$;

-- ----------------------------------------------------------------------------
-- 2. Sauce arachide
-- ----------------------------------------------------------------------------
DO $$
DECLARE rid uuid;
BEGIN
  SELECT id INTO rid FROM recipes WHERE slug = 'sauce-arachide';
  IF rid IS NULL THEN RAISE NOTICE 'sauce-arachide introuvable, skip'; RETURN; END IF;

  INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, sort_order) VALUES
    (rid, 'Pâte d''arachide',        200,  'g',    1),
    (rid, 'Poulet ou viande',        500,  'g',    2),
    (rid, 'Tomates fraîches',        3,    null,   3),
    (rid, 'Oignon',                  1,    null,   4),
    (rid, 'Piment frais',            1,    null,   5),
    (rid, 'Huile végétale',          30,   'ml',   6),
    (rid, 'Sel',                     null, null,   7);

  INSERT INTO recipe_steps (recipe_id, step_number, description) VALUES
    (rid, 1, 'Faire chauffer l''huile dans une cocotte. Faire revenir les morceaux de viande jusqu''à coloration dorée. Réserver.'),
    (rid, 2, 'Mixer les tomates, l''oignon et le piment. Verser dans la cocotte et faire cuire ce mélange à feu moyen 5 min.'),
    (rid, 3, 'Diluer la pâte d''arachide dans 500 ml d''eau tiède jusqu''à obtenir un mélange homogène. L''ajouter dans la cocotte avec la viande réservée.'),
    (rid, 4, 'Laisser mijoter à feu doux 30–40 min en remuant régulièrement pour éviter que la sauce attache. Rectifier le sel avant de servir.');
END $$;

-- ----------------------------------------------------------------------------
-- 3. Poulet braisé
-- ----------------------------------------------------------------------------
DO $$
DECLARE rid uuid;
BEGIN
  SELECT id INTO rid FROM recipes WHERE slug = 'poulet-braise';
  IF rid IS NULL THEN RAISE NOTICE 'poulet-braise introuvable, skip'; RETURN; END IF;

  INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, sort_order) VALUES
    (rid, 'Poulet entier découpé',   1,    null,   1),
    (rid, 'Oignons',                 2,    null,   2),
    (rid, 'Ail',                     4,    'gousses', 3),
    (rid, 'Piments frais',           2,    null,   4),
    (rid, 'Citron (jus)',            1,    null,   5),
    (rid, 'Huile végétale',          50,   'ml',   6),
    (rid, 'Thym séché',              1,    'c.à.c',7),
    (rid, 'Sel et poivre',           null, null,   8);

  INSERT INTO recipe_steps (recipe_id, step_number, description) VALUES
    (rid, 1, 'Préparer la marinade : mixer les oignons, l''ail, les piments, le jus de citron, le thym, le sel et le poivre. Badigeonner généreusement les morceaux de poulet et laisser mariner au moins 1 h (idéalement toute une nuit au réfrigérateur).'),
    (rid, 2, 'Faire chauffer l''huile dans une grande cocotte à feu vif. Faire revenir le poulet mariné sur toutes les faces jusqu''à obtenir une belle coloration dorée, environ 5 min par face.'),
    (rid, 3, 'Réduire le feu à moyen-doux, couvrir et cuire 25 min en retournant les morceaux à mi-cuisson. Arroser régulièrement avec le jus de cuisson pour que la viande reste moelleuse.'),
    (rid, 4, 'Ôter le couvercle et monter le feu à vif pendant 5 min pour caraméliser et croustiller la peau. Servir chaud avec le fond de sauce réduit.');
END $$;

-- ----------------------------------------------------------------------------
-- 4. Igname pilée
-- ----------------------------------------------------------------------------
DO $$
DECLARE rid uuid;
BEGIN
  SELECT id INTO rid FROM recipes WHERE slug = 'igname-pilee';
  IF rid IS NULL THEN RAISE NOTICE 'igname-pilee introuvable, skip'; RETURN; END IF;

  INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, sort_order) VALUES
    (rid, 'Igname blanche',          1,    'kg',   1),
    (rid, 'Eau de cuisson',          null, null,   2),
    (rid, 'Sel',                     null, null,   3);

  INSERT INTO recipe_steps (recipe_id, step_number, description) VALUES
    (rid, 1, 'Éplucher l''igname, la couper en gros morceaux réguliers et la rincer. Placer dans une grande casserole, couvrir d''eau salée et porter à ébullition.'),
    (rid, 2, 'Cuire 30–40 min jusqu''à ce que l''igname soit tendre et s''écrase facilement à la fourchette. Égoutter en conservant un peu d''eau de cuisson.'),
    (rid, 3, 'Transférer les morceaux chauds dans un mortier traditionnel (ou un grand bol épais). Piler vigoureusement en ajoutant quelques cuillères d''eau de cuisson pour obtenir une pâte lisse et homogène sans grumeaux.'),
    (rid, 4, 'Façonner en boules à l''aide d''une cuillère mouillée. Servir immédiatement avec la sauce de votre choix (sauce graine, sauce gombo, sauce tomate).');
END $$;
