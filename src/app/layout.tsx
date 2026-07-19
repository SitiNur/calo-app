import type { Metadata, Viewport } from 'next';
import { Manrope, Fraunces } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Calo — Asisten Diet',
  description: 'Catat kalori dengan chat. Teks atau foto makanan, target harian dari TDEE-mu.',
  applicationName: 'Calo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Calo',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#2B6CB0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${manrope.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <div className="app-shell">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
