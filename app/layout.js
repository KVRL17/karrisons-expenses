import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Expense & Split — Karri Sons',
  description: 'A modern family expense tracker and split manager.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Karri Split',
    statusBarStyle: 'default'
  }
};

export const viewport = {
  themeColor: '#111629'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
