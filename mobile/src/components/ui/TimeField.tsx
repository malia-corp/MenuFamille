import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Clock } from 'lucide-react-native'
import { C, F, R } from '@/theme'
import { Txt } from './Txt'
import { Sheet } from './Sheet'
import { Button } from './Button'

const pad = (n: number) => String(n).padStart(2, '0')
const MINUTES = [0, 15, 30, 45]

// Choix d'une heure « HH:MM » (pas de 15 min), l'équivalent du <input type="time"> du web.
export function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [h, m] = (value || '12:00').slice(0, 5).split(':').map(Number)
  const [hour, setHour] = useState(h)
  const [minute, setMinute] = useState(m)

  return (
    <>
      <Pressable onPress={() => { setHour(h); setMinute(m); setOpen(true) }} accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: value || 'non définie' }}
        style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 12 }}>
        <Txt style={{ fontFamily: F.title, fontSize: 16, color: C.foret }}>{value ? value.slice(0, 5) : '--:--'}</Txt>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} maxHeight="70%"
        footer={<Button label={`Choisir ${pad(hour)}:${pad(minute)}`} icon={Clock} tone="foret" full onPress={() => { onChange(`${pad(hour)}:${pad(minute)}`); setOpen(false) }} />}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
          <Txt variant="label">Heure</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: 24 }, (_, i) => i).map(i => {
              const sel = i === hour
              return (
                <Pressable key={i} onPress={() => setHour(i)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ width: '14.5%', height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? C.foret : '#FFFFFF' }}>
                  <Txt style={{ fontFamily: F.title, fontSize: 15, color: sel ? C.creme : C.profond }}>{pad(i)}</Txt>
                </Pressable>
              )
            })}
          </View>
          <Txt variant="label">Minutes</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MINUTES.map(i => {
              const sel = i === minute
              return (
                <Pressable key={i} onPress={() => setMinute(i)} accessibilityRole="radio" accessibilityState={{ checked: sel }}
                  style={{ flex: 1, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? C.foret : '#FFFFFF' }}>
                  <Txt style={{ fontFamily: F.title, fontSize: 16, color: sel ? C.creme : C.profond }}>{pad(i)}</Txt>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      </Sheet>
    </>
  )
}
