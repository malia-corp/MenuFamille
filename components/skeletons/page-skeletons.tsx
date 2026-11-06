import { Bone, BoneCard, SkeletonPage } from '@/components/ui/skeleton'

// Squelettes de chargement par page : mêmes conteneurs et grilles que les
// pages chargées (mobile puis desktop, classes lg:), pour que le contenu
// arrive à sa place sans saut. À garder en phase quand une page change de
// mise en page.

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

// ─── Profil ──────────────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  const title = <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-28 rounded" /></div>
  return (
    <SkeletonPage label="Chargement du profil" className="mx-auto max-w-lg px-4 pb-10 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-8 lg:space-y-5">
        {/* Bandeau vert */}
        <div className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:p-6">
          <div className="flex items-center gap-4">
            <Bone dark className="h-[72px] w-[72px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone dark className="h-3.5 w-20 rounded" />
              <Bone dark className="h-8 w-44 rounded-lg" />
              <Bone dark className="h-6 w-40 rounded-full" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {range(3).map((i) => <Bone dark key={i} className="h-[62px] rounded-[var(--kkb-r-md)]" />)}
          </div>
        </div>
        {/* Mon assiette */}
        <BoneCard className="space-y-3 p-5">
          {title}
          <div className="flex flex-wrap gap-1.5">
            {range(5).map((i) => <Bone key={i} className="h-7 w-20 rounded-full" />)}
          </div>
          <Bone className="h-3 w-3/4 rounded" />
        </BoneCard>
        </div>
        <div className="space-y-4 lg:col-span-4 lg:space-y-5">
        {/* Mon cercle */}
        <BoneCard className="space-y-3 p-5">
          {title}
          {range(3).map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-9 w-9 shrink-0 rounded-full" />
              <Bone className="h-3.5 flex-1 rounded" />
            </div>
          ))}
          <Bone className="h-11 rounded-full" />
        </BoneCard>
        {/* Réglages */}
        <BoneCard className="space-y-2 p-5">
          {title}
          {range(4).map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Bone className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3.5 w-1/2 rounded" />
                <Bone className="h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </BoneCard>
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Rythme des repas ────────────────────────────────────────────────────────

export function MealConfigSkeleton() {
  return (
    <SkeletonPage label="Chargement du rythme des repas" className="mx-auto max-w-lg px-4 pb-32 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Bandeau vert */}
        <div className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between">
            <Bone dark className="h-3.5 w-48 rounded" />
            <Bone dark className="h-10 w-10 rounded-full" />
          </div>
          <Bone dark className="mt-2 h-8 w-56 rounded-lg" />
          <Bone dark className="mt-2 h-3.5 w-full max-w-md rounded" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {range(3).map((i) => <Bone dark key={i} className="h-[62px] rounded-[var(--kkb-r-md)]" />)}
          </div>
        </div>
        {/* Aperçu */}
        <BoneCard className="order-last space-y-3 p-5 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-40 rounded" /></div>
          {range(5).map((i) => <Bone key={i} className="h-7 rounded-[var(--kkb-r-sm)]" />)}
          <Bone className="h-4 w-48 rounded" />
        </BoneCard>
        {/* Cartes des repas */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:gap-4">
          {range(4).map((i) => (
            <BoneCard key={i} className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-28 rounded" />
                  <Bone className="h-3 w-20 rounded" />
                </div>
                <Bone className="h-6 w-11 rounded-full" />
              </div>
              <Bone className="h-[52px] rounded-[var(--kkb-r-lg)]" />
              <Bone className="h-11 rounded-full" />
              <Bone className="h-3 w-4/5 rounded" />
            </BoneCard>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function NotificationsSkeleton() {
  return (
    <SkeletonPage label="Chargement des notifications" className="mx-auto max-w-lg px-4 pb-32 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Bandeau vert */}
        <div className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between">
            <Bone dark className="h-3.5 w-24 rounded" />
            <Bone dark className="h-10 w-10 rounded-full" />
          </div>
          <Bone dark className="mt-2 h-8 w-48 rounded-lg" />
          <Bone dark className="mt-2 h-3.5 w-full max-w-md rounded" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {range(3).map((i) => <Bone dark key={i} className="h-[62px] rounded-[var(--kkb-r-md)]" />)}
          </div>
        </div>
        {/* Bon à savoir */}
        <BoneCard className="order-last space-y-3 p-5 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-28 rounded" /></div>
          {range(3).map((i) => <Bone key={i} className="h-10 rounded" />)}
        </BoneCard>
        {/* Un repas par carte */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:gap-4">
          {range(4).map((i) => (
            <BoneCard key={i} className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-24 rounded" />
                  <Bone className="h-3 w-20 rounded" />
                </div>
              </div>
              <Bone className="h-[52px] rounded-[var(--kkb-r-lg)]" />
              <Bone className="h-[52px] rounded-[var(--kkb-r-lg)]" />
            </BoneCard>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Cercle familial ─────────────────────────────────────────────────────────

export function CircleSkeleton() {
  return (
    <SkeletonPage label="Chargement du cercle" className="mx-auto max-w-lg px-4 pb-8 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Bandeau vert */}
        <div className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:row-start-1 lg:p-6">
          <Bone dark className="h-3.5 w-36 rounded" />
          <Bone dark className="mt-2 h-8 w-56 rounded-lg" />
          <Bone dark className="mt-3 h-3.5 w-full max-w-md rounded" />
          <div className="mt-4 flex items-center gap-3">
            <Bone dark className="h-8 w-28 rounded-full" />
            <Bone dark className="h-8 w-36 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-5">
            {range(3).map((i) => <Bone dark key={i} className="h-[62px] rounded-[var(--kkb-r-md)]" />)}
          </div>
        </div>
        {/* Inviter à table */}
        <BoneCard className="space-y-3 p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1">
          <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-32 rounded" /></div>
          <Bone className="h-[76px] rounded-[var(--kkb-r-lg)]" />
          <Bone className="h-3 w-full rounded" />
          <div className="grid grid-cols-2 gap-2">
            {range(4).map((i) => <Bone key={i} className="h-11 rounded-full" />)}
          </div>
        </BoneCard>
        {/* La tablée */}
        <div className="space-y-3 pt-2 lg:col-span-8 lg:row-start-2 lg:pt-3">
          <Bone className="h-6 w-36 rounded" />
          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            {range(4).map((i) => (
              <div key={i} className="space-y-3 rounded-[var(--kkb-r-lg)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <Bone className="h-11 w-11 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-4 w-1/2 rounded" />
                    <Bone className="h-4 w-24 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {range(3).map((j) => <Bone key={j} className="h-6 w-20 rounded-full" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Moments de repas */}
        <div className="lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:pt-3">
          <BoneCard className="space-y-3 p-5">
            <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-40 rounded" /></div>
            {range(4).map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-9 w-9 shrink-0 rounded-[var(--kkb-r-md)]" />
                <Bone className="h-3.5 flex-1 rounded" />
                <Bone className="h-3.5 w-24 rounded" />
              </div>
            ))}
          </BoneCard>
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Mes avis (feedback) ─────────────────────────────────────────────────────

export function FeedbackSkeleton() {
  return (
    <SkeletonPage label="Chargement de tes avis" className="mx-auto max-w-lg px-4 pb-8 pt-5 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="mb-6 space-y-2">
        <Bone className="h-3 w-28 rounded" />
        <Bone className="h-7 w-64 rounded-lg" />
        <Bone className="h-3.5 w-4/5 max-w-xl rounded" />
      </div>
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:space-y-0">
        <BoneCard className="overflow-hidden">
          <Bone className="h-[200px] rounded-none lg:h-[300px]" />
          <div className="space-y-4 p-4 lg:p-6">
            <Bone className="h-5 w-3/5 rounded" />
            <div className="grid grid-cols-3 gap-2">
              {range(3).map((i) => <Bone key={i} className="h-20 rounded-[var(--kkb-r-lg)]" />)}
            </div>
            <div className="flex flex-wrap gap-2">
              {['w-28', 'w-36', 'w-24', 'w-32'].map((w) => <Bone key={w} className={`h-8 rounded-full ${w}`} />)}
            </div>
          </div>
        </BoneCard>
        <div className="space-y-3">
          <Bone className="h-5 w-40 rounded" />
          <BoneCard className="divide-y divide-[var(--kkb-lin)]">
            {range(4).map((i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3.5 w-3/4 rounded" />
                  <Bone className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </BoneCard>
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Accueil membre ──────────────────────────────────────────────────────────

export function MemberHomeSkeleton() {
  return (
    <SkeletonPage label="Chargement de l'accueil" className="mx-auto max-w-sm px-4 pb-8 lg:max-w-none lg:px-0">
      <div className="space-y-7 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-7 lg:col-span-8">
          <section className="space-y-2.5 pt-3 lg:pt-0">
            <Bone className="h-4 w-28 rounded" />
            <Bone className="h-7 w-60 rounded-lg" />
            <Bone className="h-7 w-44 rounded-lg lg:hidden" />
            <Bone className="h-7 w-56 rounded-full" />
          </section>
          <Bone className="h-36 rounded-[var(--kkb-r-xl)]" />
          <section className="space-y-3">
            <Bone className="h-6 w-28 rounded" />
            <BoneCard className="overflow-hidden p-1.5">
              <Bone className="aspect-[5/4] rounded-[var(--kkb-r-lg)] lg:aspect-[16/7]" />
              <div className="space-y-2 p-3">
                <Bone className="h-3.5 w-4/5 rounded" />
                <Bone className="h-3.5 w-1/2 rounded" />
              </div>
            </BoneCard>
          </section>
          <section className="space-y-3">
            <Bone className="h-6 w-36 rounded" />
            <div className="flex gap-2.5 overflow-hidden xl:grid xl:grid-cols-7">
              {range(7).map((i) => <Bone key={i} className="h-24 w-36 shrink-0 rounded-[var(--kkb-r-xl)] xl:w-auto" />)}
            </div>
          </section>
        </div>
        <section className="space-y-3 lg:col-span-4">
          <Bone className="h-6 w-28 rounded" />
          <BoneCard className="divide-y divide-[var(--kkb-lin)]">
            {range(3).map((i) => (
              <div key={i} className="flex gap-3 p-3.5">
                <Bone className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3.5 w-3/4 rounded" />
                  <Bone className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </BoneCard>
        </section>
      </div>
    </SkeletonPage>
  )
}

// ─── Résultats du sondage ────────────────────────────────────────────────────

export function ResultsSkeleton() {
  // Liste de la carte « Les plus appréciés » / « À revoir » / « Qui a répondu ».
  const listRows = (n: number) => range(n).map((i) => (
    <div key={i} className="flex items-center gap-3 py-2">
      <Bone className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-2/3 rounded" />
        <Bone className="h-3 w-1/3 rounded" />
      </div>
      <Bone className="h-4 w-14 shrink-0 rounded" />
    </div>
  ))
  const cardTitle = <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-36 rounded" /></div>

  return (
    <SkeletonPage label="Chargement des résultats" className="mx-auto max-w-lg space-y-6 px-4 pb-8 pt-2 lg:max-w-none lg:space-y-8 lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Bandeau vert */}
        <div className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:row-start-1 lg:p-6">
          <Bone dark className="h-3.5 w-48 rounded" />
          <Bone dark className="mt-2 h-8 w-64 rounded-lg" />
          <div className="mt-4 flex items-center gap-4 lg:gap-6">
            <Bone dark className="h-[104px] w-[104px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-2.5">
              <Bone dark className="h-6 w-36 rounded" />
              <Bone dark className="h-3.5 w-full max-w-xs rounded" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2.5">
            <Bone dark className="h-7 w-28 rounded-full" />
            <Bone dark className="h-3 w-24 rounded" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:pt-5">
            <Bone dark className="h-11 w-full rounded-full sm:w-40" />
            {range(3).map((i) => <Bone dark key={i} className="h-11 flex-1 rounded-full sm:w-32 sm:flex-none" />)}
          </div>
        </div>
        {/* Les plus appréciés, À revoir */}
        {range(2).map((i) => (
          <div key={i} className="rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-6 lg:row-start-2">
            {cardTitle}
            <div className="mt-3">{listRows(3)}</div>
          </div>
        ))}
        {/* Qui a répondu */}
        <div className="rounded-[var(--kkb-r-xl)] bg-white p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1">
          {cardTitle}
          <div className="mt-3">{listRows(4)}</div>
          <Bone className="mt-3 h-10 rounded-full" />
        </div>
      </div>

      {/* Repas par repas */}
      <div className="space-y-4">
        <Bone className="h-6 w-44 rounded" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-11 w-56 rounded-full" />
          <Bone className="h-9 w-48 rounded-full" />
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {range(6).map((i) => <Bone key={i} className="h-8 w-20 shrink-0 rounded-full" />)}
        </div>
        <Bone className="h-4 w-28 rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
          {range(4).map((i) => (
            <div key={i} className="space-y-3 rounded-[var(--kkb-r-lg)] bg-white p-4">
              <div className="flex items-center gap-3">
                <Bone className="h-12 w-12 shrink-0 rounded-[var(--kkb-r-md)]" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-3 w-1/3 rounded" />
                  <Bone className="h-4 w-2/3 rounded" />
                </div>
              </div>
              <Bone className="h-2 rounded-full" />
              <Bone className="h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Menu de la semaine (/plan) ──────────────────────────────────────────────

// Corps de la page, sous le bandeau (posé dans le conteneur de la page).
export function PlanBodySkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement du menu de la semaine">
    <div aria-hidden="true">
      {/* Mobile : jours puis repas du jour */}
      <div className="-mx-4 space-y-4 lg:hidden">
        <div className="mx-4 grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] bg-white p-1.5">
          {range(7).map((i) => <Bone key={i} className="h-[60px] rounded-[var(--kkb-r-md)]" />)}
        </div>
        <div className="flex items-baseline justify-between px-5">
          <Bone className="h-6 w-24 rounded" />
          <Bone className="h-3.5 w-28 rounded" />
        </div>
        <div className="space-y-3">
          {range(4).map((i) => (
            <BoneCard key={i} className="mx-4 flex gap-3 p-2">
              <Bone className="h-[112px] w-[96px] shrink-0 rounded-[var(--kkb-r-lg)]" />
              <div className="flex-1 space-y-2 py-1">
                <Bone className="h-3 w-24 rounded" />
                <Bone className="h-4 w-4/5 rounded" />
                <Bone className="h-3 w-1/2 rounded" />
              </div>
            </BoneCard>
          ))}
        </div>
      </div>
      {/* Desktop : bascule et grille de la semaine */}
      <div className="hidden space-y-4 lg:block">
        <Bone className="h-11 w-72 rounded-full" />
        <BoneCard className="p-4 xl:p-5">
          <div className="grid grid-cols-[112px_repeat(7,minmax(0,1fr))] gap-2 xl:grid-cols-[132px_repeat(7,minmax(0,1fr))]">
            <span />
            {range(7).map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 py-2">
                <Bone className="h-3 w-8 rounded" />
                <Bone className="h-5 w-6 rounded" />
                <Bone className="h-3 w-7 rounded" />
              </div>
            ))}
            {range(4).map((row) => (
              <div key={row} className="contents">
                <div className="flex items-center gap-2">
                  <Bone className="h-8 w-8 shrink-0 rounded-full" />
                  <Bone className="h-3.5 w-16 rounded" />
                </div>
                {range(7).map((i) => <Bone key={i} className="h-[108px] rounded-[var(--kkb-r-lg)]" />)}
              </div>
            ))}
          </div>
        </BoneCard>
      </div>
    </div>
    </div>
  )
}

// Page entière : bandeau vert, carte « Par repas », puis le corps.
export function PlanSkeleton() {
  return (
    <SkeletonPage label="Chargement du menu de la semaine" className="mx-auto max-w-lg space-y-4 px-4 pb-40 pt-2 lg:max-w-none lg:space-y-5 lg:px-0 lg:pb-8 lg:pt-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between">
            <Bone dark className="h-8 w-48 rounded-full" />
            <Bone dark className="h-10 w-10 rounded-full" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Bone dark className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col items-center gap-2 lg:flex-none lg:items-start">
              <Bone dark className="h-3.5 w-40 rounded" />
              <Bone dark className="h-8 w-52 rounded-lg" />
            </div>
            <Bone dark className="h-10 w-10 shrink-0 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:mt-auto lg:pt-5">
            <Bone dark className="h-[60px] rounded-[var(--kkb-r-md)]" />
            <Bone dark className="h-[60px] w-36 rounded-[var(--kkb-r-md)]" />
          </div>
          <div className="mt-4 flex gap-2">
            <Bone dark className="h-11 w-48 rounded-full" />
            <Bone dark className="hidden h-11 w-40 rounded-full lg:block" />
          </div>
        </div>
        <BoneCard className="hidden space-y-4 p-5 lg:col-span-4 lg:block">
          <Bone className="h-5 w-24 rounded" />
          {range(4).map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Bone className="h-3.5 w-1/3 rounded" />
                <Bone className="h-1.5 rounded-full" />
              </div>
            </div>
          ))}
        </BoneCard>
      </div>
      <PlanBodySkeleton />
    </SkeletonPage>
  )
}

// ─── Validation du menu ──────────────────────────────────────────────────────

export function ValidateSkeleton() {
  return (
    <SkeletonPage label="Chargement de la validation" className="mx-auto max-w-lg px-4 pb-10 pt-2 lg:max-w-none lg:px-0 lg:pb-8 lg:pt-0">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Bandeau vert */}
        <div className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
          <div className="flex items-center justify-between">
            <Bone dark className="h-8 w-48 rounded-full" />
            <Bone dark className="h-10 w-10 rounded-full" />
          </div>
          <Bone dark className="mt-4 h-3.5 w-40 rounded" />
          <Bone dark className="mt-2 h-8 w-64 rounded-lg" />
          <Bone dark className="mt-2 h-3.5 w-full max-w-md rounded" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {range(3).map((i) => <Bone dark key={i} className="h-[62px] rounded-[var(--kkb-r-md)]" />)}
          </div>
        </div>
        {/* Valider et partager */}
        <BoneCard className="order-last space-y-4 p-5 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:p-6">
          {range(2).map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex gap-3">
                <Bone className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-36 rounded" />
                  <Bone className="h-3 w-full rounded" />
                </div>
              </div>
              <Bone className="h-12 rounded-full" />
            </div>
          ))}
        </BoneCard>
        {/* Menu jour par jour */}
        <div className="space-y-3 lg:col-span-8">
          <Bone className="h-11 w-60 rounded-full" />
          {range(3).map((i) => (
            <BoneCard key={i} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Bone className="h-5 w-40 rounded" />
                <Bone className="h-5 w-12 rounded-full" />
              </div>
              <div className={`${i === 0 ? 'grid' : 'hidden'} grid-cols-2 gap-2 sm:grid-cols-4 lg:grid`}>
                {range(4).map((j) => <Bone key={j} className="h-[150px] rounded-[var(--kkb-r-lg)]" />)}
              </div>
            </BoneCard>
          ))}
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Recette (détail) ────────────────────────────────────────────────────────

function LinesBones({ n }: { n: number }) {
  return (
    <div className="space-y-3">
      {range(n).map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-8 w-8 shrink-0 rounded-full" />
          <Bone className={`h-3.5 rounded ${i % 2 ? 'w-3/5' : 'w-4/5'}`} />
        </div>
      ))}
    </div>
  )
}

export function RecipeDetailSkeleton() {
  return (
    <SkeletonPage label="Chargement de la recette">
      {/* Mobile */}
      <div className="pb-8 lg:hidden">
        <Bone className="h-[300px] w-full rounded-none" />
        <div className="relative z-10 -mt-8 space-y-6 rounded-t-[28px] bg-[var(--kkb-creme)] px-4 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--kkb-filet)]" />
          <div className="space-y-2 px-1">
            <Bone className="h-3.5 w-28 rounded" />
            <Bone className="h-7 w-4/5 rounded-lg" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {range(4).map((i) => <Bone key={i} className="h-16 rounded-[var(--kkb-r-lg)]" />)}
          </div>
          <Bone className="h-11 rounded-full" />
          <LinesBones n={6} />
        </div>
      </div>
      {/* Desktop : photo + fiche, ingrédients + préparation */}
      <div className="hidden space-y-5 pb-8 lg:block">
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-9 rounded-full" />
          <Bone className="h-3.5 w-56 rounded" />
        </div>
        <div className="grid grid-cols-12 gap-5">
          <Bone className="col-span-7 min-h-[420px] rounded-[var(--kkb-r-xl)]" />
          <BoneCard className="col-span-5 flex flex-col gap-3 p-7">
            <div className="flex gap-1.5">
              <Bone className="h-5 w-24 rounded-full" />
              <Bone className="h-5 w-28 rounded-full" />
            </div>
            <Bone className="h-9 w-4/5 rounded-lg" />
            <Bone className="h-3.5 w-full rounded" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {range(4).map((i) => <Bone key={i} className="h-[76px] rounded-[var(--kkb-r-lg)]" />)}
            </div>
            <div className="mt-auto flex gap-2 pt-6">
              <Bone className="h-12 flex-1 rounded-full" />
              <Bone className="h-12 w-12 rounded-full" />
              <Bone className="h-12 w-12 rounded-full" />
            </div>
          </BoneCard>
          <BoneCard className="col-span-5 space-y-3 p-6">
            <Bone className="h-6 w-36 rounded" />
            <Bone className="h-1.5 rounded-full" />
            {range(6).map((i) => <Bone key={i} className="h-[52px] rounded-[var(--kkb-r-md)]" />)}
          </BoneCard>
          <BoneCard className="col-span-7 space-y-5 p-6">
            <Bone className="h-6 w-40 rounded" />
            {range(4).map((i) => (
              <div key={i} className="flex gap-3">
                <Bone className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <Bone className="h-3.5 w-full rounded" />
                  <Bone className="h-3.5 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </BoneCard>
        </div>
      </div>
    </SkeletonPage>
  )
}

// ─── Formulaire de recette (ajout / modification) ────────────────────────────

function FieldBones({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-2">
      <Bone className="h-3 w-28 rounded" />
      <Bone className={`${tall ? 'h-24' : 'h-11'} rounded-[var(--kkb-r-sm)]`} />
    </div>
  )
}

export function RecipeFormSkeleton() {
  const title = <div className="flex items-center gap-2.5"><Bone className="h-8 w-8 rounded-full" /><Bone className="h-4 w-32 rounded" /></div>
  return (
    <SkeletonPage label="Chargement de la recette" className="mx-auto max-w-lg px-4 pb-44 pt-2 lg:max-w-none lg:px-0 lg:pb-32 lg:pt-0">
      <div className="mb-4 flex flex-col rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:mb-5 lg:p-6">
        <Bone dark className="h-10 w-10 rounded-full" />
        <Bone dark className="mt-4 h-3.5 w-36 rounded" />
        <Bone dark className="mt-2 h-8 w-64 rounded-lg" />
        <Bone dark className="mt-2 h-3.5 w-full max-w-md rounded" />
      </div>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
        <BoneCard className="space-y-4 p-5 lg:col-span-5 lg:p-6">
          {title}
          <Bone className="aspect-[4/3] rounded-[var(--kkb-r-lg)]" />
          <FieldBones />
          <FieldBones />
          <FieldBones tall />
        </BoneCard>
        <BoneCard className="space-y-4 p-5 lg:col-span-7 lg:p-6">
          {title}
          {range(5).map((i) => <Bone key={i} className="h-[52px] rounded-[var(--kkb-r-lg)]" />)}
          <Bone className="h-11 rounded-[var(--kkb-r-lg)]" />
        </BoneCard>
      </div>
    </SkeletonPage>
  )
}
