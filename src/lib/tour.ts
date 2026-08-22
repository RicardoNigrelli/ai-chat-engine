'use client';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const SEEN_KEY = 'chat-general:tour-seen';

/**
 * Recorrido de onboarding: qué es cada parte de la pantalla, para alguien
 * que llega sin contexto (portafolio público). Los selectores apuntan a ids
 * puestos a propósito en page.tsx/Chat.tsx — si se renombra un elemento acá
 * también hay que actualizar el id correspondiente.
 */
function buildDriver() {
  return driver({
    showProgress: true,
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Atrás',
    doneBtnText: 'Listo',
    progressText: '{{current}}/{{total}}',
    overlayColor: 'var(--ink)',
    popoverClass: 'chat-general-tour',
    steps: [
      {
        element: '#tour-header',
        popover: {
          title: 'chat-general',
          description:
            'Motor de chat con IA: tool calling + RAG. Esta es una pieza de portafolio — la maquinaria completa queda a la vista, no escondida.',
        },
      },
      {
        element: '#tour-input',
        popover: {
          title: 'Escribí acá',
          description:
            'Preguntá lo que sea: cálculos, fecha/hora, leer una URL, buscar en la web, o consultar la base de conocimiento.',
        },
      },
      {
        element: '#tour-trace',
        popover: {
          title: 'Traza de ejecución',
          description:
            'Cada vez que el asistente usa una herramienta, queda registrado acá: qué tool, con qué input, qué devolvió y cuánto tardó — en vivo, mientras responde.',
          side: 'left',
        },
      },
      {
        element: '#tour-knowledge',
        popover: {
          title: 'Subí tus propios documentos',
          description:
            'Cargá un .txt o .md (hasta 20.000 caracteres) y preguntale al chat sobre su contenido — queda solo en tu sesión, nadie más lo ve.',
        },
      },
    ],
  });
}

export function startTour(): void {
  if (typeof window === 'undefined') return;
  buildDriver().drive();
  window.localStorage.setItem(SEEN_KEY, '1');
}

export function startTourIfFirstVisit(): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(SEEN_KEY)) return;
  startTour();
}
