import { redirect } from 'next/navigation'

// Ancienne adresse des résultats du sondage, conservée pour les liens existants.
export default function LegacySurveyResultsPage({ params }: { params: { id: string } }) {
  redirect(`/votes/results?plan=${params.id}`)
}
