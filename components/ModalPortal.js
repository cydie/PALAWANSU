'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Render Bootstrap modals on document.body so parent z-index cannot trap them under the backdrop. */
export default function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
