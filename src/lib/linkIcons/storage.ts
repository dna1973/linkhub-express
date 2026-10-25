import { canvasToBlob } from '@/utils/cropImage';
import { LINK_ICON_UPLOAD_PATH_RE, LINK_ICONS_PUBLIC_PREFIX } from './storagePrefix';

/*
 * Validação, conversão de SVG e caminhos dos ícones enviados pelos donos dos links.
 * Não importa @/lib/supabase: o upload em si fica nos componentes que gravam.
 */

export const LINK_ICON_MAX_BYTES = 512 * 1024;
/** Teto do arquivo SVG antes de ler: o PNG convertido ainda é conferido contra LINK_ICON_MAX_BYTES. */
export const LINK_ICON_SVG_MAX_BYTES = 1024 * 1024;
export const LINK_ICON_SIZE = 256;
const LOAD_IMAGE_TIMEOUT_MS = 10_000;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const ERROR_TYPE = 'Use PNG, WebP ou SVG';
const ERROR_SIZE = 'A imagem deve ter no máximo 512 KB';
const ERROR_SVG_SIZE = 'O SVG deve ter no máximo 1 MB';
const ERROR_READ_SVG = 'Não foi possível ler este SVG';
const ERROR_CONVERT_SVG = 'Não foi possível converter este SVG';
const ERROR_READ_IMAGE = 'Não foi possível ler esta imagem';

export type IconFileKind = 'png' | 'webp' | 'svg';

export type IconFileValidation = { ok: true; kind: IconFileKind } | { ok: false; error: string };

/** Imagem decodificada: no navegador é um HTMLImageElement; nos testes, um objeto com width/height. */
export interface LoadedImage {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type LoadImage = (src: string) => Promise<LoadedImage>;

export interface PreparedIconUpload {
  blob: Blob;
  ext: 'png' | 'webp';
  contentType: string;
}

/**
 * Caminho do arquivo no bucket a partir da URL pública, só se for do próprio usuário e no mesmo formato
 * que o app grava (LINK_ICON_UPLOAD_PATH_RE), para validação e exclusão aceitarem exatamente o mesmo.
 * Devolve null para outro usuário, outro bucket, URL de fora do storage ou caminho fora do formato.
 */
export function linkIconPathFromUrl(
  url: string | null | undefined,
  userId: string,
  publicPrefix: string = LINK_ICONS_PUBLIC_PREFIX
): string | null {
  if (!url || !userId || !publicPrefix || !url.startsWith(publicPrefix)) return null;

  // Sem decodificar nem cortar ?/#: a regex do upload já recusa %, ?, #, \ e ..
  const path = url.slice(publicPrefix.length);
  if (!LINK_ICON_UPLOAD_PATH_RE.test(path) || !path.startsWith(`${userId}/`)) return null;
  return path;
}

const MIME_KINDS: Record<string, IconFileKind> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const EXTENSION_KINDS: Record<string, IconFileKind> = {
  png: 'png',
  webp: 'webp',
  svg: 'svg',
};

function kindOf(file: File): IconFileKind | null {
  const mime = (file.type || '').toLowerCase();
  // file.type às vezes vem vazio (ou genérico): aí vale a extensão
  if (mime && mime !== 'application/octet-stream') return MIME_KINDS[mime] ?? null;
  const ext = (file.name || '').toLowerCase().split('.').pop() ?? '';
  return EXTENSION_KINDS[ext] ?? null;
}

/** Tipo pelo MIME, com reserva na extensão. PNG/WebP até 512 KB; SVG até 1 MB (o PNG convertido é conferido depois). */
export function validateIconFile(file: File): IconFileValidation {
  const kind = kindOf(file);
  if (!kind) return { ok: false, error: ERROR_TYPE };
  if (kind === 'svg') {
    if (file.size > LINK_ICON_SVG_MAX_BYTES) return { ok: false, error: ERROR_SVG_SIZE };
  } else if (file.size > LINK_ICON_MAX_BYTES) {
    return { ok: false, error: ERROR_SIZE };
  }
  return { ok: true, kind };
}

function parseSvgRoot(svgText: string): Element | null {
  if (!svgText) return null;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  // O jsdom devolve <parsererror> como raiz; o Chrome o insere dentro da raiz
  if (!root || root.localName !== 'svg' || root.namespaceURI !== SVG_NAMESPACE) return null;
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return root;
}

function parseSvgNumber(value: string | null, allowPx = false): number | null {
  if (value == null) return null;
  const pattern = allowPx ? /^\s*([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:px)?\s*$/i : /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*$/i;
  const match = pattern.exec(value);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

interface SvgAspect {
  width: number;
  height: number;
  source: 'viewBox' | 'size' | 'none';
}

function aspectOfRoot(root: Element | null): SvgAspect {
  if (root) {
    const viewBox = root.getAttribute('viewBox');
    if (viewBox != null) {
      const parts = viewBox.trim().split(/[\s,]+/).map((part) => parseSvgNumber(part));
      if (parts.length === 4 && parts.every((n) => n != null) && parts[2] > 0 && parts[3] > 0) {
        return { width: parts[2], height: parts[3], source: 'viewBox' };
      }
    }

    const width = parseSvgNumber(root.getAttribute('width'), true);
    const height = parseSvgNumber(root.getAttribute('height'), true);
    if (width != null && height != null && width > 0 && height > 0) return { width, height, source: 'size' };
  }
  return { width: 1, height: 1, source: 'none' };
}

/** Largura e altura do SVG: viewBox válido; senão width/height numéricos da raiz; senão 1:1. */
export function getSvgAspect(svgText: string): { width: number; height: number } {
  const { width, height } = aspectOfRoot(parseSvgRoot(svgText));
  return { width, height };
}

function prepareSvg(svgText: string, size: number): { svg: string; width: number; height: number } {
  const root = parseSvgRoot(svgText);
  if (!root) throw new Error(ERROR_READ_SVG);

  const aspect = aspectOfRoot(root);
  const width = aspect.width >= aspect.height ? size : Math.max(1, Math.round((size * aspect.width) / aspect.height));
  const height = aspect.height >= aspect.width ? size : Math.max(1, Math.round((size * aspect.height) / aspect.width));

  // Sem viewBox, trocar width/height só aumentaria a área: o desenho ficaria no canto, no tamanho antigo
  if (aspect.source === 'size') root.setAttribute('viewBox', `0 0 ${aspect.width} ${aspect.height}`);
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));

  return { svg: new XMLSerializer().serializeToString(root.ownerDocument), width, height };
}

/**
 * Grava width/height explícitos na raiz (lado maior = size, o outro pela proporção).
 * SVG sem tamanho intrínseco não é desenhado no canvas pelo Firefox.
 */
export function prepareSvgForRaster(svgText: string, size = LINK_ICON_SIZE): string {
  return prepareSvg(svgText, size).svg;
}

// O jsdom 25 não tem Blob.text()/File.text(): o FileReader funciona nos dois
function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error(ERROR_READ_SVG));
    reader.readAsText(file);
  });
}

