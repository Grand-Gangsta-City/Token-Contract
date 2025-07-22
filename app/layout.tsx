import './globals.css';
import NavBar from '../components/NavBar';
import { WalletProvider } from '../context/WalletContext';
import ClientLayout from '@/components/ClientLayout';
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
          <ClientLayout>
            {children}
          </ClientLayout>
        </WalletProvider>
      </body>
    </html>
  );
}