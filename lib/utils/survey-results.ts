import { composedName } from '@/lib/utils/composed-name'
import { agreementPct, sumCounts, type ReactionCounts } from '@/lib/utils/survey-score'

export type Reaction = 'aime' | 'bof' | 'naime_pas'

export const RESULT_ITEMS_SELECT =
  'id, meal_type, day_of_week, applies_all_days, recipes ( name, photo_url, description ), meal_compositions ( role, sort_order, recipes ( name ) )'
export const RESULT_RESPONSES_SELECT =
  'id, user_id, respondent_name, created_at, survey_answers ( meal_plan_item_id, reaction, comment )'

type RawAnswer = { meal_plan_item_id: string; reaction: Reaction; comment: string | null }
type RawRecipe = { name: string; photo_url: string | null; description: string | null } | null
type RawComp   = { role: string; sort_order: number; recipes: { name: string } | null }

export interface RawResultItem {
  id: string; meal_type: string; day_of_week: string; applies_all_days: boolean
  recipes: unknown; meal_compositions: unknown
}
export interface RawResultResponse {
  id: string; user_id: string | null; respondent_name: string; created_at: string
  survey_answers: unknown
}

export interface ResultComment { respondent_name: string; comment: string; created_at: string }

// Agrège les réponses par repas — source commune des vues Planificatrice et Membre.
export function aggregateSurvey(items: RawResultItem[], responses: RawResultResponse[]) {
  const byItem = new Map<string, ReactionCounts & { comments: ResultComment[] }>()
  for (const item of items) byItem.set(item.id, { aime: 0, bof: 0, naime_pas: 0, comments: [] })

  let commentCount = 0
  const ratedItemIds = new Set<string>()

  for (const resp of responses) {
    for (const answer of (resp.survey_answers as RawAnswer[]) ?? []) {
      const agg = byItem.get(answer.meal_plan_item_id)
      if (!agg) continue
      agg[answer.reaction]++
      ratedItemIds.add(answer.meal_plan_item_id)
      if (answer.comment?.trim()) {
        agg.comments.push({ respondent_name: resp.respondent_name, comment: answer.comment.trim(), created_at: resp.created_at })
        commentCount++
      }
    }
  }

  const itemResults = items.map(item => {
    const agg    = byItem.get(item.id) ?? { aime: 0, bof: 0, naime_pas: 0, comments: [] }
    const recipe = item.recipes as RawRecipe
    const comps  = (item.meal_compositions as RawComp[]) ?? []
    const sorted = [...comps].sort((a, b) => a.sort_order - b.sort_order)
    return {
      id:               item.id,
      meal_type:        item.meal_type,
      day_of_week:      item.day_of_week,
      applies_all_days: item.applies_all_days,
      recipe_name:      composedName(recipe?.name, comps),
      main_name:        recipe?.name ?? null,
      photo_url:        recipe?.photo_url ?? null,
      description:      recipe?.description ?? null,
      side_names:       sorted.filter(c => c.role === 'side' && c.recipes).map(c => c.recipes!.name),
      drink_name:       sorted.find(c => c.role === 'drink' && c.recipes)?.recipes?.name ?? null,
      aime:             agg.aime,
      bof:              agg.bof,
      naime_pas:        agg.naime_pas,
      comments:         agg.comments,
    }
  })

  return {
    itemResults,
    globalScore:     agreementPct(sumCounts(itemResults)),
    ratedItemsCount: ratedItemIds.size,
    commentCount,
    respondents: responses
      .map(r => ({ name: r.respondent_name, voted_at: r.created_at }))
      .sort((a, b) => b.voted_at.localeCompare(a.voted_at)),
  }
}
