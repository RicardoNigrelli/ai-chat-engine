# chat-general

Motor de chat con IA reusable: tools configurables, RAG genérico y soporte
multi-proveedor de modelos (OpenCode Zen + OpenRouter), pensado para poder
embeberse en múltiples aplicaciones en vez de ser una app monolítica.

**Problema que resuelve:** la mayoría de los starters de chat con IA acoplan
la lógica del agente a una sola app. Este motor separa `lib/ai/*` de la UI
para poder copiarlo (o extraerlo a paquete interno) a cualquier proyecto
Next.js nuevo sin reescribir nada, con RAG y multi-modelo ya resueltos y
probados en vivo (no solo "la doc dice que soporta X").

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript ·
[Vercel AI SDK](https://ai-sdk.dev) (`ToolLoopAgent`) · Zod · Tailwind CSS ·
embeddings locales con `@huggingface/transformers` (sin base de datos, sin
API key obligatoria) · proveedores de modelos: OpenCode Zen y OpenRouter.

## Arquitectura

```
src/
  lib/ai/
    models.ts          # registro de modelos (OpenCode Zen + OpenRouter)
    agents/
      chatAgent.ts      # el ToolLoopAgent: instructions + tools + modelo
    tools/
      index.ts          # registro central de tools — agregar tools acá
      calculator.ts
      dateTime.ts
      webPage.ts        # lee una URL puntual
      webSearch.ts       # búsqueda web (requiere TAVILY_API_KEY)
      knowledgeBase.ts   # RAG: busca en la base de conocimiento
    rag/
      store.ts          # vector store (JSON local por defecto, swappeable)
      localEmbeddings.ts # embeddings 100% locales (transformers.js, sin API)
      ingest.ts          # chunking + embeddings + guardado
      retrieve.ts         # búsqueda semántica
  components/chat/
    Chat.tsx             # widget de chat reusable (useChat + tool rendering)
    MessageBubble.tsx
    ToolPart.tsx          # render genérico de cualquier tool call
  app/
    api/chat/route.ts     # endpoint que expone el agente al widget
    page.tsx               # demo: monta <Chat />
scripts/ingest.ts          # CLI para cargar documentos al RAG
knowledge/                  # documentos de ejemplo para el RAG
```

La idea de esta separación: `lib/ai/*` no depende de Next.js más que para el
runtime del endpoint. Podés copiar esa carpeta a otro proyecto Next.js, o
extraerla a un paquete interno (`@tu-org/chat-engine`) cuando tengas más de
una app usándola, sin reescribir nada.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrí `http://localhost:3000`. **No hace falta ninguna API key** para probarlo:
el modelo por defecto (`big-pickle`, de [OpenCode Zen](https://opencode.ai/docs/zen/))
es gratis y no pide autenticación, y los embeddings de RAG corren 100% local.
Todo el motor —chat + tools + RAG— funciona de punta a punta sin cargar
ningún crédito.

Si más adelante querés más variedad de modelos, agregá `OPENROUTER_API_KEY`
(gratis en [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys))
y elegí cualquier `id` de `CHAT_MODELS` en `src/lib/ai/models.ts`.

## Cómo agregar una tool nueva

1. Creá `src/lib/ai/tools/mi-tool.ts`:

```ts
import { tool } from 'ai';
import { z } from 'zod';

export const miTool = tool({
  description: 'Explicale al modelo cuándo y para qué usar esto.',
  inputSchema: z.object({ algo: z.string() }),
  execute: async ({ algo }) => {
    // tu lógica acá — puede llamar una API, leer una DB, lo que sea
    return { resultado: algo };
  },
});
```

2. Registrala en `src/lib/ai/tools/index.ts`:

```ts
import { miTool } from './mi-tool';

export const tools = {
  // ...tools existentes
  miNombreDeTool: miTool,
};
```

Listo — el agente, la ruta de chat y la UI la levantan automáticamente (la UI
la renderiza con el componente genérico `ToolPart`; si querés una UI custom
para esa tool en particular, mirá el patrón `UIToolInvocation` en
[la doc de type-safe agents](https://ai-sdk.dev/docs/agents/building-agents)).

## Tools incluidas

| Tool | Qué hace | Requiere |
|---|---|---|
| `calculator` | Aritmética exacta (vía mathjs) | nada |
| `currentDateTime` | Fecha/hora real, con timezone | nada |
| `readWebPage` | Descarga una URL y devuelve texto plano | nada |
| `webSearch` | Búsqueda web con snippets | `TAVILY_API_KEY` |
| `knowledgeBaseSearch` | Búsqueda semántica en documentos propios (RAG) | documentos ingestados |

## RAG: cargar tus propios documentos

```bash
npm run ingest -- ./knowledge        # carpeta con .md/.txt
npm run ingest -- ./un-archivo.md    # o un archivo puntual
```

Esto chunkea el texto, genera embeddings **localmente** (sin API, sin costo —
ver `lib/ai/rag/localEmbeddings.ts`) y los guarda en `data/vector-store.json`.
El agente los encuentra automáticamente vía la tool `knowledgeBaseSearch`.

La primera vez que corras `npm run ingest` o hagas una pregunta que dispare
`knowledgeBaseSearch`, se descarga el modelo de embeddings
(`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, ~470MB, multilingüe —
soporta español) y queda cacheado en `~/.cache/huggingface/hub/`. Después de
esa descarga inicial, todo corre offline.

Para PDFs u otros formatos: convertí a texto primero y apuntá el script a esa
carpeta (por ejemplo con la skill de PDF de Claude, o `pdftotext`).

**Escalar el RAG**: `JsonFileVectorStore` (en `lib/ai/rag/store.ts`) alcanza
para prototipos y bases chicas/medianas. Cuando necesites más volumen o
multi-instancia, implementá la interfaz `VectorStore` contra pgvector,
Upstash Vector, Pinecone, etc. y cambiá `getVectorStore()` — el resto del
código (tools, agente, ingesta) no cambia.

## Cambiar de modelo

Todo pasa por `src/lib/ai/models.ts`: cada entrada de `CHAT_MODELS` tiene un
`id`, un `provider` (`opencode-zen` u `openrouter`), y dos flags verificados
en vivo (no supuestos por el nombre del modelo):

- **`thinking`**: si el modelo emite razonamiento antes de responder.
- **`effort`** (`low`/`medium`/`high`): esfuerzo de razonamiento por
  defecto. **Solo tiene efecto real en modelos `thinking: true` de
  OpenRouter** — lo probé en vivo (`reasoning.effort: "low"` dio 6
  reasoning-tokens, `"high"` dio 115, en el mismo modelo/prompt). En
  OpenCode Zen probé el equivalente y **no lo respeta** (los números salían
  al revés — variación normal del modelo, no un control real), así que ahí
  el campo se ignora a propósito.

`getChatModelConfig()` arma el `model` + `providerOptions` correctos según
esos flags. `CHAT_MODEL` en el `.env` elige el modelo activo; `CHAT_EFFORT`
(opcional) pisa el effort por defecto de cualquier modelo thinking de
OpenRouter que uses.

Catálogo actual (los 6 vienen con tool-calling probado con una tool real,
no solo "la doc dice que soporta tools"):

| id | proveedor | thinking | effort configurable |
|---|---|---|---|
| `big-pickle` | opencode-zen | sí | no |
| `laguna-s-2.1-free` | opencode-zen | no | no |
| `deepseek-v4-flash-free` | opencode-zen | sí | no |
| `openai/gpt-oss-20b:free` | openrouter | sí | **sí** |
| `google/gemma-4-31b-it:free` | openrouter | no | no |
| `nvidia/nemotron-3-super-120b-a12b:free` | openrouter | sí | **sí** |

- **OpenCode Zen**: sin API key para los `-free`. Lista completa en
  [opencode.ai/docs/zen](https://opencode.ai/docs/zen/) o pegándole a
  `https://opencode.ai/zen/v1/models`.
- **OpenRouter**: necesita `OPENROUTER_API_KEY`, pero es donde `effort` es
  real. Modelos gratis actualizados en
  [openrouter.ai/models?max_price=0](https://openrouter.ai/models?max_price=0)
  (la lista rota seguido — antes de sumar uno nuevo, verificá tool-calling y
  thinking en vivo como se hizo acá, no asumas por el nombre). Para modelos
  pagos (Claude, GPT-5, Gemini, etc.) es el mismo mecanismo sin `:free`, y
  ahí sí conviene aprovechar `effort` (son los que de verdad escalan calidad
  con más esfuerzo).

Para modelos locales (Ollama, LM Studio) instalá el provider community
correspondiente (ej. `ollama-ai-provider-v2`) y usalo directamente como
`model` en `chatAgent.ts` en vez de `getChatModelConfig()`.

## Reusar esto en otra aplicación

- **Copiar y adaptar** (más simple, recomendado mientras sea 1-2 apps): copiá
  `src/lib/ai/` a la otra app Next.js, ajustá `instructions`/`tools` en
  `chatAgent.ts` para ese caso de uso, y montá `<Chat api="/api/chat" />` (o
  la ruta que corresponda) donde la necesites.
- **Extraer a paquete interno** (cuando sean 3+ apps): mové `src/lib/ai` y
  `src/components/chat` a un workspace de pnpm/npm (`packages/chat-engine`)
  y publicalo como paquete privado. La estructura ya está pensada para que
  ese movimiento sea mecánico.
