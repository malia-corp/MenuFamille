'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Scale,
  Share2,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { ShareActions, appSharePayload } from '@/components/ui/share-actions'
import { DietaryPrefsSheet } from '@/components/settings/dietary-prefs-sheet'
import { toast } from '@/lib/stores/toast-store'
import { logout } from '@/lib/utils/logout'
import type { Pref } from '@/lib/constants/dietary-pref'

const ROW = 'flex min-h-[56px] w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[var(--kkb-bg)]'

function RowContent({ icon: Icon, label, sub, chevron = true }: {
  icon:     LucideIcon
  label:    string
  sub?:     string
  chevron?: boolean
}) {
  return (
    <>
      <Icon className="h-5 w-5 shrink-0 text-[var(--kkb-text-tertiary)]" />
      <span className="min-w-0 flex-1">
        <span className="block font-quicksand text-[15px] font-semibold text-[var(--kkb-text-primary)]">{label}</span>
        {sub && <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">{sub}</span>}
      </span>
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />}
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="px-1 font-quicksand text-[11px] font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">{label}</p>
      <div className="divide-y-[0.5px] divide-[var(--kkb-border)] overflow-hidden rounded-[var(--kkb-radius-card)] border border-[var(--kkb-border)] bg-white">
        {children}
      </div>
    </section>
  )
}

function prefsSummary(prefs: Pref[]): string {
  if (prefs.length === 0) return 'Allergies, goûts et coups de cœur'
  const allergies = prefs.filter(p => p.pref_type === 'allergy').length
  const others    = prefs.length - allergies
  return [
    allergies > 0 ? `${allergies} allergie${allergies > 1 ? 's' : ''}` : null,
    others > 0 ? `${others} goût${others > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')
}

export default function SettingsPage() {
  const router = useRouter()
  const [prefs,     setPrefs]     = useState<Pref[]>([])
  const [prefsOpen, setPrefsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/users/me/dietary-prefs')
      .then(r => r.json())
      .then(res => setPrefs(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
  }, [])

  const soon = () => toast.info('Bientôt disponible')

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-5 lg:pt-2">
      <h1 className="hidden font-dosis text-xl font-bold text-[var(--kkb-text-primary)] lg:block">Paramètres</h1>

      <Section label="Planification">
        <Link href="/settings/meal-config" className={ROW}>
          <RowContent icon={CalendarDays} label="Rythme des repas" sub="Repas actifs et fréquence" />
        </Link>
        <Link href="/settings/notifications" className={ROW}>
          <RowContent icon={Bell} label="Notifications" sub="Rappels de repas et avis" />
        </Link>
        <Link href="/circle" className={ROW}>
          <RowContent icon={Users} label="Mon cercle familial" sub="Membres et code d'invitation" />
        </Link>
      </Section>

      <Section label="Mes préférences">
        <button type="button" onClick={() => setPrefsOpen(true)} className={ROW}>
          <RowContent icon={UtensilsCrossed} label="Préférences alimentaires" sub={prefsSummary(prefs)} />
        </button>
        <button type="button" onClick={soon} className={ROW}>
          <RowContent icon={Globe} label="Langue & Unités culinaires" sub="Français · Mesures locales" />
        </button>
        <button type="button" onClick={soon} className={ROW}>
          <RowContent icon={Scale} label="Unités de mesure" sub="Grammes, louches, tasses…" />
        </button>
      </Section>

      <Section label="Application">
        <button type="button" onClick={soon} className={ROW}>
          <RowContent icon={HelpCircle} label="Aide & Astuces familiales" />
        </button>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 shrink-0 text-[var(--kkb-text-tertiary)]" />
            <span className="min-w-0 flex-1">
              <span className="block font-quicksand text-[15px] font-semibold text-[var(--kkb-text-primary)]">Partager KeskonBouf</span>
              <span className="block font-quicksand text-xs text-[var(--kkb-text-tertiary)]">Fais découvrir l&apos;application à tes proches</span>
            </span>
          </div>
          <ShareActions
            getPayload={appSharePayload}
            buttonClassName="flex-1 flex items-center justify-center gap-1.5 rounded-[var(--kkb-radius-pill)] py-2.5 font-quicksand font-bold text-sm border border-[var(--kkb-border)] text-[var(--kkb-text-secondary)] hover:border-[var(--kkb-coral)] hover:text-[var(--kkb-coral)] transition-colors disabled:opacity-60"
          />
        </div>
        <div className={ROW + ' hover:bg-transparent'}>
          <RowContent icon={Info} label="Version" sub="KeskonBouf v1.0 · PWA Bénin & Afrique" chevron={false} />
        </div>
      </Section>

      <Section label="Compte">
        <button type="button" onClick={() => void handleLogout()} className={ROW + ' hover:bg-[var(--kkb-coral-light)]'}>
          <LogOut className="h-5 w-5 shrink-0 text-[var(--kkb-coral)]" />
          <span className="flex-1 font-quicksand text-[15px] font-semibold text-[var(--kkb-coral)]">Se déconnecter</span>
        </button>
      </Section>

      {prefsOpen && (
        <DietaryPrefsSheet prefs={prefs} onChange={setPrefs} onClose={() => setPrefsOpen(false)} />
      )}
    </div>
  )
}
