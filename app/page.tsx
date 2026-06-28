export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-terracotta text-4xl">
          🍲
        </div>

        <h1 className="mb-2 text-3xl font-bold text-terracotta">MenuFamille</h1>

        <p className="mb-8 text-lg text-gray-600">Planification de menus familiaux</p>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-4 text-sm text-gray-500">
          <p className="font-medium text-gray-700">Sprint 0 — Fondations techniques</p>
          <p className="mt-1">Configuration · Base de données · CI/CD</p>
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs text-gray-400">
          <p>Next.js 14 · Tailwind CSS · shadcn/ui · Supabase</p>
          <p>
            Stack imposé · <span className="text-market-green">Vercel CI/CD actif</span>
          </p>
        </div>
      </div>
    </main>
  )
}
