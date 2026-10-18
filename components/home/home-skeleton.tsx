// Squelette de l'accueil planificatrice : mêmes conteneur, grille et
// proportions que la page chargée (bandeau, ligne de temps, colonne
// latérale), pour que rien ne saute à l'arrivée des données.

const BLOCK = 'kkb-bone'
const ON_DARK = 'kkb-bone-dark'

function HeroSkeleton() {
  return (
    <div className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-4 pt-5 lg:p-6">
      <div className="space-y-2.5 px-1">
        <div className={`h-3.5 w-28 rounded ${ON_DARK}`} />
        <div className={`h-7 w-56 max-w-full rounded-lg ${ON_DARK} lg:w-96`} />
        <div className={`h-7 w-40 rounded-lg ${ON_DARK} lg:hidden`} />
      </div>
      <div className="mt-4 flex items-end justify-between px-1">
        <div className={`h-3.5 w-40 rounded ${ON_DARK}`} />
        <div className="hidden gap-2 lg:flex">
          <div className={`h-12 w-12 rounded-full ${ON_DARK} xl:w-44`} />
          <div className={`h-12 w-52 rounded-full ${ON_DARK}`} />
        </div>
      </div>
      <div className="mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:gap-3">
        <div className="grid grid-cols-7 gap-1 rounded-[var(--kkb-r-xl)] bg-white/10 p-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={`h-[60px] rounded-[var(--kkb-r-md)] ${i === 6 ? ON_DARK : ''}`}>
              {i !== 6 && (
                <div className="flex h-full flex-col items-center justify-center gap-1.5">
                  <div className={`h-2.5 w-6 rounded ${ON_DARK}`} />
                  <div className={`h-4 w-5 rounded ${ON_DARK}`} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-0">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 rounded-[var(--kkb-r-md)] bg-white/10 px-3 py-2.5">
              <div className={`h-3 w-24 max-w-full rounded ${ON_DARK}`} />
              <div className={`h-5 w-12 rounded ${ON_DARK}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <ol>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-2.5">
          <div className="flex w-3 shrink-0 flex-col items-center pt-5">
            <div className={`h-3 w-3 rounded-full ${BLOCK}`} />
            {i < 2 && <div className="mt-1 w-px flex-1 bg-[var(--kkb-filet)]" />}
          </div>
          <div className={`min-w-0 flex-1 ${i < 2 ? 'pb-3' : ''}`}>
            <div className="flex items-center gap-3 rounded-[var(--kkb-r-lg)] bg-white p-2.5">
              <div className={`h-14 w-14 shrink-0 rounded-[var(--kkb-r-md)] ${BLOCK}`} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={`h-4 w-24 rounded-full ${BLOCK}`} />
                <div className={`h-4 w-4/5 rounded ${BLOCK}`} />
                <div className={`h-3 w-2/5 rounded ${BLOCK}`} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function SideSkeleton() {
  return (
    <>
      <div className="rounded-[var(--kkb-r-xl)] bg-white p-4">
        <div className="flex items-center gap-4">
          <div className={`h-[72px] w-[72px] shrink-0 rounded-full ${BLOCK}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-3/5 rounded ${BLOCK}`} />
            <div className={`h-3 w-4/5 rounded ${BLOCK}`} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className={`h-11 flex-1 rounded-full ${BLOCK}`} />
          <div className={`h-11 flex-1 rounded-full ${BLOCK}`} />
        </div>
      </div>

      <div className="space-y-3">
        <div className={`mx-1 h-5 w-24 rounded ${BLOCK}`} />
        <div className="divide-y divide-[var(--kkb-lin)] overflow-hidden rounded-[var(--kkb-r-xl)] bg-white">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className={`h-14 w-12 shrink-0 rounded-[var(--kkb-r-md)] ${BLOCK}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-3.5 w-3/4 rounded ${BLOCK}`} />
                <div className={`h-3.5 w-1/2 rounded ${BLOCK}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function HomeSkeleton() {
  return (
    <div
      className="mx-auto max-w-sm px-4 pt-2 pb-8 lg:max-w-none lg:px-0 lg:pt-0"
      aria-busy="true"
      aria-label="Chargement de l'accueil"
    >
      <div className="space-y-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0" aria-hidden="true">
        <div className="space-y-6 lg:col-span-8">
          <HeroSkeleton />
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className={`h-6 w-32 rounded ${BLOCK}`} />
              <div className={`h-4 w-20 rounded ${BLOCK}`} />
            </div>
            <TimelineSkeleton />
          </section>
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <SideSkeleton />
        </aside>
      </div>
    </div>
  )
}
