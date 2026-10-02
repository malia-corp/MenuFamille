-- ============================================================================
-- MenuFamille — Migration 0020 — Dedoublonnage + contrainte unique meal_plans
-- ============================================================================
--
-- Bug trouve en test : GET /api/meal-plans et POST /api/meal-plans/generate
-- cherchaient le plan de la semaine via .maybeSingle() sans jamais verifier
-- l'erreur retournee. Des qu'une course entre deux requetes (double-clic,
-- double effet React en dev, ou les deux boutons "Generer" declenches
-- simultanement) creait un premier doublon pour un (user_id, week_start),
-- .maybeSingle() se mettait a echouer silencieusement sur CE couple a
-- chaque appel suivant (plus d'une ligne = erreur Postgrest ignoree) : le
-- generateur croyait alors qu'aucun plan n'existait et en recreait un
-- complet a chaque clic, aggravant le doublon indefiniment (jusqu'a 6
-- lignes constatees pour un seul couple). Cote client, la ligne malformee
-- renvoyee par l'erreur HTTP 500 qui en resultait faisait ensuite planter
-- le rendu (`items.some(...)` sur `meal_plan_items` undefined).
--
-- Corrige cote code dans la meme passe (select sans .maybeSingle(), verifs
-- defensives cote client). Cette migration nettoie les doublons deja
-- accumules et pose une contrainte unique pour qu'il n'y en ait plus jamais.

-- Un plan "finalise" reste volontairement en historique quand on regenere
-- la meme semaine (POST /api/meal-plans/generate en cree un nouveau, brouillon,
-- à côté — voir ce fichier) : plusieurs lignes finalisees peuvent donc
-- legitimement coexister pour un meme (user_id, week_start). Seuls les
-- doublons de lignes NON finalisees (brouillon/partage) sont un vrai bug —
-- on ne garde que la plus pertinente (le plus de repas, sinon la plus
-- recente) et on supprime le reste.
with ranked as (
  select
    mp.id,
    row_number() over (
      partition by mp.user_id, mp.week_start
      order by
        (select count(*) from meal_plan_items mpi where mpi.meal_plan_id = mp.id) desc,
        mp.created_at desc
    ) as rn
  from meal_plans mp
  where mp.status <> 'finalized'
)
delete from meal_plans
where id in (select id from ranked where rn > 1);

-- Contrainte unique partielle : au plus une ligne active (brouillon/partagee)
-- par (user_id, week_start) — les lignes finalisees ne sont pas comptees,
-- pour ne pas casser le flux "regenerer apres validation".
create unique index meal_plans_user_week_unique_active
  on meal_plans (user_id, week_start)
  where status <> 'finalized';
