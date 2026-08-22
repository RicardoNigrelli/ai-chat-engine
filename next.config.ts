import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // transformers.js (embeddings locales de RAG) usa onnxruntime-node, que
  // trae binarios nativos — no lo empaquetamos, lo dejamos como dependencia
  // externa de Node normal.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
  // `serverExternalPackages` evita que se bundlee el JS, pero el tracer de
  // archivos de Next (@vercel/nft) igual decide QUÉ archivos copia a la
  // función serverless — y su análisis estático no ve el `require()`
  // dinámico que carga el binario nativo (.so/.node) de onnxruntime-node, así
  // que lo dejaba afuera del deploy real (funcionaba en dev porque ahí corre
  // contra el filesystem completo del repo, no una función empaquetada).
  // Confirmado en producción: "libonnxruntime.so.1: cannot open shared
  // object file" — se fuerza la inclusión acá.
  outputFileTracingIncludes: {
    '/api/knowledge/upload': ['./node_modules/onnxruntime-node/**'],
    '/api/chat': ['./node_modules/onnxruntime-node/**'],
  },
};

export default nextConfig;
