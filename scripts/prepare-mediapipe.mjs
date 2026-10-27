// Prepara os arquivos do MediaPipe que o próprio domínio serve para a remoção de fundo do avatar:
// o motor WASM (copiado de node_modules) e o modelo de segmentação (baixado uma vez).
//
// Roda sozinho antes de `npm run dev` ("predev") e de `npm run build` ("prebuild").
// O `npm run build:dev` (vite build --mode development) NÃO aciona o "prebuild": se precisar dele,
// rode `node scripts/prepare-mediapipe.mjs` antes.
//
// No `npm run dev`, uma falha só avisa no console: a remoção de fundo fica indisponível, o resto funciona.
// No `npm run build` (ou com REQUIRE_MEDIAPIPE=1), a falha derruba o build: um dist sem o modelo,
// publicado por cima do servidor, apagaria a remoção de fundo em produção sem ninguém notar.
// SKIP_MEDIAPIPE=1 continua pulando tudo, de propósito, também no build.
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// Mesma versão do package.json (sem ^) e de MEDIAPIPE_VERSION em src/utils/backgroundRemoval.ts
const VERSION = '1.1.1';
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];
const MODEL_NAME = 'selfie_multiclass_256x256.tflite';
const MODEL_SIZE = 16371837;
const MODEL_URL = `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/${MODEL_NAME}`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const targetDir = path.join(root, 'public', 'mediapipe', VERSION);

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return null;
  }
}

async function checkInstalledVersion() {
  try {
    const pkg = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
    if (pkg.version !== VERSION) {
      console.warn(`[mediapipe] node_modules tem @mediapipe/tasks-vision ${pkg.version}, mas o script espera ${VERSION}. Atualize VERSION aqui e em src/utils/backgroundRemoval.ts.`);
    }
  } catch {
    console.warn('[mediapipe] @mediapipe/tasks-vision não está instalado. Rode npm install.');
  }
}

async function copyWasm() {
  const sourceDir = path.join(packageDir, 'wasm');
  const destDir = path.join(targetDir, 'wasm');
  await mkdir(destDir, { recursive: true });
  let copied = 0;
  for (const name of WASM_FILES) {
    const source = path.join(sourceDir, name);
    const dest = path.join(destDir, name);
    const sourceSize = await sizeOf(source);
    if (sourceSize === null) throw new Error(`arquivo ausente em node_modules: ${name}`);
    // Só copia se faltar ou se o tamanho mudou: evita recopiar ~26 MB a cada npm run dev
    if ((await sizeOf(dest)) === sourceSize) continue;
    await copyFile(source, dest);
    copied += 1;
  }
  console.log(`[mediapipe] motor: ${copied} arquivo(s) copiado(s), ${WASM_FILES.length - copied} já em dia.`);
}

async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch (error) {
    // Pasta temporária em outro disco: rename não atravessa sistemas de arquivos
    if (error.code !== 'EXDEV') throw error;
    await copyFile(from, to);
    await rm(from, { force: true });
  }
}

async function downloadModel() {
  const destDir = path.join(targetDir, 'models');
  const dest = path.join(destDir, MODEL_NAME);
  if ((await sizeOf(dest)) === MODEL_SIZE) {
    console.log('[mediapipe] modelo já baixado.');
    return;
  }

  // Baixa fora de public/: um download interrompido não pode virar arquivo corrompido nem subir no dist
  const temp = path.join(os.tmpdir(), `linkhub-${MODEL_NAME}.${process.pid}.part`);
  console.log(`[mediapipe] baixando o modelo (${(MODEL_SIZE / 1024 / 1024).toFixed(1)} MB)...`);
  // Dois prazos: 60 s até a resposta começar (proxy que segura a conexão não prende o npm run dev)
  // e 15 min para o corpo (16 MB a ~20 KB/s). Um prazo só para tudo derrubava conexões lentas.
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(new Error('sem resposta em 60 s')), 60 * 1000);
  try {
    const response = await fetch(MODEL_URL, { signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error('download passou de 15 min')), 15 * 60 * 1000);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temp), { signal: controller.signal });
    const size = await sizeOf(temp);
    if (size !== MODEL_SIZE) throw new Error(`tamanho ${size}, esperado ${MODEL_SIZE}`);
    await mkdir(destDir, { recursive: true });
    await rm(dest, { force: true });
    await moveFile(temp, dest);
    console.log('[mediapipe] modelo pronto.');
  } finally {
    clearTimeout(timer);
    await rm(temp, { force: true });
  }
}

// Lista o que falta em public/mediapipe/: arquivo ausente ou modelo com tamanho diferente
async function missingFiles() {
  const missing = [];
  for (const name of WASM_FILES) {
    if ((await sizeOf(path.join(targetDir, 'wasm', name))) === null) missing.push(`wasm/${name}`);
  }
  if ((await sizeOf(path.join(targetDir, 'models', MODEL_NAME))) !== MODEL_SIZE) missing.push(`models/${MODEL_NAME}`);
  return missing;
}

async function main() {
  // SKIP_MEDIAPIPE=1 pula cópia e download (máquina sem internet ou build rápido); a remoção de fundo fica indisponível
  if (process.env.SKIP_MEDIAPIPE === '1') {
    console.log('[mediapipe] SKIP_MEDIAPIPE=1: pulando preparo do MediaPipe.');
    return;
  }
  await checkInstalledVersion();
  try {
    await copyWasm();
  } catch (error) {
    console.warn(`[mediapipe] não foi possível copiar o motor: ${error.message}. A remoção de fundo ficará indisponível.`);
  }
  try {
    await downloadModel();
  } catch (error) {
    console.warn(`[mediapipe] não foi possível baixar o modelo: ${error.message}. A remoção de fundo ficará indisponível.`);
  }

  const strict = process.env.npm_lifecycle_event === 'prebuild' || process.env.REQUIRE_MEDIAPIPE === '1';
  if (!strict) return;
  const missing = await missingFiles();
  if (missing.length > 0) {
    console.error(`[mediapipe] build interrompido: faltam ${missing.join(', ')} em public/mediapipe/${VERSION}/.`);
    console.error('[mediapipe] Rode de novo com internet, ou use SKIP_MEDIAPIPE=1 para gerar um build sem a remoção de fundo.');
    process.exitCode = 1;
  }
}

await main();
