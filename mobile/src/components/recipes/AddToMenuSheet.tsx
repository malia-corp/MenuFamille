import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { Button, Sheet, Txt } from '@/components/ui'
import { get, request } from '@/lib/api'
import { MEAL_LABEL, type MealType } from '@/shared/meal-type'
import { DAY_OPTIONS, getMondayISO, shiftWeek, type DayOfWeek } from '@/shared/week'
import { C, F, R } from '@/theme'

function Choice({ label, active, onPress, flex }: { label: string; active: boolean; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={{ flex: flex ? 1 : undefined, height: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill, borderWidth: 1.5, borderColor: active ? C.foret : C.filet, backgroundColor: active ? C.foret : '#FFFFFF' }}>
      <Txt style={{ fontFamily: F.bodyBold, fontSize: 13, color: active ? C.creme : C.texte2 }}>{label}</Txt>
    </Pressable>
  )
}

// Ajoute une recette à un créneau (semaine, jour, repas) du menu.
export function AddToMenuSheet({ recipeId, open, onClose }: { recipeId: string; open: boolean; onClose: () => void }) {
  const [week, setWeek] = useState<'current' | 'next'>('current')
  const [day, setDay] = useState<DayOfWeek | ''>('')
  const [meal, setMeal] = useState<MealType | ''>('')
  const [meals, setMeals] = useState<MealType[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDone(false); setError(null)
    if (meals) return
    void get<{ meal_type: MealType; is_active?: boolean }[]>('/api/users/me/meal-config').then(data => {
      const active = (Array.isArray(data) ? data : []).filter(c => c.is_active !== false).map(c => c.meal_type)
      setMeals(active)
      if (active.length) setMeal(m => m || active[0])
    })
  }, [open, meals])

  async function confirm() {
    if (!day || !meal) return
    setSaving(true); setError(null)
    try {
      const weekStart = week === 'current' ? getMondayISO() : shiftWeek(getMondayISO(), 1)
      const plan = await request<{ id?: string }>(`/api/meal-plans?week=${weekStart}`)
      if (!plan.ok || !plan.data?.id) throw new Error('Plan introuvable')
      const item = await request<{ error?: string }>(`/api/meal-plans/${plan.data.id}/items`, { method: 'POST', json: { day_of_week: day, meal_type: meal, recipe_id: recipeId } })
      if (!item.ok) throw new Error(item.data?.error ?? 'Erreur')
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter à mon menu" subtitle="Choisis la semaine, le jour et le repas."
      footer={done ? (
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={16} color={C.foret500} />
          <Txt variant="smallBold" color={C.foret500} style={{ fontSize: 14 }}>Recette ajoutée au menu !</Txt>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Annuler" tone="ghost" onPress={onClose} flex />
          <Button label="Confirmer" tone="orange" onPress={() => void confirm()} disabled={!day || !meal} loading={saving} flex />
        </View>
      )}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Txt variant="label">Semaine</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Choice label="Cette semaine" active={week === 'current'} onPress={() => setWeek('current')} flex />
            <Choice label="Semaine prochaine" active={week === 'next'} onPress={() => setWeek('next')} flex />
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt variant="label">Jour</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {DAY_OPTIONS.map(d => <Choice key={d.val} label={d.label} active={day === d.val} onPress={() => setDay(d.val)} />)}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt variant="label">Repas</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(meals ?? []).map(m => <Choice key={m} label={MEAL_LABEL[m]} active={meal === m} onPress={() => setMeal(m)} />)}
          </View>
        </View>
        {!!error && <Txt variant="small" color={C.danger}>{error}</Txt>}
      </View>
    </Sheet>
  )
}
