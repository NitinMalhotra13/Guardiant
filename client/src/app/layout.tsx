import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';
import { Providers } from './providers';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProtectionNotification from '../components/ProtectionNotification';

export const metadata = {
  title: 'Guardiant — AI Wallet Protection',
  description: 'AI-powered Web3 wallet protection. Stop rug pulls before they drain your funds.',
  keywords: 'crypto security, rug pull protection, anomaly detection, DeFi safety, Web3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="/favicon.ico" rel="icon" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ paddingTop: 64, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Providers>
          <Navbar />
          <div style={{ flex: 1 }}>{children}</div>
          <Footer />
          <ProtectionNotification />
        </Providers>
      </body>
    </html>
  );
}
