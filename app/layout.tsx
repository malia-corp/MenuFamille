import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Montserrat, Quicksand } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegister } from '@/components/layout/service-worker-register'

// Guide de marque v1.0, chapitre 04 : Montserrat titre, Quicksand lit
// (T-01), Bricolage Grotesque en accent rare. Auto-hébergées par next/font, sous-ensemble
// latin, font-display: swap (T-02), repli system-ui (T-04).
// Les noms de variables (--font-dosis, --font-quicksand) sont historiques :
// font-dosis = titres, font-quicksand = texte, font-main = accent expressif.
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

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  variable: '--font-main',
})

export const metadata: Metadata = {
  title: 'KeskonBouf — On mange quoi ? On décide ensemble.',
  description:
    'Planifie les repas de la semaine, réunis ta table et décidez ensemble de ce qu\'on mange.',
  manifest: '/manifest.json',
  // Sous 48 px, seul le visage orange subsiste (guide, chapitre 07).
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KeskonBouf',
  },
  openGraph: {
    title: 'KeskonBouf — On mange quoi ? On décide ensemble.',
    description: 'Planifie les repas de la semaine, réunis ta table et décidez ensemble de ce qu\'on mange.',
  },
}

// Next 14 : themeColor et viewport passent par l'export `viewport` (plus
// dans `metadata`).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#294E3B', // vert forêt (manifeste, guide chapitre 07)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} ${quicksand.variable} ${bricolage.variable} font-quicksand antialiased`}>
        {children}
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
