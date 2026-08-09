import { Chat } from '@/components/chat';

export default function Home() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">chat-general</h1>
        <p className="text-xs text-zinc-400">Prototipo de asistente con tools + RAG</p>
      </header>
      <Chat />
    </div>
  );
}
