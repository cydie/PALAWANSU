'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clearBootstrapOverlays, getBootstrap } from '@/lib/bootstrap-ui';

export default function BootstrapClient() {
  const pathname = usePathname();

  useEffect(() => {
    getBootstrap().catch(() => {});
  }, []);

  // Next.js client navigations leave Bootstrap backdrops behind (gray overlay, forms unusable)
  useEffect(() => {
    clearBootstrapOverlays();
  }, [pathname]);

  return null;
}