/** Carrega a imagem; desiste em 10 s (imagem que nunca termina de decodificar não trava o upload). */
function defaultLoadImage(src: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(ERROR_READ_IMAGE));
    }, LOAD_IMAGE_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error(ERROR_READ_IMAGE));
    };
    image.src = src;
  });
}

function imageSize(image: LoadedImage): { width: number; height: number } {
  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
}

/**
 * SVG → PNG no navegador. O SVG desenhado como imagem não executa script nem carrega recursos externos.
 * Carrega sempre por objectURL blob: (nunca data:) e a revoga no fim.
 */
export async function rasterizeSvgToPng(file: Blob, size = LINK_ICON_SIZE, loadImage: LoadImage = defaultLoadImage): Promise<Blob> {
  if (file.size > LINK_ICON_SVG_MAX_BYTES) throw new Error(ERROR_SVG_SIZE);
  let text: string;
  try {
    text = await readFileAsText(file);
  } catch {
    throw new Error(ERROR_READ_SVG);
  }
  const { svg, width, height } = prepareSvg(text, size);

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(ERROR_CONVERT_SVG);
    ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, width, height);
    // SecurityError (canvas sujo) e blob null caem no catch
    return await canvasToBlob(canvas, 'image/png');
  } catch {
    throw new Error(ERROR_CONVERT_SVG);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * PNG/WebP são sempre reencodados no tipo original quando há canvas 2D, o que tira EXIF/GPS antes do
 * bucket público. Acima de 256 px, o lado maior vira 256 px. Desenha direto no canvas final: um canvas
 * do tamanho original falha em silêncio no iOS acima de ~16,7 MP. Sem canvas 2D ou com toBlob null,
 * vai o arquivo original.
 */
async function reencodeRaster(file: File, contentType: string, loadImage: LoadImage): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    let image: LoadedImage;
    try {
      image = await loadImage(url);
    } catch {
      throw new Error(ERROR_READ_IMAGE);
    }

    const { width, height } = imageSize(image);
    const scale = Math.min(1, LINK_ICON_SIZE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, canvas.width, canvas.height);

    try {
      return await canvasToBlob(canvas, contentType);
    } catch {
      // O original já passou pelo limite de 512 KB: serve como está
      return file;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prepara o arquivo para o upload: valida, converte SVG em PNG de 256 px (conferido contra 512 KB)
 * e reencoda PNG/WebP (reduzidos para 256 px quando maiores). Erros saem como Error com a mensagem para o usuário.
 */
export async function prepareIconUpload(
  file: File,
  { loadImage = defaultLoadImage }: { loadImage?: LoadImage } = {}
): Promise<PreparedIconUpload> {
  const check = validateIconFile(file);
  if (check.ok === false) throw new Error(check.error);

  if (check.kind === 'svg') {
    const blob = await rasterizeSvgToPng(file, LINK_ICON_SIZE, loadImage);
    if (blob.size > LINK_ICON_MAX_BYTES) throw new Error(ERROR_SIZE);
    return { blob, ext: 'png', contentType: 'image/png' };
  }

  const contentType = `image/${check.kind}`;
  const blob = await reencodeRaster(file, contentType, loadImage);
  // Navegador sem codificador WebP no canvas (Safari) devolve PNG: o tipo acompanha o que saiu
  if (blob !== file && blob.type === 'image/png' && contentType !== 'image/png') {
    return { blob, ext: 'png', contentType: 'image/png' };
  }
  return { blob, ext: check.kind, contentType };
}
