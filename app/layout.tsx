import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Nunito_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegister } from '@/components/layout/service-worker-register'

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-dosis',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
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
      <body className={`${bricolageGrotesque.variable} ${nunitoSans.variable} font-quicksand antialiased`}>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
