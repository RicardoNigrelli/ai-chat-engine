import { Chat } from '@/components/chat';
import { TourButton } from '@/components/chat/TourButton';

export default function Home() {
  return (
    <div className="flex h-dvh w-full flex-col">
      {/* Cabecera deliberadamente contenida: 20px / peso 500. Las dos
          referencias reales (Langfuse 35px/500, Braintrust 48px/400)
          jerarquizan por densidad, no por escala ni por negrita. */}
      <header className="bg-raised">
        <div className="mx-auto flex w-full max-w-[1000px] items-baseline">
          <span className="w-[72px] shrink-0 px-4 py-4 text-right font-mono text-[13px] leading-[1.45] text-ink-3">
            {'///'}
          </span>
          <div id="tour-header" className="flex min-w-0 flex-1 items-baseline gap-4 py-4 pl-4 pr-6">
            <h1 className="text-[20px] font-medium leading-[1.2] text-ink">chat-general</h1>
            <p className="font-mono text-[13px] leading-[1.45] text-ink-3">
              motor de chat · tools + RAG
            </p>
            <TourButton className="ml-auto" />
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Chat />
      </div>
    </div>
  );
}
