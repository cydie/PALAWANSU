import { DM_Sans, Fraunces } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import BootstrapClient from '@/components/BootstrapClient';

const sans = DM_Sans({ subsets: ['latin'], display: 'swap' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata = {
  title: 'PALAWANSU',
  description: 'PalawanSU–Rizal Student Deficiency Monitoring System',
};

export const viewport = {
  themeColor: '#073447',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sans.className} ${display.variable}`}>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
