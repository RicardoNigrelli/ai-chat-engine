import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // transformers.js (embeddings locales de RAG) usa onnxruntime-node, que
  // trae binarios nativos — no lo empaquetamos, lo dejamos como dependencia
  // externa de Node normal.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
};

export default nextConfig;
