-- ============================================================================
-- MenuFamille — Migration 0014 — Seed recipe_type + recettes manquantes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Reclassifier les recettes existantes
-- ----------------------------------------------------------------------------

-- Accompagnements (feculents servis avec une sauce)
update recipes set recipe_type = 'accompagnement'
where name in (
  'Igname pilée',
  'Tô de mil',
  'Pâte de maïs blanche',
  'Akassa'
);

-- Sauces (necessitent un accompagnement)
update recipes set recipe_type = 'sauce'
where name in (
  'Sauce tomate épicée',
  'Sauce arachide',
  'Sauce graine',
  'Sauce gombo',
  'Sauce feuille',
  'Sauce piment Ata din-din'
);

-- Boissons
update recipes set recipe_type = 'boisson'
where name in (
  'Bissap',
  'Jus de gingembre',
  'Jus de tamarin',
  'Lait de coco maison',
  'Jus ananas-gingembre',
  'Bouillie de mil'
);

-- ----------------------------------------------------------------------------
-- 2. Accompagnements manquants
-- ----------------------------------------------------------------------------
insert into recipes
  (category_id, name, slug, name_fingerprint, description, servings, difficulty, visibility, recipe_type)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Alloco',
    'alloco',
    'alloco',
    'Tranches de banane plantain mûre frites, accompagnement classique des grillades.',
    4, 'facile', 'community', 'accompagnement'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Gari',
    'gari',
    'gari',
    'Semoule de manioc fermentée et séchée, accompagnement neutre polyvalent.',
    4, 'facile', 'community', 'accompagnement'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Attiéké',
    'attieke',
    'attieke',
    'Semoule de manioc fermenté à la texture légère, accompagnement ivoirien populaire au Bénin.',
    4, 'facile', 'community', 'accompagnement'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Couscous de mil',
    'couscous-de-mil',
    'couscous de mil',
    'Couscous à base de farine de mil, accompagnement sahélien des sauces riches.',
    4, 'moyen', 'community', 'accompagnement'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Riz blanc',
    'riz-blanc',
    'riz blanc',
    'Riz cuit à l''eau, base neutre qui accompagne toutes les sauces.',
    4, 'facile', 'community', 'accompagnement'
  )
on conflict (slug) do update set recipe_type = excluded.recipe_type;

-- ----------------------------------------------------------------------------
-- 3. Boissons locales manquantes
-- ----------------------------------------------------------------------------
insert into recipes
  (category_id, name, slug, name_fingerprint, description, servings, difficulty, visibility, recipe_type)
values
  (
    '10000000-0000-0000-0000-000000000005',
    'Dégué',
    'degue',
    'degue',
    'Boisson fraîche à base de lait fermenté et de mil, sucrée à volonté.',
    4, 'facile', 'community', 'boisson'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Zoom-koom',
    'zoom-koom',
    'zoom koom',
    'Boisson fermentée de mil légèrement acidulée, rafraîchissante et énergisante.',
    4, 'moyen', 'community', 'boisson'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Lait de soja local',
    'lait-de-soja-local',
    'lait de soja local',
    'Lait végétal préparé à partir de soja local, léger et protéiné.',
    4, 'moyen', 'community', 'boisson'
  )
on conflict (slug) do update set recipe_type = excluded.recipe_type;
