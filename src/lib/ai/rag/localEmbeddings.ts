import os from 'node:os';
import path from 'node:path';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

/**
 * Embeddings 100% locales vía transformers.js (ONNX + WASM/onnxruntime-node).
 * No pega a ninguna API — corre en el mismo proceso de Node, así que no
 * necesita API key ni cuesta un centavo. Ideal para RAG en un prototipo
 * (OpenRouter no tiene embeddings gratis).
 *
 * Modelo: paraphrase-multilingual-MiniLM-L12-v2 (384 dims), soporta español
 * y ~50 idiomas más. Se descarga una sola vez (~470MB) a
 * ~/.cache/huggingface/hub/ la primera vez que se usa; después queda cacheado
 * y corre offline.
 */
const MODEL_ID = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(({ pipeline, env }) => {
      // Por defecto transformers.js cachea el modelo descargado adentro de
      // node_modules/ — de solo lectura en una función serverless de Vercel
      // ("ENOENT: no such file or directory, mkdir '.../node_modules/
      // @huggingface/transformers/.cache'", confirmado en producción). El
      // único directorio escribible ahí es el temporal del SO — `os.tmpdir()`
      // resuelve bien tanto en Vercel (/tmp) como en dev local (Windows/Mac/
      // Linux), así que sirve para los dos casos sin ramificar por entorno.
      env.cacheDir = path.join(os.tmpdir(), 'chat-general-transformers-cache');
      console.log(`[localEmbeddings] Cargando modelo ${MODEL_ID} (primera vez puede tardar, se descarga y cachea)...`);
      return pipeline('feature-extraction', MODEL_ID);
    });
  }
  return extractorPromise;
}

/** Embedea muchos textos de una (más eficiente que llamar embedText en loop). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  return output.tolist() as number[][];
}

/** Embedea un solo texto (ej. la query de una búsqueda). */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
