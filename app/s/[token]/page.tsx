import type { Metadata } from 'next'
import { resolveSurveyPlan } from '@/lib/utils/survey-token'
import { formatWeekRange } from '@/lib/utils/week'
import { SurveyPageClient } from './_survey-page-client'

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const resolved = await resolveSurveyPlan(params.token)
  if (resolved.status !== 'ok') return { title: 'Menu partagé — KeskonBouf' }

  return { title: `Menu ${formatWeekRange(resolved.plan.week_start)} — KeskonBouf` }
}

export default function SharedMenuPage({ params }: { params: { token: string } }) {
  return <SurveyPageClient token={params.token} />
}
