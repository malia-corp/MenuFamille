import type { Metadata } from 'next'
import { Dosis, Quicksand } from 'next/font/google'
import './globals.css'

const dosis = Dosis({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-dosis',
})

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-quicksand',
})

export const metadata: Metadata = {
  title: 'MenuFamille — Planification de menus familiaux',
  description:
    'PWA mobile-first de planification de menus hebdomadaires pour familles béninoises et africaines francophones.',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${dosis.variable} ${quicksand.variable} font-quicksand antialiased`}>
        {children}
      </body>
    </html>
  )
}
