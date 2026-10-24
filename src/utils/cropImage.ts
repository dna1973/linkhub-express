import type { Area } from 'react-easy-crop';

/*
 * Operações de canvas da janela de recorte do avatar. Ficam fora do componente para os testes
 * simularem: no jsdom sem o pacote canvas, getContext('2d') devolve null e toBlob nunca responde.
 */

// Última imagem decodificada: a miniatura da remoção de fundo recorta a mesma src várias vezes
let cachedSrc: string | null = null;
let cachedImage: Promise<HTMLImageElement> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  if (cachedImage && cachedSrc === src) return cachedImage;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  cachedSrc = src;
  cachedImage = promise;
  // Carga que falhou não fica guardada: a próxima chamada tenta de novo
  promise.catch(() => {
    if (cachedImage === promise) clearImageCache();
  });
  return promise;
}

function clearImageCache(): void {
  cachedSrc = null;
  cachedImage = null;
}

/** Esquece a última imagem decodificada (para isolar os testes). */
export function resetCropImageCacheForTests(): void {
  clearImageCache();
}

/** Gira a imagem e recorta a área escolhida, no tamanho original do recorte. */
export async function getCroppedCanvas(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc);

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // Caixa que contém a imagem girada
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  // Desenha a imagem inteira, girada, num canvas auxiliar
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotatedWidth;
  rotCanvas.height = rotatedHeight;
  const rotCtx = rotCanvas.getContext('2d')!;

  rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Recorta do canvas girado
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas;
}

/** Reduz para caber em maxSize × maxSize, mantendo a proporção. Nunca amplia: se já cabe, devolve o mesmo canvas. */
export function scaleCanvas(canvas: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const scale = maxSize / Math.max(canvas.width, canvas.height);
  if (scale >= 1) return canvas;

  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(canvas.width * scale));
  out.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/**
 * JPEG não tem transparência: sem um fundo, os pixels transparentes saem pretos. Isso acontece ao
 * recortar de novo, sem remoção, um avatar PNG que já está sem fundo. A cópia ganha branco por baixo.
 */
function flattenOnWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const source = type === 'image/jpeg' ? flattenOnWhite(canvas) : canvas;
    source.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, type, quality);
  });
}
