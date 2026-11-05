// Sauvegarde complète de la base Supabase puis remise à zéro, en gardant
// seulement les tables de paramètres (categories, pantry_categories,
// feedback_templates).
//
//   npm run db:backup-reset                  → sauvegarde + simulation (rien n'est supprimé)
//   npm run db:backup-reset -- --confirm     → sauvegarde puis suppression réelle
//   npm run db:backup-reset -- --confirm --keep-auth
//                                            → garde les comptes de connexion (auth.users) :
//                                              le profil est recréé à la prochaine connexion
//   npm run db:backup-reset -- --confirm --keep-photos
//                                            → ne vide pas le bucket recipe-photos
//
// Sauvegarde : backups/<horodatage>/ (ignoré par Git), un JSON par table,
// auth-users.json, les photos du bucket et un manifest.json.
// Projet visé : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY de .env.local.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const KEEP = ['categories', 'pantry_categories', 'feedback_templates']

// Ordre de suppression : les tables filles d'abord (cf. clés étrangères des
// migrations). family_circles avant users (created_by en « on delete restrict »).
const PURGE = [
  'survey_answers', 'survey_responses', 'meal_feedback', 'meal_compositions',
  'shopping_list_items', 'shopping_lists', 'meal_plan_items', 'meal_plans',
  'recipe_associations', 'recipe_favorites', 'recipe_imports', 'recipe_ingredients',
  'recipe_steps', 'recipe_import_attempts', 'recipes',
  'member_dietary_prefs', 'notification_prefs', 'pantry_items', 'push_subscriptions',
  'user_meal_config', 'family_circle_members', 'family_circles', 'users',
]

const BUCKET = 'recipe-photos'
const PAGE = 1000

const args = new Set(process.argv.slice(2))
const CONFIRM = args.has('--confirm')
const KEEP_AUTH = args.has('--keep-auth')
const KEEP_PHOTOS = args.has('--keep-photos')

function loadEnv(file = '.env.local'): void {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

// Garde-fou : toute table du schéma généré doit être classée (gardée ou vidée).
function checkTableList(): void {
  const types = readFileSync('lib/supabase/database.types.ts', 'utf8').replace(/\r\n/g, '\n')
  const block = types.slice(types.indexOf('Tables: {'), types.indexOf('Views: {'))
  const known = Array.from(block.matchAll(/\n {6}([a-z_]+): \{\n {8}Row:/g)).map(m => m[1])
  const unknown = known.filter(t => !KEEP.includes(t) && !PURGE.includes(t))
  if (unknown.length) throw new Error(`Tables non classées dans le script : ${unknown.join(', ')}. Ajoute-les à KEEP ou PURGE.`)
}

// Table absente du projet (migration pas encore appliquée) : signalée, pas bloquante.
const missingTable = (e: { code?: string; message: string }) => e.code === 'PGRST205' || /could not find the table/i.test(e.message)

async function dumpTable(db: SupabaseClient, table: string): Promise<unknown[] | null> {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').order('id').range(from, from + PAGE - 1)
    if (error && missingTable(error)) return null
    if (error) throw new Error(`Lecture de ${table} : ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

async function listAuthUsers(db: SupabaseClient) {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) throw new Error(`Lecture des comptes : ${error.message}`)
    users.push(...data.users)
    if (data.users.length < PAGE) return users
  }
}

// Liste récursive du bucket (les dossiers n'ont pas d'id).
async function listFiles(db: SupabaseClient, prefix = ''): Promise<string[]> {
  const out: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`Lecture du bucket ${BUCKET} : ${error.message}`)
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) out.push(path)
      else out.push(...await listFiles(db, path))
    }
    if (!data || data.length < PAGE) return out
  }
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local).')
  checkTableList()

  // Le temps réel ne sert pas ici : un faux transport évite d'exiger le paquet
  // « ws » sous Node 20 (pas de WebSocket natif).
  class NoWebSocket { constructor() { throw new Error('Temps réel non utilisé par ce script.') } }
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: NoWebSocket as unknown as NonNullable<NonNullable<Parameters<typeof createClient>[2]>['realtime']>['transport'] },
  })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join('backups', stamp)
  mkdirSync(dir, { recursive: true })
  console.log(`Projet : ${new URL(url).host}`)
  console.log(`Sauvegarde dans ${dir}\n`)

  // 1. Sauvegarde : toutes les tables, y compris celles qu'on garde.
  const counts: Record<string, number> = {}
  const missing: string[] = []
  for (const table of [...KEEP, ...PURGE]) {
    const rows = await dumpTable(db, table)
    if (!rows) {
      missing.push(table)
      console.log(`  ${table.padEnd(24)}  absente du projet (migration non appliquée), ignorée`)
      continue
    }
    counts[table] = rows.length
    writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2))
    console.log(`  ${table.padEnd(24)} ${String(rows.length).padStart(6)} ligne(s)${KEEP.includes(table) ? '  (gardée)' : ''}`)
  }

  const authUsers = await listAuthUsers(db)
  writeFileSync(join(dir, 'auth-users.json'), JSON.stringify(authUsers, null, 2))
  console.log(`  ${'auth.users'.padEnd(24)} ${String(authUsers.length).padStart(6)} compte(s)`)

  const files = await listFiles(db)
  for (const path of files) {
    const { data, error } = await db.storage.from(BUCKET).download(path)
    if (error || !data) throw new Error(`Téléchargement de ${path} : ${error?.message}`)
    const target = join(dir, 'storage', BUCKET, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, Buffer.from(await data.arrayBuffer()))
  }
  console.log(`  ${`storage/${BUCKET}`.padEnd(24)} ${String(files.length).padStart(6)} fichier(s)`)

  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
    created_at: new Date().toISOString(), project: new URL(url).host,
    kept: KEEP, purged: PURGE.filter(t => !missing.includes(t)), missing, counts, auth_users: authUsers.length, storage_files: files.length,
  }, null, 2))

  if (!CONFIRM) {
    console.log('\nSimulation : rien n\'a été supprimé. Relance avec --confirm pour vider la base.')
    return
  }

  // 2. Suppression, tables filles d'abord. PostgREST exige un filtre : « id non nul » prend tout.
  console.log('\nSuppression…')
  for (const table of PURGE.filter(t => !missing.includes(t))) {
    const { error, count } = await db.from(table).delete({ count: 'exact' }).not('id', 'is', null)
    if (error) throw new Error(`Suppression dans ${table} : ${error.message} (sauvegarde intacte dans ${dir})`)
    console.log(`  ${table.padEnd(24)} ${String(count ?? 0).padStart(6)} supprimée(s)`)
  }

  if (!KEEP_AUTH) {
    for (const u of authUsers) {
      const { error } = await db.auth.admin.deleteUser(u.id)
      if (error) throw new Error(`Suppression du compte ${u.id} : ${error.message}`)
    }
    console.log(`  ${'auth.users'.padEnd(24)} ${String(authUsers.length).padStart(6)} supprimé(s)`)
  }

  if (!KEEP_PHOTOS && files.length) {
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await db.storage.from(BUCKET).remove(files.slice(i, i + 100))
      if (error) throw new Error(`Suppression des photos : ${error.message}`)
    }
    console.log(`  ${`storage/${BUCKET}`.padEnd(24)} ${String(files.length).padStart(6)} supprimé(s)`)
  }

  console.log(`\nTerminé. Tables gardées : ${KEEP.join(', ')}.`)
}

main().catch(e => {
  console.error(`\nErreur : ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
