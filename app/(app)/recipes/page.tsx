'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Check, ChevronDown, Globe, Heart, LayoutGrid, Link2, List, Loader2,
  PenLine, Plus, Search, SlidersHorizontal, Timer, Users, WifiOff,
  type LucideIcon,
} from 'lucide-react'
import { categoryIcon } from '@/lib/constants/category-icon'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Pagination } from '@/components/recipes/pagination'
import type { RecipeCategory, RecipeListItem, RecipeOrigin, RecipePage, RecipeSort } from '@/components/recipes/types'
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
  const [addMenuOpen, setAddMenuOpen] = useState(false)

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

  const pill = (active: boolean, tone: 'coral' | 'teal' = 'coral') =>
    `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--kkb-radius-pill)] px-3.5 py-1.5 text-xs font-quicksand font-bold transition-colors ${
      active
        ? tone === 'coral' ? 'bg-[var(--kkb-coral)] text-white' : 'bg-[var(--kkb-teal)] text-white'
        : 'border border-[var(--kkb-border)] bg-white text-[var(--kkb-text-secondary)]'
    }`

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
      <button type="button" onClick={resetFilters} className="text-sm font-quicksand font-bold text-[var(--kkb-coral)] underline">Réinitialiser les filtres</button>
    </EmptyState>
  ) : (
    <EmptyState icon={BookOpen} title="Ton carnet est vide pour l'instant" description="Ajoute ta première recette ou explore les plats de la communauté."
      ctaLabel="Ajouter une recette" ctaIcon={Plus} ctaHref="/recipes/add" />
  )

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-sm space-y-5 px-4 pb-8 pt-3 lg:hidden">
        <div className="px-1">
          <h1 className="text-h1 text-[var(--kkb-foret)]">Mes recettes</h1>
          <p className="mt-0.5 font-quicksand text-sm text-[var(--kkb-texte-2)]">
            <span className="tabular-nums">{totalAll}</span> recette{totalAll > 1 ? 's' : ''} dans le carnet
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white px-4 ring-[var(--kkb-foret-300)] focus-within:ring-2">
            <Search className="h-[18px] w-[18px] shrink-0 text-[var(--kkb-texte-2)]" />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Un plat, un ingrédient…" aria-label="Rechercher une recette"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-quicksand text-[var(--kkb-profond)] outline-none placeholder:text-[var(--kkb-texte-2)]"
            />
          </div>
          <button type="button" onClick={() => setShowMobileOptions(o => !o)} aria-label="Tri et filtres" aria-expanded={showMobileOptions}
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              showMobileOptions ? 'bg-[var(--kkb-foret)] text-[var(--kkb-creme)]' : 'bg-white text-[var(--kkb-foret)]'
            }`}>
            <SlidersHorizontal className="h-5 w-5" />
            {(under30 || sort !== 'recent') && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--kkb-orange)] ring-2 ring-white" />}
          </button>
        </div>

        {showMobileOptions && (
          <div className="space-y-3 rounded-[var(--kkb-r-xl)] bg-white p-4">
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

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 hide-scrollbar" role="tablist" aria-label="Origine des recettes">
          {ORIGINS.map(o => (
            <button key={o.value} type="button" role="tab" aria-selected={origin === o.value} onClick={() => setOrigin(o.value)} className={chip(origin === o.value)}>
              <o.icon className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar" aria-label="Catégories">
            {[{ id: '', name: 'Tout', slug: null as string | null }, ...categories].map(c => {
              const Icon = c.id ? categoryIcon(c.slug) : BookOpen
              const active = c.id ? (categoryIds.length === 1 && categoryIds[0] === c.id) : categoryIds.length === 0
              return (
                <button
                  key={c.id || 'tout'} type="button" aria-pressed={active}
                  onClick={() => setCategoryIds(!c.id || active ? [] : [c.id])}
                  className={`flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-[var(--kkb-r-lg)] px-1 py-3 transition-colors ${
                    active ? 'bg-[var(--kkb-sauge-50)]' : 'bg-white'
                  }`}
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3" aria-busy="true" aria-label="Chargement des recettes">
            {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} variant="recipe" />)}
          </div>
        ) : error || items.length === 0 ? emptyOrError : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {items.map(r => (
                <RecipeCard key={r.id} recipe={r} variant="mobile" onOpen={() => openRecipe(r)} onToggleFavorite={() => void toggleFavorite(r)} />
              ))}
            </div>
            {data && data.page < data.page_count && (
              <button type="button" disabled={loadingMore} onClick={() => void load(data.page + 1, true)}
                className="mx-auto flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-quicksand font-bold text-[var(--kkb-foret)] disabled:opacity-60">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Voir plus
              </button>
            )}
          </>
        )}

        <button
          type="button" onClick={() => router.push('/recipes/add')} aria-label="Ajouter une recette"
          className="fixed bottom-[var(--kkb-nav-offset)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kkb-coral)] text-white shadow-[var(--kkb-shadow-fab)] transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* ── Desktop ────────────────────────────────────────────────────── */}
      <div className="mx-auto hidden max-w-[1400px] px-8 py-8 lg:block">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">
              Trésors gourmands · Transmission culinaire &amp; partage
            </p>
            <div className="flex items-center gap-3">
              <h1 className="font-dosis font-extrabold text-[32px] leading-tight text-[var(--kkb-text-primary)]">Carnet Culinaire</h1>
              <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-coral-light)] px-3 py-1 text-sm font-quicksand font-bold text-[var(--kkb-coral)]">
                {totalAll} recette{totalAll > 1 ? 's' : ''} authentique{totalAll > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setAddMenuOpen(o => !o)} aria-expanded={addMenuOpen}
              className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] bg-[var(--kkb-coral)] px-5 py-3 text-sm font-quicksand font-bold text-white shadow-sm hover:bg-[var(--kkb-coral-hover)]">
              <Plus className="h-4 w-4" /> Ajouter une recette <ChevronDown className={`h-4 w-4 transition-transform ${addMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white shadow-lg">
                <button type="button" onClick={() => router.push('/recipes/add')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-quicksand text-[var(--kkb-text-primary)] hover:bg-[var(--kkb-bg)]">
                  <PenLine className="h-4 w-4 text-[var(--kkb-coral)]" /> Saisir manuellement
                </button>
                <button type="button" onClick={() => router.push('/recipes/add?import=1')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-quicksand text-[var(--kkb-text-primary)] hover:bg-[var(--kkb-bg)]">
                  <Link2 className="h-4 w-4 text-[var(--kkb-coral)]" /> Importer depuis un lien
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-8">
          {/* Panneau de filtres */}
          <aside className="sticky top-24 w-[300px] shrink-0 space-y-6 rounded-[var(--kkb-radius-card)] border border-[var(--kkb-lin)] bg-white p-5">
            <section className="space-y-2">
              <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Recherche intelligente</p>
              <div className="flex items-center gap-2 rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3 py-2.5 focus-within:border-[var(--kkb-coral)]">
                <Search className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Plat, ingrédient..." aria-label="Rechercher une recette"
                  className="min-w-0 flex-1 bg-transparent text-sm font-quicksand outline-none placeholder:text-[var(--kkb-text-tertiary)]" />
              </div>
            </section>

            <section className="space-y-1">
              <p className="mb-2 text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Origine du recueil</p>
              {ORIGINS.map(o => {
                const active = origin === o.value
                return (
                  <button key={o.value} type="button" onClick={() => setOrigin(o.value)}
                    className={`flex w-full items-center gap-2.5 rounded-[var(--kkb-radius-sm)] px-3 py-2 text-left text-sm font-quicksand transition-colors ${active ? 'bg-[var(--kkb-coral-light)] font-bold text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-secondary)] hover:bg-[var(--kkb-bg)]'}`}>
                    <o.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{o.desktopLabel}</span>
                    <span className="rounded-[var(--kkb-radius-pill)] bg-[var(--kkb-bg)] px-2 py-0.5 text-xs font-bold text-[var(--kkb-text-tertiary)]">{counts?.[o.value] ?? 0}</span>
                  </button>
                )
              })}
            </section>

            {categories.length > 0 && (
              <section className="space-y-1">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Type de préparation</p>
                  {categoryIds.length > 0 && (
                    <button type="button" onClick={() => setCategoryIds([])} className="text-[11px] font-quicksand font-bold text-[var(--kkb-coral)]">Tout afficher</button>
                  )}
                </div>
                {categories.map(c => {
                  const Icon = categoryIcon(c.slug)
                  const checked = categoryIds.includes(c.id)
                  return (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--kkb-radius-sm)] px-3 py-1.5 text-sm font-quicksand text-[var(--kkb-text-primary)] hover:bg-[var(--kkb-bg)]">
                      <Icon className="h-4 w-4 shrink-0 text-[var(--kkb-text-tertiary)]" />
                      <span className="flex-1">{c.name}</span>
                      <input type="checkbox" checked={checked} onChange={() => toggleCategory(c.id)} className="peer sr-only" />
                      <span className={`flex h-[18px] w-[18px] items-center justify-center rounded border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--kkb-coral)] ${checked ? 'border-[var(--kkb-coral)] bg-[var(--kkb-coral)] text-white' : 'border-[var(--kkb-border)] bg-white'}`}>
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </label>
                  )
                })}
              </section>
            )}

            <section className="space-y-2">
              <p className="text-[10px] font-quicksand font-bold uppercase tracking-wider text-[var(--kkb-text-tertiary)]">Critères express</p>
              <button type="button" onClick={() => setUnder30(v => !v)} className={pill(under30)}>
                <Timer className="h-3.5 w-3.5" /> Moins de 30 min
              </button>
            </section>
          </aside>

          {/* Résultats */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm font-quicksand text-[var(--kkb-text-secondary)]">
                Affichage :
                <div className="flex rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white p-0.5">
                  {([['grid', LayoutGrid, 'Grille'], ['list', List, 'Liste']] as const).map(([v, Icon, label]) => (
                    <button key={v} type="button" onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
                      className={`rounded-[6px] p-1.5 ${view === v ? 'bg-[var(--kkb-coral-light)] text-[var(--kkb-coral)]' : 'text-[var(--kkb-text-tertiary)]'}`}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <span className="text-[var(--kkb-text-tertiary)]">{data?.total ?? 0} recette{(data?.total ?? 0) > 1 ? 's' : ''} affichée{(data?.total ?? 0) > 1 ? 's' : ''}</span>
              </div>
              <label className="flex items-center gap-2 text-sm font-quicksand text-[var(--kkb-text-tertiary)]">
                Trier par :
                <select value={sort} onChange={e => setSort(e.target.value as RecipeSort)}
                  className="rounded-[var(--kkb-radius-sm)] border border-[var(--kkb-border)] bg-white px-3 py-2 text-sm font-quicksand font-semibold text-[var(--kkb-text-primary)] outline-none focus:border-[var(--kkb-coral)]">
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-5 xl:grid-cols-3" aria-busy="true" aria-label="Chargement des recettes">
                {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} variant="recipe" />)}
              </div>
            ) : error || items.length === 0 ? emptyOrError : view === 'grid' ? (
              <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                {items.map(r => (
                  <RecipeCard key={r.id} recipe={r} variant="grid" onOpen={() => openRecipe(r)} onPlan={() => planRecipe(r)} onToggleFavorite={() => void toggleFavorite(r)} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(r => (
                  <RecipeCard key={r.id} recipe={r} variant="list" onOpen={() => openRecipe(r)} onPlan={() => planRecipe(r)} onToggleFavorite={() => void toggleFavorite(r)} />
                ))}
              </div>
            )}

            {data && data.total > 0 && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-sm font-quicksand text-[var(--kkb-text-tertiary)]">
                  Page {data.page} sur {data.page_count} · {data.total} délice{data.total > 1 ? 's' : ''} répertorié{data.total > 1 ? 's' : ''}
                </p>
                <Pagination page={data.page} pageCount={data.page_count} onChange={p => { void load(p, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
