import { LogoLoaderScreen } from '@/components/brand/logo-loader'

// Lien du sondage ouvert par la famille : le logo animé pendant que le
// serveur vérifie le lien.
export default function SurveyLoading() {
  return <LogoLoaderScreen label="Le menu de la semaine arrive…" className="min-h-screen bg-[var(--kkb-bg)]" />
}
