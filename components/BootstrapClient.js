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

  // Catch orphaned backdrops that block Reject / Mark read / other clicks
  useEffect(() => {
    function sweep() {
      const hasOpenModal = document.querySelector('.modal.show');
      const hasOpenOffcanvas = document.querySelector('.offcanvas.show');
      if (hasOpenModal || hasOpenOffcanvas) return;
      if (document.querySelector('.modal-backdrop, .offcanvas-backdrop') || document.body.classList.contains('modal-open')) {
        clearBootstrapOverlays();
      }
    }
    sweep();
    document.addEventListener('click', sweep, true);
    const timer = window.setInterval(sweep, 2000);
    return () => {
      document.removeEventListener('click', sweep, true);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
