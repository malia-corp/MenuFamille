import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from './env'
import { supabase } from './supabase'

// Client des routes /api/* de la version web. Le jeton de session part dans
// l'en-tête Authorization (le serveur l'accepte à la place du cookie, cf.
// lib/supabase/server.ts côté web).
//
// Hors connexion : les lectures (GET) réussies sont gardées sur l'appareil et
// resservies si le réseau manque — l'équivalent du cache du service worker.

const CACHE_PREFIX = 'kkb-api:'

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
  }
}

export interface ApiResult<T> {
  ok:      boolean
  status:  number
  data:    T
  offline: boolean // réponse servie depuis le cache local
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Appel brut : ne lève pas d'erreur HTTP, renvoie statut et corps.
export async function request<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = { Accept: 'application/json', ...(await authHeader()), ...(init.headers as Record<string, string> | undefined) }
  let body = init.body
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(init.json)
  }

  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, method, headers, body })
    const text = await res.text()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (method === 'GET' && res.ok) {
      AsyncStorage.setItem(CACHE_PREFIX + path, text).catch(() => {})
    }
    return { ok: res.ok, status: res.status, data: data as T, offline: false }
  } catch (e) {
    // Réseau indisponible : dernière réponse connue pour une lecture.
    if (method === 'GET') {
      const cached = await AsyncStorage.getItem(CACHE_PREFIX + path).catch(() => null)
      if (cached !== null) {
        let data: unknown = null
        try { data = JSON.parse(cached) } catch { data = null }
        return { ok: true, status: 200, data: data as T, offline: true }
      }
    }
    throw new ApiError(0, 'Connexion impossible. Vérifie ton réseau.', e)
  }
}

// Appel qui lève une ApiError si la réponse n'est pas OK.
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await request<T>(path, init)
  if (!res.ok) {
    const msg = (res.data as { error?: string } | null)?.error ?? `Erreur ${res.status}`
    throw new ApiError(res.status, msg, res.data)
  }
  return res.data
}

// Lecture tolérante : null si erreur (équivalent des .catch(() => null) du web).
export async function get<T = unknown>(path: string): Promise<T | null> {
  try {
    const res = await request<T>(path)
    return res.ok ? res.data : null
  } catch {
    return null
  }
}

export function errorMessage(e: unknown, fallback = 'Erreur de connexion'): string {
  return e instanceof Error && e.message ? e.message : fallback
}

// Vide le cache local (déconnexion), comme les caches kkb-user-* du web.
export async function clearApiCache() {
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[])
  const mine = keys.filter(k => k.startsWith(CACHE_PREFIX))
  if (mine.length) await AsyncStorage.multiRemove(mine).catch(() => {})
}
