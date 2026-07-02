import { BookOpen } from 'lucide-react'

export default function RecipesPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center gap-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-[#FCEEE6] flex items-center justify-center">
        <BookOpen className="h-8 w-8 text-terracotta" />
      </div>
      <div className="space-y-1">
        <h1 className="font-dosis font-bold text-xl text-[#2C1810]">Carnet de recettes</h1>
        <p className="text-sm text-[#8c7169] font-quicksand">Bientôt disponible au Sprint 2.</p>
      </div>
    </div>
  )
}
