'use client';

import { useEffect, useState } from 'react';

/**
 * Indicador de "pensando/respondiendo" — anillo que gira + segundos que
 * cuentan en vivo, mismo vocabulario de motion que el count-up de duración
 * de una tool (§9 motion #4). El contador arranca al montar (mismo instante
 * en que `isBusy` pasa a true, ver Chat.tsx), así que mide de verdad.
 */
export function ThinkingIndicator({ status }: { status: 'submitted' | 'streaming' }) {
  const [start] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [start]);

  const label = status === 'submitted' ? 'pensando' : 'respondiendo';

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="anim-spin inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-sunken border-t-ink-3"
        aria-hidden
      />
      <span className="tabular-nums">{seconds}s</span>
      <span>· {label}</span>
    </span>
  );
}
