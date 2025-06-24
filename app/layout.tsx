import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhatsApp Parser',
  description: 'Used to Parse WhatsApp chat Exports',
  icons: {
    icon: 'https://logodownload.org/wp-content/uploads/2015/04/whatsapp-logo-7.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
