import './globals.css';

export const metadata = {
  title: 'Expense & Split — Karri Sons',
  description: 'A modern family expense tracker and split manager.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
