import { useState } from 'react'
import { Image, View } from 'react-native'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Copy, Eye, GitBranch, Plus } from 'lucide-react-native'
import { Button, Field, Sheet, Txt } from '@/components/ui'
import { C, F, R } from '@/theme'

export interface SimilarRecipe { id: string; name: string; photo_url: string | null; created_at: string; author_name: string | null; similarity: number }

// Décision de cadrage n°1 : utiliser l'existante / créer une variante / créer quand même.
export function DuplicateDialog({ duplicate, busy, error, onUseExisting, onVariant, onCreateAnyway, onClose }: {
  duplicate: SimilarRecipe; busy: boolean; error: string | null
  onUseExisting: () => void; onVariant: (label: string) => void; onCreateAnyway: () => void; onClose: () => void
}) {
  const [variantOpen, setVariantOpen] = useState(false)
  const [label, setLabel] = useState('')
  return (
    <Sheet open onClose={() => { if (!busy) onClose() }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Copy size={32} color={C.orange} />
          <Txt variant="h2" style={{ textAlign: 'center' }}>Recette déjà connue ?</Txt>
          <Txt variant="small" style={{ textAlign: 'center', fontSize: 14 }}>Une recette semblable existe déjà dans le carnet.</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: R.lg, backgroundColor: '#FFFFFF', padding: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.orange100 }}>
            {duplicate.photo_url && <Image source={{ uri: duplicate.photo_url }} style={{ width: '100%', height: '100%' }} />}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt numberOfLines={1} variant="h3">{duplicate.name}</Txt>
            <Txt variant="meta">
              Ajoutée{duplicate.author_name ? ` par ${duplicate.author_name}` : ''} · {formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true, locale: fr })}
            </Txt>
            <View style={{ alignSelf: 'flex-start', borderRadius: R.pill, backgroundColor: C.jaune50, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Txt style={{ fontFamily: F.bodyBold, fontSize: 11, color: C.jauneText }}>{duplicate.similarity}% de similarité</Txt>
            </View>
          </View>
        </View>
        {!!error && <Txt variant="small" color={C.danger}>{error}</Txt>}
        <View style={{ gap: 8 }}>
          <Button label="Voir la recette existante" icon={Eye} tone="orange" full onPress={onUseExisting} disabled={busy} />
          <Txt variant="meta" style={{ textAlign: 'center' }}>Elle sera ajoutée à tes favoris.</Txt>
          <Button label="Créer comme variante…" icon={GitBranch} tone="ghost" full onPress={() => setVariantOpen(o => !o)} disabled={busy} />
          {variantOpen && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field value={label} onChangeText={setLabel} autoFocus placeholder="Libellé distinctif (ex. sans piment)" accessibilityLabel="Libellé de la variante" style={{ flex: 1 }} />
              <Button label="Créer" tone="foret" onPress={() => onVariant(label.trim())} disabled={busy || !label.trim()} />
            </View>
          )}
          <Button label="Créer quand même" icon={Plus} tone="link" full onPress={onCreateAnyway} loading={busy} />
        </View>
      </View>
    </Sheet>
  )
}
