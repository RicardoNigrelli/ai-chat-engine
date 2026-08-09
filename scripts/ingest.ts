/**
 * CLI para ingestar documentos a la base de conocimiento (RAG).
 *
 * Uso:
 *   npm run ingest -- ./knowledge
 *   npm run ingest -- ./algun-archivo.md
 *
 * Lee archivos .txt/.md (recursivamente si es una carpeta) y los pasa por
 * ingestText(). Para PDFs u otros formatos, convertí a texto primero (por
 * ejemplo con la skill de pdf) y después apuntá este script a esa carpeta.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { ingestText } from '../src/lib/ai/rag/ingest';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md']);

async function collectFiles(target: string): Promise<string[]> {
  const stats = await stat(target);
  if (stats.isFile()) return [target];

  const entries = await readdir(target, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Uso: npm run ingest -- <archivo-o-carpeta>');
    process.exit(1);
  }

  const files = await collectFiles(path.resolve(target));
  if (files.length === 0) {
    console.log('No se encontraron archivos .txt/.md para ingestar.');
    return;
  }

  for (const file of files) {
    const text = await readFile(file, 'utf-8');
    // Guardamos un source relativo (no el path absoluto de tu máquina) para
    // que se vea prolijo cuando el agente lo cita en las respuestas.
    const source = path.relative(process.cwd(), file).split(path.sep).join('/');
    const { chunks } = await ingestText(text, source);
    console.log(`Ingestado: ${source} (${chunks} chunks)`);
  }

  console.log(`\nListo. ${files.length} documento(s) ingestado(s).`);
}

main().catch(error => {
  console.error('Error durante la ingesta:', error);
  process.exit(1);
});
