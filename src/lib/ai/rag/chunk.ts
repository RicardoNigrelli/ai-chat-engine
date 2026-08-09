/**
 * Divide texto en chunks con overlap, respetando saltos de párrafo cuando es
 * posible. Suficiente para RAG genérico (markdown, texto plano, PDFs ya
 * convertidos a texto). No requiere dependencias externas.
 */
export function chunkText(
  text: string,
  { chunkSize = 800, overlap = 150 }: { chunkSize?: number; overlap?: number } = {},
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length <= chunkSize) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= chunkSize) {
      current = paragraph;
    } else {
      // Párrafo más largo que chunkSize: lo partimos por caracteres con overlap.
      for (let i = 0; i < paragraph.length; i += chunkSize - overlap) {
        chunks.push(paragraph.slice(i, i + chunkSize));
      }
      current = '';
    }
  }

  if (current) chunks.push(current);

  return chunks;
}
