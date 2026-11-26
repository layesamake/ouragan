import type { Metadata, Viewport } from 'next'
import React from 'react'

import { Footer } from '../../components/Footer'
import { Header } from '../../components/Header'
import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ouragan.sn'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ouragan.sn — L'info en live",
    template: '%s | Ouragan.sn',
  },
  description:
    "Ouragan.sn, l'info en live : politique, société, économie, sport, culture… toute l'actualité du Sénégal.",
  icons: { icon: '/icon.png', apple: '/icon.png' },
  openGraph: {
    siteName: 'Ouragan.sn',
    locale: 'fr_SN',
    type: 'website',
    images: ['/logo-ouragan.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#27a3d9',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
