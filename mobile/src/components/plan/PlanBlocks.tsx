import { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Image, Modal, Pressable, View } from 'react-native'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock, Lock, LockOpen, Minus, Pencil, Plus, Settings, Timer, Zap } from 'lucide-react-native'
import { LogoLoader } from '@/components/brand/Logo'
import { MealTypeIcon, ProgressBar, Txt } from '@/components/ui'
import { MEAL_COLOR, type MealType } from '@/shared/meal-type'
import { C, F, R } from '@/theme'

export interface CompositionChip { id: string; recipeId: string; name: string }

const ghost = { width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.white10, alignItems: 'center', justifyContent: 'center' } as const

// Bandeau du menu de la semaine (cf. components/plan/plan-hero.tsx).
export function PlanHero({
  weekLabel, onPrevWeek, onNextWeek, onSettings, hasPlan, validated, onValidate, onGenerate,
  filled, total, servings, onServings, updatingServings, sessionLabel, loading,
}: {
  weekLabel: string; onPrevWeek: () => void; onNextWeek: () => void; onSettings: () => void
  hasPlan: boolean; validated: boolean; onValidate: () => void; onGenerate: () => void
  filled: number; total: number; servings: number; onServings: (n: number) => void; updatingServings: boolean
  sessionLabel: string | null; loading: boolean
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  return (
    <View style={{ backgroundColor: C.foret, borderRadius: R.xl, padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.creme, paddingVertical: 4, paddingLeft: 4, paddingRight: 12 }}>
            <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>1</Txt>
            </View>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret }}>Planifier</Txt>
          </View>
          <View style={{ width: 16, height: 1, backgroundColor: C.white25 }} />
          <Pressable onPress={onValidate} disabled={!hasPlan} accessibilityRole="button" accessibilityLabel="Valider le menu"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: C.white10, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, opacity: hasPlan ? 1 : 0.5 }}>
            <View style={{ width: 24, height: 24, borderRadius: R.pill, backgroundColor: validated ? C.sauge : C.white15, alignItems: 'center', justifyContent: 'center' }}>
              {validated ? <Check size={14} color={C.profond} /> : <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.creme }}>2</Txt>}
            </View>
            <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.creme }}>Valider</Txt>
          </Pressable>
        </View>
        <Pressable onPress={onSettings} accessibilityRole="button" accessibilityLabel="Rythme des repas" style={ghost}>
          <Settings size={18} color={C.creme} />
        </Pressable>
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onPrevWeek} accessibilityRole="button" accessibilityLabel="Semaine précédente" style={ghost}><ChevronLeft size={20} color={C.creme} /></Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt style={{ fontFamily: F.bodySemi, fontSize: 14, color: C.foret100 }}>Menu de la semaine du</Txt>
          <Txt variant="h1" color={C.creme} numberOfLines={1} style={{ fontSize: 23, lineHeight: 28 }}>{weekLabel}</Txt>
        </View>
        <Pressable onPress={onNextWeek} accessibilityRole="button" accessibilityLabel="Semaine suivante" style={ghost}><ChevronRight size={20} color={C.creme} /></Pressable>
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }}>
          {loading ? <View style={{ height: 38 }} /> : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Txt style={{ fontSize: 12, color: C.foret100 }}>
                  <Txt style={{ fontFamily: F.title, fontSize: 20, color: C.creme }}>{filled}</Txt>
                  <Txt style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.foret100 }}>/{total}</Txt> repas
                </Txt>
                <Txt style={{ fontSize: 12, color: C.foret100 }}>{pct}%</Txt>
              </View>
              <View style={{ marginTop: 6 }}><ProgressBar pct={pct} track={C.white15} /></View>
            </>
          )}
        </View>
        {hasPlan && !loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: R.md, backgroundColor: C.white10, paddingHorizontal: 6 }}>
            <Pressable onPress={() => onServings(servings - 1)} disabled={servings <= 1 || updatingServings} accessibilityRole="button" accessibilityLabel="Un convive de moins"
              style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', opacity: servings <= 1 ? 0.4 : 1 }}>
              <Minus size={16} color={C.creme} />
            </Pressable>
            <View style={{ minWidth: 50, alignItems: 'center' }}>
              <Txt style={{ fontFamily: F.title, fontSize: 20, lineHeight: 22, color: C.creme }}>{updatingServings ? '…' : servings}</Txt>
              <Txt style={{ fontSize: 10, color: C.foret100 }}>convives</Txt>
            </View>
            <Pressable onPress={() => onServings(servings + 1)} disabled={servings >= 20 || updatingServings} accessibilityRole="button" accessibilityLabel="Un convive de plus"
              style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center', opacity: servings >= 20 ? 0.4 : 1 }}>
              <Plus size={16} color={C.foret} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Un seul bouton orange par vue : générer (ou regénérer) la semaine. */}
      <Pressable onPress={onGenerate} accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: 16, height: 52, borderRadius: R.pill, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <Zap size={20} color="#FFFFFF" />
        <Txt style={{ fontFamily: F.bodyBold, fontSize: 15, color: '#FFFFFF' }}>{hasPlan ? 'Regénérer la semaine' : 'Générer ma semaine'}</Txt>
      </Pressable>
      {hasPlan && <Txt variant="meta" color={C.foret100} style={{ marginTop: 6, textAlign: 'center' }}>Les repas verrouillés sont gardés, les autres sont remplacés.</Txt>}
      {sessionLabel && (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          <Timer size={14} color={C.foret100} />
          <Txt style={{ fontSize: 12, color: C.foret100 }}>{sessionLabel}</Txt>
        </View>
      )}
    </View>
  )
}

