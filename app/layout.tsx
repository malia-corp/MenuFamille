import type { Metadata, Viewport } from 'next'
import { DynaPuff, Montserrat, Quicksand } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegister } from '@/components/layout/service-worker-register'

// Guide de marque v1.0, chapitre 04 : Montserrat titre, Quicksand lit
// (T-01), DynaPuff en accent rare. Auto-hébergées par next/font, sous-ensemble
// latin, font-display: swap (T-02), repli system-ui (T-04).
// Les noms de variables (--font-dosis, --font-quicksand) sont historiques :
// font-dosis = titres, font-quicksand = texte, font-main = accent manuscrit.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  variable: '--font-dosis',
})

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  variable: '--font-quicksand',
})

const dynaPuff = DynaPuff({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  fallback: ['cursive'],
  variable: '--font-main',
})

export const metadata: Metadata = {
  title: 'KeskonBouf — Saveurs & Partage',
  description:
    'PWA mobile-first de planification de menus hebdomadaires pour familles béninoises et africaines francophones.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-icon.svg',
    shortcut: '/logo.ico',
    apple: '/logo-icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KeskonBouf',
  },
  openGraph: {
    title: 'KeskonBouf — Saveurs & Partage',
    description:
      'PWA mobile-first de planification de menus hebdomadaires pour familles béninoises et africaines francophones.',
  },
}

// Next 14 : themeColor et viewport passent par l'export `viewport` (plus
// dans `metadata`).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2664A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} ${quicksand.variable} ${dynaPuff.variable} font-quicksand antialiased`}>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
