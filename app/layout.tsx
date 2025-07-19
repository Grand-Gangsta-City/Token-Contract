import './globals.css';
import NavBar from '../components/NavBar';
import type { ReactNode } from 'react';
import { WalletProvider } from '../context/WalletContext';
import '../public/BG.png';

export const metadata = {
  title: 'Grand Gansta City (GGC)',
  description: 'GGC Token Dashboard',
  icons: {
    icon: '/GGClogo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <NavBar />
          <main className="pt-20 pb-10 px-4 md:px-8">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}