// Carte d'un repas du jour (cf. components/plan/meal-detail-card.tsx).
export function MealDetailCard({ eyebrow, mealType, emptyLabel, recipe, sideChips, drinkChip, servings, isLocked, locking, onToggleLock, onEdit }: {
  eyebrow: string; mealType: MealType; emptyLabel: string
  recipe: { id: string; name: string; photo_url: string | null; prep_time_min: number | null } | null
  sideChips: CompositionChip[]; drinkChip: CompositionChip | null; servings: number
  isLocked: boolean; locking: boolean; onToggleLock: () => void; onEdit: () => void
}) {
  const color = MEAL_COLOR[mealType]
  if (!recipe) {
    return (
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Ajouter un ${emptyLabel}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: R.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: pressed ? C.foret300 : C.filet, backgroundColor: pressed ? C.foret50 : 'transparent' })}>
        <View style={{ width: 72, height: 72, borderRadius: R.lg, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
          <MealTypeIcon type={mealType} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt numberOfLines={1} style={{ fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>{eyebrow}</Txt>
          <Txt style={{ fontFamily: F.titleBold, fontSize: 15, color: C.profond }}>Ajouter un {emptyLabel}</Txt>
        </View>
        <View style={{ marginRight: 4, width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.foret, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={20} color={C.creme} />
        </View>
      </Pressable>
    )
  }
  const chips = [...sideChips.map(c => c.name), ...(drinkChip ? [drinkChip.name] : [])]
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 8, borderRadius: R.xl, backgroundColor: '#FFFFFF' }}>
      <View style={{ width: 96, minHeight: 112, borderRadius: R.lg, overflow: 'hidden', backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}>
        {recipe.photo_url
          ? <Image source={{ uri: recipe.photo_url }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" accessibilityLabel={recipe.name} />
          : <MealTypeIcon type={mealType} size={28} />}
      </View>
      <View style={{ flex: 1, paddingVertical: 4, paddingRight: 4, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MealTypeIcon type={mealType} size={14} color={C.foret} />
            <Txt numberOfLines={1} style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 12, color: C.texte2 }}>{eyebrow}</Txt>
          </View>
          <Txt numberOfLines={2} style={{ marginTop: 2, fontFamily: F.titleBold, fontSize: 16, lineHeight: 20, color: C.profond }}>{recipe.name}</Txt>
          {chips.length > 0 && <Txt numberOfLines={1} variant="meta" style={{ marginTop: 4 }}>+ {chips.join(', ')}</Txt>}
        </View>
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            {!!recipe.prep_time_min && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Clock size={12} color={C.texte2} />
                <Txt variant="meta">{recipe.prep_time_min} min</Txt>
              </View>
            )}
            <Txt variant="meta">· {servings} pers.</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable onPress={onToggleLock} disabled={locking} accessibilityRole="button" accessibilityState={{ selected: isLocked }}
              accessibilityLabel={isLocked ? 'Déverrouiller ce repas' : 'Verrouiller ce repas'}
              style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: isLocked ? C.foret : C.creme, alignItems: 'center', justifyContent: 'center' }}>
              {locking ? <ActivityIndicator size="small" color={isLocked ? C.creme : C.foret} />
                : isLocked ? <Lock size={16} color={C.creme} /> : <LockOpen size={16} color={C.foret} />}
            </Pressable>
            <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Modifier le repas"
              style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={16} color={C.foret} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

const GEN_STEPS = ['Sélection des recettes', 'Vérification de la variété', 'Prise en compte de ta famille', 'Finalisation']

// Génération du menu : les convives s'installent pendant que les étapes avancent.
export function GeneratingOverlay({ visible, genStep }: { visible: boolean; genStep: number }) {
  const w = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(w, { toValue: Math.min(genStep, 4) * 25, duration: 450, useNativeDriver: false }).start()
  }, [genStep, w])
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: C.creme, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 }}>
        <LogoLoader size={112} />
        <View style={{ alignItems: 'center' }}>
          <Txt variant="h1" style={{ textAlign: 'center' }}>On prépare ta semaine</Txt>
          <Txt variant="small" style={{ marginTop: 4, textAlign: 'center', fontSize: 14 }}>Quelques secondes, le temps de dresser la table.</Txt>
        </View>
        <View style={{ width: '100%', maxWidth: 320, gap: 20 }}>
          <View style={{ height: 6, borderRadius: R.pill, backgroundColor: C.lin, overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', borderRadius: R.pill, backgroundColor: C.sauge, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
          </View>
          <View style={{ gap: 12 }}>
            {GEN_STEPS.map((label, i) => {
              const done = genStep > i
              const active = genStep === i
              return (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: done ? C.sauge : active ? C.foret : 'transparent',
                    borderWidth: done || active ? 0 : 1.5, borderStyle: 'dashed', borderColor: C.filet,
                  }}>
                    {done ? <Check size={14} color={C.profond} /> : active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.creme }} /> : null}
                  </View>
                  <Txt style={{ fontFamily: active ? F.bodyBold : F.body, fontSize: 14, color: done ? C.foret500 : active ? C.profond : C.texte2 }}>{label}</Txt>
                </View>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Bouton collant « Passer à mardi » / « Valider le menu ».
export function NextDayButton({ label, onPress, bottom }: { label: string; onPress: () => void; bottom: number }) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom }}>
      <Pressable onPress={onPress} accessibilityRole="button"
        style={({ pressed }) => ({
          height: 52, borderRadius: R.pill, backgroundColor: pressed ? C.profond : C.foret, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          shadowColor: C.profond, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8,
        })}>
        <Txt style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.creme }}>{label}</Txt>
        <ArrowRight size={16} color={C.creme} />
      </Pressable>
    </View>
  )
}
