'use client';

import { useEffect, useRef } from 'react';

/**
 * Keep page data fresh: poll on an interval, and refresh on tab focus/visibility.
 * Pass a stable load callback (or one that reads latest filters via refs/state).
 */
export function useLiveReload(loadFn, { intervalMs = 3000, enabled = true } = {}) {
  const loadRef = useRef(loadFn);
  loadRef.current = loadFn;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let inFlight = false;

    async function tick(force = false) {
      if (cancelled || inFlight) return;
      if (!force && typeof document !== 'undefined' && document.hidden) return;
      inFlight = true;
      try {
        await loadRef.current();
      } catch {
        // Ignore transient network/API blips during live refresh.
      } finally {
        inFlight = false;
      }
    }

    tick(true);
    const id = window.setInterval(tick, intervalMs);
    const onFocus = () => tick();
    const onVis = () => {
      if (!document.hidden) tick();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs, enabled]);
}
