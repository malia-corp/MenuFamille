'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookHeart, BookOpen, Check, Globe, Heart, LayoutGrid, Link2, List, Loader2,
  PenLine, Plus, Search, SlidersHorizontal, Timer, Users, WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { categoryColor, categoryIcon, categoryInk } from '@/lib/constants/category-icon'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Pagination } from '@/components/recipes/pagination'
import type { RecipeCategory, RecipeListItem, RecipeOrigin, RecipePage, RecipeSort } from '@/components/recipes/types'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { toast } from '@/lib/stores/toast-store'

const ORIGINS: { value: RecipeOrigin; label: string; desktopLabel: string; icon: LucideIcon }[] = [
  { value: 'all',        label: 'Tous',          desktopLabel: 'Toutes les recettes', icon: BookOpen },
  { value: 'communaute', label: 'Communauté',    desktopLabel: 'Communauté',          icon: Globe },
  { value: 'famille',    label: 'Famille',       desktopLabel: 'Recettes de famille', icon: Users },
  { value: 'mes',        label: 'Mes créations', desktopLabel: 'Mes créations',       icon: PenLine },
  { value: 'favoris',    label: 'Favoris',       desktopLabel: 'Mes favoris',         icon: Heart },
]

const SORTS: { value: RecipeSort; label: string }[] = [
  { value: 'recent',  label: 'Plus récentes' },
  { value: 'planned', label: 'Plus planifiées' },
  { value: 'fastest', label: 'Plus rapides' },
  { value: 'alpha',   label: 'Ordre alphabétique' },
]

const DESKTOP_PAGE_SIZE = 12
const MOBILE_PAGE_SIZE  = 10

