import './globals.css';
import NavBar from '../components/NavBar';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Global Gold Chain (GGC)',
  description: 'GGC Token Dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="pt-20 pb-10 px-4 md:px-8">{children}</main>
      </body>
    </html>
  );
}