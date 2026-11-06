import { useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown, Search, X } from 'lucide-react-native'
import { C, F, R, SHADOW } from '@/theme'
import { Txt } from './Txt'
import { IconButton } from './Button'

// Feuille modale qui monte du bas (choix d'une recette, préférences…).
export function Sheet({ open, onClose, title, subtitle, children, footer, maxHeight = '88%' }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string
  children: React.ReactNode; footer?: React.ReactNode; maxHeight?: `${number}%`
}) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(31,58,46,0.35)' }} />
        <View style={[{ maxHeight, backgroundColor: C.creme, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom }, SHADOW.sheet]}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.filet }} />
          </View>
          {(title || subtitle) && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ flex: 1 }}>
                {!!title && <Txt variant="h3">{title}</Txt>}
                {!!subtitle && <Txt variant="small" style={{ marginTop: 2 }}>{subtitle}</Txt>}
              </View>
              <IconButton icon={X} label="Fermer" onPress={onClose} size={36} tone="creme" />
            </View>
          )}
          <View style={{ flexShrink: 1 }}>{children}</View>
          {footer && <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderColor: C.lin }}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export interface SelectOption<V extends string = string> { value: V; label: string }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Liste déroulante avec recherche (équivalent de components/ui/select.tsx) :
// un déclencheur, et la liste s'ouvre dans une feuille.
export function Select<V extends string>({ value, onChange, options, placeholder = 'Choisir…', label, size = 'md', invalid, searchable = true }: {
  value: V; onChange: (v: V) => void; options: SelectOption<V>[]; placeholder?: string; label: string
  size?: 'sm' | 'md'; invalid?: boolean; searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find(o => o.value === value && o.value !== '')
  const filtered = useMemo(() => {
    const q = fold(query.trim())
    return q ? options.filter(o => fold(o.label).includes(q)) : options
  }, [options, query])

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        onPress={() => { setQuery(''); setOpen(true) }}
        style={{
          height: size === 'sm' ? 36 : 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14,
          borderRadius: size === 'sm' ? R.pill : R.md, backgroundColor: '#FFFFFF',
          borderWidth: size === 'sm' ? 0 : 1.5, borderColor: invalid ? C.danger : C.filet,
        }}
      >
        <Txt numberOfLines={1} style={{ flex: 1, fontFamily: selected ? F.bodySemi : F.body, fontSize: size === 'sm' ? 13 : 15, color: selected ? C.profond : C.texte2 }}>
          {selected?.label ?? placeholder}
        </Txt>
        <ChevronDown size={16} color={C.texte2} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={label} maxHeight="75%">
        {searchable && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: R.pill, backgroundColor: '#FFFFFF', paddingHorizontal: 14 }}>
            <Search size={16} color={C.texte2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher…"
              placeholderTextColor={C.texte2}
              accessibilityLabel="Rechercher"
              style={{ flex: 1, fontFamily: F.body, fontSize: 15, color: C.profond }}
            />
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={o => o.value || '__empty'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
          ListEmptyComponent={<Txt variant="small" style={{ textAlign: 'center', paddingVertical: 20 }}>Aucun résultat</Txt>}
          renderItem={({ item }) => {
            const isSel = item.value === value
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                onPress={() => { onChange(item.value); setOpen(false) }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: R.sm, backgroundColor: pressed || isSel ? C.foret50 : 'transparent' })}
              >
                <Txt style={{ flex: 1, fontFamily: isSel ? F.bodyBold : F.body, color: isSel ? C.foret : C.profond }}>{item.label}</Txt>
                {isSel && <Check size={16} color={C.foret500} />}
              </Pressable>
            )
          }}
        />
      </Sheet>
    </>
  )
}
