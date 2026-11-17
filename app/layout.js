import { Source_Sans_3 } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import BootstrapClient from '@/components/BootstrapClient';

const sans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'PSU Rizal · Student Deficiency Monitoring',
  description: 'Palawan State University – Rizal Campus Student Deficiency Monitoring System',
  icons: {
    icon: '/brand/rizal-campus-logo.png',
  },
};

export const viewport = {
  themeColor: '#063056',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sans.className}>
        <BootstrapClient />
        {children}
      </body>
    </html>
  );
}
