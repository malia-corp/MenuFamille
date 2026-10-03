import type { Metadata } from 'next'
import { Bricolage_Grotesque, Nunito_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

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
    apple: '/logo-icon.svg',
  },
  openGraph: {
    title: 'KeskonBouf — Saveurs & Partage',
    description:
      'PWA mobile-first de planification de menus hebdomadaires pour familles béninoises et africaines francophones.',
  },
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
      </body>
    </html>
  )
}
