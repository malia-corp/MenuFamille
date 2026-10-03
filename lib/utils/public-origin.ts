// Origine publique de l'application (liens d'e-mail, redirections d'auth).
// Derrière un proxy (nginx → next start sur un port local), request.nextUrl
// peut valoir http://localhost:PORT : on préfère, dans l'ordre,
//   1. APP_URL (ex. https://test.keskonbouf.app), si défini ;
//   2. les en-têtes transmis par le proxy (x-forwarded-host / -proto) ;
//   3. l'origine de la requête (développement local).
export function publicOrigin(request: { headers: Headers; nextUrl: { origin: string } }): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured

  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return `${proto}://${host}`
  }

  return request.nextUrl.origin
}
