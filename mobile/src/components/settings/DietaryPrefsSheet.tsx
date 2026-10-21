import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Plus, X } from 'lucide-react-native'
import { Button, Field, Sheet, Txt } from '@/components/ui'
import { request } from '@/lib/api'
import { toast } from '@/lib/toast'
import { PREF_TYPE_OPTIONS, prefChipStyle, type Pref, type PrefType, type Severity } from '@/shared/dietary-pref'
import { C, F, R } from '@/theme'

// Feuille : ses propres préférences alimentaires (cf. components/settings/dietary-prefs-sheet.tsx).
export function DietaryPrefsSheet({ open, prefs, onChange, onClose }: { open: boolean; prefs: Pref[]; onChange: (p: Pref[]) => void; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [type, setType] = useState<PrefType>('allergy')
  const [severity, setSeverity] = useState<Severity>('strict')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  async function add() {
    if (!value.trim() || saving) return
    setSaving(true)
    const res = await request<Pref & { error?: string }>('/api/users/me/dietary-prefs', {
      method: 'POST', json: { pref_type: type, value: value.trim(), severity: type === 'allergy' ? severity : undefined },
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok || !res.data?.id) { toast.error(res?.data?.error ?? 'Erreur de connexion'); return }
    const saved = res.data
    onChange([...prefs.filter(p => p.id !== saved.id), saved])
    setValue('')
  }

  async function remove(id: string) {
    setRemoving(id)
    const res = await request(`/api/users/me/dietary-prefs/${id}`, { method: 'DELETE' }).catch(() => null)
    setRemoving(null)
    if (!res?.ok) { toast.error('Impossible de supprimer'); return }
    onChange(prefs.filter(p => p.id !== id))
  }

  return (
    <Sheet open={open} onClose={onClose} title="Préférences alimentaires" subtitle="Prises en compte lors de la génération du menu."
      footer={<Button label="Ajouter" icon={Plus} tone="orange" full loading={saving} disabled={!value.trim()} onPress={() => void add()} />}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        {prefs.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {prefs.map(p => {
              const s = prefChipStyle(p)
              return (
                <Pressable key={p.id} onPress={() => void remove(p.id)} disabled={removing === p.id} accessibilityLabel={`Retirer ${p.value}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, borderWidth: 1, borderColor: s.border, backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, opacity: removing === p.id ? 0.5 : 1 }}>
                  {s.Icon && <s.Icon size={12} color={s.fg} />}
                  <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: s.fg }}>{p.value}</Txt>
                  <X size={12} color={s.fg} style={{ opacity: 0.6 }} />
                </Pressable>
              )
            })}
          </View>
        ) : <Txt variant="small" style={{ fontStyle: 'italic' }}>Aucune préférence renseignée pour l’instant.</Txt>}

        <View style={{ gap: 10, paddingTop: 14, borderTopWidth: 1, borderColor: C.lin }}>
          <Field value={value} onChangeText={setValue} placeholder="Ingrédient ou plat (ex : arachide, piment…)" accessibilityLabel="Ingrédient ou plat"
            returnKeyType="done" onSubmitEditing={() => void add()} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PREF_TYPE_OPTIONS.map(o => {
              const sel = type === o.value
              return (
                <Pressable key={o.value} onPress={() => setType(o.value)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ width: '48%', flexGrow: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, borderWidth: 1, borderColor: sel ? C.foret : C.filet, backgroundColor: sel ? C.foret : '#FFFFFF' }}>
                  <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: sel ? C.creme : C.texte2 }}>{o.label}</Txt>
                </Pressable>
              )
            })}
          </View>
          {type === 'allergy' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['strict', 'Sévère (exclure)'], ['light', 'Légère (éviter)']] as const).map(([s, label]) => {
                const sel = severity === s
                return (
                  <Pressable key={s} onPress={() => setSeverity(s)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                    style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, borderWidth: 1, borderColor: sel ? C.danger : C.filet, backgroundColor: sel ? C.dangerLight : '#FFFFFF' }}>
                    <Txt style={{ fontFamily: F.bodySemi, fontSize: 12, color: sel ? C.danger : C.texte2 }}>{label}</Txt>
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </Sheet>
  )
}