export default function RecipesPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<RecipeCategory[]>([])
  const [origin,     setOrigin]     = useState<RecipeOrigin>('all')
  const [search,     setSearch]     = useState('')
  const [debounced,  setDebounced]  = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [under30,    setUnder30]    = useState(false)
  const [sort,       setSort]       = useState<RecipeSort>('recent')
  const [view,       setView]       = useState<'grid' | 'list'>('grid')
  const [showMobileOptions, setShowMobileOptions] = useState(false)

  const [data,    setData]    = useState<RecipePage | null>(null)
  const [items,   setItems]   = useState<RecipeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  // append = "Voir plus" mobile ; sinon remplacement (filtres, pagination desktop)
  const load = useCallback(async (page: number, append: boolean) => {
    const id = ++requestId.current
    if (append) setLoadingMore(true)
    else setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(isDesktop() ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE),
      scope: origin,
      sort,
    })
    if (debounced) params.set('search', debounced)
    if (categoryIds.length) params.set('category_ids', categoryIds.join(','))
    if (under30) params.set('under30', '1')
    try {
      const res  = await fetch(`/api/recipes?${params}`)
      const json = await res.json()
      if (id !== requestId.current) return
      if (!res.ok) { setError(json?.error ?? 'Erreur de chargement'); return }
      setError(null)
      setData(json)
      setItems(prev => (append ? [...prev, ...json.items] : json.items))
    } catch {
      if (id === requestId.current) {
        setError('Impossible de charger les recettes')
        toast.error('Erreur de connexion')
      }
    } finally {
      if (id === requestId.current) { setLoading(false); setLoadingMore(false) }
    }
  }, [origin, sort, debounced, categoryIds, under30])

  useEffect(() => { void load(1, false) }, [load])

  async function toggleFavorite(recipe: RecipeListItem) {
    const res = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: 'POST' }).catch(() => null)
    if (!res?.ok) { toast.error('Erreur de connexion'); return }
    const { is_favorited } = await res.json()
    if (is_favorited) toast.success('Recette ajoutée aux favoris')
    else toast.info('Recette retirée des favoris')
    setItems(prev => prev.map(r => r.id === recipe.id
      ? { ...r, is_favorited, foyer_favorites: Math.max(0, r.foyer_favorites + (is_favorited ? 1 : -1)) }
      : r))
  }

  function toggleCategory(id: string) {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const openRecipe = (r: RecipeListItem) => router.push(`/recipes/${r.id}`)
  const planRecipe = (r: RecipeListItem) => router.push(`/recipes/${r.id}?plan=1`)
  const counts     = data?.counts
  const totalAll   = counts?.all ?? 0

  // Puces mobiles : vert forêt quand choisies, l'orange reste au bouton « + » (C-02).
  const chip = (active: boolean) =>
    `flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-quicksand font-bold transition-colors ${
      active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-texte-2)]'
    }`

  const filtersActive = origin !== 'all' || !!search.trim() || categoryIds.length > 0 || under30
  function resetFilters() {
    setOrigin('all'); setSearch(''); setCategoryIds([]); setUnder30(false)
  }

  const emptyOrError = error ? (
    <EmptyState icon={WifiOff} title="Impossible de charger les recettes" description="Vérifie ta connexion puis réessaie."
      ctaLabel="Réessayer" ctaAction={() => void load(1, false)} />
  ) : filtersActive ? (
    <EmptyState icon={Search} title="Aucune recette trouvée" description="Essaie un autre mot-clé ou explore d'autres catégories.">
      <button type="button" onClick={resetFilters} className="text-sm font-quicksand font-bold text-[var(--kkb-foret)] underline">Réinitialiser les filtres</button>
    </EmptyState>
  ) : (
    <EmptyState icon={BookOpen} title="Ton carnet est vide pour l'instant" description="Ajoute ta première recette ou explore les plats de la communauté."
      ctaLabel="Ajouter une recette" ctaIcon={Plus} ctaHref="/recipes/add" />
  )

  const searchField = (
    <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white px-4 ring-[var(--kkb-sauge)] focus-within:ring-2">
      <Search className="h-[18px] w-[18px] shrink-0 text-[var(--kkb-texte-2)]" />
      <input
        type="search" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Un plat, un ingrédient…" aria-label="Rechercher une recette"
        className="min-w-0 flex-1 bg-transparent text-[15px] font-quicksand text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)]"
      />
    </div>
  )

  // Origines, posées sur le bandeau vert.
  const originTabs = (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 hide-scrollbar lg:mx-0 lg:flex-wrap lg:px-0" role="tablist" aria-label="Origine des recettes">
      {ORIGINS.map(o => {
        const active = origin === o.value
        return (
          <button key={o.value} type="button" role="tab" aria-selected={active} onClick={() => setOrigin(o.value)}
            className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-quicksand text-[13px] font-bold transition-colors ${
              active ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]' : 'bg-white/10 text-[var(--kkb-creme)] hover:bg-white/20'
            }`}>
            <o.icon className="h-4 w-4" /> <span className="lg:hidden">{o.label}</span><span className="hidden lg:inline">{o.desktopLabel}</span>
            {counts && <span className={`tabular-nums ${active ? 'text-[var(--kkb-foret-500)]' : 'text-[var(--kkb-foret-100)]'}`}>{counts[o.value] ?? 0}</span>}
          </button>
        )
      })}
    </div>
  )

  const hero = (
    <section className="rounded-[var(--kkb-r-xl)] bg-[var(--kkb-foret)] p-5 lg:col-span-8 lg:p-6">
      <p className="font-quicksand text-sm font-semibold text-[var(--kkb-foret-100)]">Carnet de recettes</p>
      <h1 className="mt-0.5 text-h1 text-[var(--kkb-creme)]">Qu&apos;est-ce qu&apos;on cuisine ?</h1>
      <p className="mt-1 font-quicksand text-sm text-[var(--kkb-foret-100)]">
        {counts
          ? <><span className="font-bold tabular-nums text-[var(--kkb-creme)]">{totalAll}</span> recette{totalAll > 1 ? 's' : ''} : les tiennes, celles de la famille et de la communauté.</>
          : 'Les tiennes, celles de la famille et de la communauté.'}
      </p>
      <div className="mt-4 flex items-center gap-2 lg:max-w-2xl">
        {searchField}
        <button type="button" onClick={() => setShowMobileOptions(o => !o)} aria-label="Tri et filtres" aria-expanded={showMobileOptions}
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors lg:hidden ${
            showMobileOptions ? 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]' : 'bg-white/10 text-[var(--kkb-creme)]'
          }`}>
          <SlidersHorizontal className="h-5 w-5" />
          {(under30 || sort !== 'recent') && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--kkb-orange)] ring-2 ring-[var(--kkb-foret)]" />}
        </button>
      </div>
      <div className="mt-4">{originTabs}</div>
    </section>
  )

  // Desktop : l'ajout, seule action orange de la page, avec quelques chiffres.
  const addCard = (
    <section className="hidden flex-col rounded-[var(--kkb-r-xl)] bg-white p-6 lg:col-span-4 lg:flex" aria-labelledby="add-title">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--kkb-jaune-50)]">
        <BookHeart className="h-5 w-5 text-[var(--kkb-jaune-text)]" />
      </span>
      <h2 id="add-title" className="mt-3 text-h3 text-[var(--kkb-profond)]">Ajoute ta recette</h2>
      <p className="mt-1 font-quicksand text-sm text-[var(--kkb-texte-2)]">
        Un plat de famille, une trouvaille sur le web : garde-le ici et planifie-le en un geste.
      </p>
      <div className="mt-auto space-y-2 pt-5">
        <button type="button" onClick={() => router.push('/recipes/add')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--kkb-orange)] font-quicksand text-sm font-bold text-white transition-colors hover:bg-[var(--kkb-orange-700)]">
          <PenLine className="h-4 w-4" /> Saisir une recette
        </button>
        <button type="button" onClick={() => router.push('/recipes/add?import=1')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[var(--kkb-filet)] font-quicksand text-sm font-semibold text-[var(--kkb-foret)] transition-colors hover:border-[var(--kkb-foret-300)]">
          <Link2 className="h-4 w-4" /> Importer depuis un lien
        </button>
      </div>
    </section>
  )

  const listHeader = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className={`font-quicksand text-sm text-[var(--kkb-texte-2)] ${loading ? 'invisible' : ''}`}>
        <span className="font-bold tabular-nums text-[var(--kkb-profond)]">{data?.total ?? 0}</span> recette{(data?.total ?? 0) > 1 ? 's' : ''}
        {filtersActive && (
          <> · <button type="button" onClick={resetFilters} className="font-bold text-[var(--kkb-foret)] hover:underline">Tout effacer</button></>
        )}
      </p>
      <div className="hidden items-center gap-2 lg:flex">
        <div className="flex rounded-full bg-white p-1" role="group" aria-label="Affichage">
          {([['grid', LayoutGrid, 'Grille'], ['list', List, 'Liste']] as const).map(([v, Icon, label]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${view === v ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'}`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <Select value={sort} onChange={setSort} options={SORTS} ariaLabel="Trier les recettes" size="sm" className="w-48" />
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-8 pt-2 lg:max-w-none lg:px-0 lg:pt-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {hero}
        {addCard}
      </div>

      {/* ── Mobile : tri, temps, catégories ────────────────────────────── */}
      {showMobileOptions && (
        <div className="space-y-3 rounded-[var(--kkb-r-xl)] bg-white p-4 lg:hidden">
          <p className="font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">Trier par</p>
          <div className="flex flex-wrap gap-2">
            {SORTS.map(s => (
              <button key={s.value} type="button" onClick={() => setSort(s.value)} aria-pressed={sort === s.value} className={chip(sort === s.value)}>
                {sort === s.value && <Check className="h-3.5 w-3.5" />} {s.label}
              </button>
            ))}
          </div>
          <p className="pt-1 font-quicksand text-xs font-semibold text-[var(--kkb-texte-2)]">Temps</p>
          <button type="button" onClick={() => setUnder30(v => !v)} aria-pressed={under30} className={chip(under30)}>
            <Timer className="h-3.5 w-3.5" /> Moins de 30 min
          </button>
        </div>
      )}

      {categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar lg:hidden" aria-label="Catégories">
          {[{ id: '', name: 'Tout', slug: null as string | null, color: null as string | null }, ...categories].map(c => {
            const Icon = c.id ? categoryIcon(c.slug) : BookOpen
            const active = c.id ? (categoryIds.length === 1 && categoryIds[0] === c.id) : categoryIds.length === 0
            return (
              <button
                key={c.id || 'tout'} type="button" aria-pressed={active}
                onClick={() => setCategoryIds(!c.id || active ? [] : [c.id])}
                className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[var(--kkb-r-lg)] px-1 py-3 transition-colors ${active ? 'bg-[var(--kkb-sauge-50)]' : 'bg-white'}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-[var(--kkb-creme)] text-[var(--kkb-foret)]'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`line-clamp-2 text-center font-quicksand text-[11px] leading-tight ${active ? 'font-bold text-[var(--kkb-foret)]' : 'font-semibold text-[var(--kkb-texte-2)]'}`}>{c.name}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="lg:flex lg:items-start lg:gap-5">
        {/* ── Desktop : catégories et temps ────────────────────────────── */}
        <aside className="sticky top-24 hidden w-[260px] shrink-0 space-y-5 rounded-[var(--kkb-r-xl)] bg-white p-5 lg:block" aria-label="Filtres">
          {categories.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-h3 text-[var(--kkb-profond)]">Catégories</h2>
                {categoryIds.length > 0 && (
                  <button type="button" onClick={() => setCategoryIds([])} className="font-quicksand text-xs font-bold text-[var(--kkb-foret)] hover:underline">Tout afficher</button>
                )}
              </div>
              <ul className="space-y-0.5">
                {categories.map(c => {
                  const Icon = categoryIcon(c.slug)
                  const color = categoryColor(c.color)
                  const checked = categoryIds.includes(c.id)
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => toggleCategory(c.id)} aria-pressed={checked}
                        className={`flex w-full items-center gap-2.5 rounded-[var(--kkb-r-md)] px-2 py-1.5 text-left font-quicksand text-sm transition-colors ${checked ? 'bg-[var(--kkb-foret-50)] font-bold text-[var(--kkb-foret)]' : 'text-[var(--kkb-profond)] hover:bg-[var(--kkb-creme)]'}`}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A`, color: categoryInk(c.color) }}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        {checked && <Check className="h-4 w-4 shrink-0 text-[var(--kkb-foret-500)]" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          <section className="border-t border-dashed border-[var(--kkb-filet)] pt-4">
            <h2 className="mb-2 text-h3 text-[var(--kkb-profond)]">Temps</h2>
            <button type="button" onClick={() => setUnder30(v => !v)} aria-pressed={under30}
              className={`flex h-10 w-full items-center gap-2 rounded-full px-4 font-quicksand text-sm font-bold transition-colors ${under30 ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-[var(--kkb-creme)] text-[var(--kkb-texte-2)] hover:text-[var(--kkb-foret)]'}`}>
              <Timer className="h-4 w-4" /> Moins de 30 min
              {under30 && <Check className="ml-auto h-4 w-4" />}
            </button>
          </section>
        </aside>

        {/* ── Résultats ─────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4">
          {listHeader}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 lg:gap-5 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5" aria-busy="true" aria-label="Chargement des recettes">
              {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} variant="recipe" />)}
            </div>
          ) : error || items.length === 0 ? (
            <div className="rounded-[var(--kkb-r-xl)] bg-white">{emptyOrError}</div>
          ) : (
            <>
              {/* Mobile : grille 2 colonnes et « Voir plus » */}
              <div className="grid grid-cols-2 gap-3 lg:hidden">
                {items.map(r => (
                  <RecipeCard key={r.id} recipe={r} variant="mobile" onOpen={() => openRecipe(r)} onToggleFavorite={() => void toggleFavorite(r)} />
                ))}
              </div>
              {data && data.page < data.page_count && (
                <button type="button" disabled={loadingMore} onClick={() => void load(data.page + 1, true)}
                  className="mx-auto flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-quicksand font-bold text-[var(--kkb-foret)] disabled:opacity-60 lg:hidden">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Voir plus
                </button>
              )}

              {/* Desktop : grille ou liste, pagination */}
              <div className={`hidden ${view === 'grid' ? 'lg:grid lg:grid-cols-2 lg:gap-5 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5' : 'lg:block lg:space-y-3'}`}>
                {items.map(r => (
                  <RecipeCard key={r.id} recipe={r} variant={view} onOpen={() => openRecipe(r)} onPlan={() => planRecipe(r)} onToggleFavorite={() => void toggleFavorite(r)} />
                ))}
              </div>
              {data && data.page_count > 1 && (
                <div className="hidden items-center justify-between gap-4 pt-2 lg:flex">
                  <p className="font-quicksand text-sm text-[var(--kkb-texte-2)]">Page {data.page} sur {data.page_count}</p>
                  <Pagination page={data.page} pageCount={data.page_count} onChange={p => { void load(p, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button
        type="button" onClick={() => router.push('/recipes/add')} aria-label="Ajouter une recette"
        className="fixed bottom-[var(--kkb-nav-offset)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kkb-orange)] text-white shadow-[var(--kkb-shadow-fab)] transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
