import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Prosa, UI y controles. Ver DESIGN.md §4 — ninguna de las dos está en la
// lista de tipografías quemadas del registro del skill.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

// Registro de maquinaria: canaleta, nombres de tool, claves, valores, scores.
// Es funcional, no decorativo — no aparece en prosa ni en títulos.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "chat-general",
  description: "Motor de chat con IA reusable: tools configurables y RAG genérico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="es": el contenido es español. Estaba en "en" (regla H1).
    <html lang="es" className={`${instrumentSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
