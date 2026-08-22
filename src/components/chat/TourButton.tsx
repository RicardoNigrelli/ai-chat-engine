'use client';

import { useEffect } from 'react';
import { startTour, startTourIfFirstVisit } from '@/lib/tour';

export function TourButton({ className = '' }: { className?: string }) {
  useEffect(() => {
    // Deja que el layout inicial (mensajes, panel de traza) termine de
    // pintar antes de medir posiciones para el overlay.
    const id = setTimeout(startTourIfFirstVisit, 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <button
      type="button"
      onClick={startTour}
      className={`shrink-0 rounded-[3px] border border-sunken px-2 py-1 font-mono text-[13px] leading-[1.45] text-ink-3 hover:bg-sunken hover:text-ink-2 ${className}`}
    >
      ? tour
    </button>
  );
}
