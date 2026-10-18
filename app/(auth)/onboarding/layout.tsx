// Carte centrée de l'onboarding (la connexion gère sa propre mise en page).
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-sm lg:max-w-[480px] lg:bg-white lg:rounded-[var(--kkb-radius-card)] lg:shadow-[var(--kkb-shadow-card)] lg:p-12">
        {children}
      </div>
    </div>
  )
}
