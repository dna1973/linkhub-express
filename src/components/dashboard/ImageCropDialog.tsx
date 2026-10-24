import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Eraser, Loader2, RotateCcw, ZoomIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { canvasToBlob, getCroppedCanvas, scaleCanvas } from '@/utils/cropImage';
import { AVATAR_MAX_SIZE, loadSegmenter, removeBackground } from '@/utils/backgroundRemoval';
import { normalizeHex } from '@/utils/linkButtonStyle';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  /** JPEG sem remoção de fundo; PNG com remoção. O tipo do blob diz a extensão. */
  onCropComplete: (croppedBlob: Blob) => void;
  /** Abre com "Remover fundo" já ligado (botão "Remover fundo" da foto atual) */
  initialRemoveBackground?: boolean;
  /** Cores do tema para os atalhos de "Atrás da pessoa" */
  themeColors?: { background: string; button: string };
}

const BACKGROUND_REMOVAL_ERROR = 'Não foi possível remover o fundo neste navegador.';
const PREVIEW_SIZE = 256;
const PREVIEW_DELAY_MS = 300;

// Xadrez que mostra a transparência da miniatura
const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage: 'conic-gradient(#d4d4d8 25%, transparent 0 50%, #d4d4d8 0 75%, transparent 0)',
  backgroundSize: '16px 16px',
};

type SegmenterStatus = 'idle' | 'loading' | 'ready';
type BackgroundMode = 'transparent' | 'color';

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  initialRemoveBackground = false,
  themeColors,
}) => {
  const { toast } = useToast();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [removeBg, setRemoveBg] = useState(false);
  const [segmenterStatus, setSegmenterStatus] = useState<SegmenterStatus>('idle');
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPending, setIsPreviewPending] = useState(false);

  const shortcuts = useMemo(() => {
    const candidates = [
      { label: 'Fundo do tema', color: normalizeHex(themeColors?.background) },
      { label: 'Botão do tema', color: normalizeHex(themeColors?.button) },
      { label: 'Branco', color: '#ffffff' },
    ];
    // Atalho inválido não aparece; cor repetida aparece uma vez só
    return candidates.filter(
      (item, index) => item.color && candidates.findIndex((other) => other.color === item.color) === index,
    );
  }, [themeColors?.background, themeColors?.button]);
  const [fillColor, setFillColor] = useState<string>(() => shortcuts[0]?.color ?? '#ffffff');

  const fill = backgroundMode === 'color' ? normalizeHex(fillColor) : null;
  const isBackgroundReady = removeBg && segmenterStatus === 'ready';

  const mountedRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);

  const replacePreviewUrl = useCallback((url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
  }, []);

  const showBackgroundError = useCallback(() => {
    toast({ title: 'Erro', description: BACKGROUND_REMOVAL_ERROR, variant: 'destructive' });
  }, [toast]);

  const turnOffRemoveBackground = useCallback(() => {
    setRemoveBg(false);
    replacePreviewUrl(null);
  }, [replacePreviewUrl]);

  const turnOnRemoveBackground = useCallback(async () => {
    setRemoveBg(true);
    setSegmenterStatus('loading');
    try {
      // Na primeira vez baixa motor e modelo; depois o segmentador já está guardado no módulo
      await loadSegmenter();
      if (mountedRef.current) setSegmenterStatus('ready');
    } catch (err) {
      console.error('Background removal load error:', err);
      if (!mountedRef.current) return;
      setSegmenterStatus('idle');
      turnOffRemoveBackground();
      showBackgroundError();
    }
  }, [showBackgroundError, turnOffRemoveBackground]);

  useEffect(() => {
    if (initialRemoveBackground) turnOnRemoveBackground();
    // Só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Miniatura do resultado, recalculada 300 ms depois da última mudança de recorte, zoom, rotação ou fundo
  useEffect(() => {
    if (!isBackgroundReady || !croppedAreaPixels) {
      setIsPreviewPending(false);
      return;
    }
    setIsPreviewPending(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const cropped = await getCroppedCanvas(imageSrc, croppedAreaPixels, rotation);
        const result = await removeBackground(scaleCanvas(cropped, PREVIEW_SIZE), fill);
        const blob = await canvasToBlob(result, 'image/png');
        if (cancelled) return;
        replacePreviewUrl(URL.createObjectURL(blob));
        setIsPreviewPending(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Background removal preview error:', err);
        setIsPreviewPending(false);
        turnOffRemoveBackground();
        showBackgroundError();
      }
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isBackgroundReady, croppedAreaPixels, rotation, fill, imageSrc, replacePreviewUrl, turnOffRemoveBackground, showBackgroundError]);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const canvas = await getCroppedCanvas(imageSrc, croppedAreaPixels, rotation);
      let croppedBlob: Blob;
      if (removeBg) {
        try {
          const result = await removeBackground(scaleCanvas(canvas, AVATAR_MAX_SIZE), fill);
          croppedBlob = await canvasToBlob(result, 'image/png');
        } catch (err) {
          // Mantém a janela aberta: o usuário pode desligar a remoção e aplicar o recorte normal
          console.error('Background removal error:', err);
          showBackgroundError();
          return;
        }
      } else {
        croppedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      }
      onCropComplete(croppedBlob);
    } catch (err) {
      console.error('Crop error:', err);
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const isSegmenterLoading = segmenterStatus === 'loading';

  const handleRemoveBgChange = (checked: boolean) => {
    // Durante o carregamento o interruptor fica aria-disabled (e não disabled, para não perder o foco)
    if (isSegmenterLoading) return;
    if (checked) turnOnRemoveBackground();
    else turnOffRemoveBackground();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Recortar Imagem</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <ZoomIn className="h-3 w-3" /> Zoom
              </Label>
              <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              min={1}
              max={3}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Rotação
              </Label>
              <span className="text-xs text-muted-foreground">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={(v) => setRotation(v[0])}
              min={0}
              max={360}
              step={1}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="remove-background" className="text-xs flex items-center gap-1">
                <Eraser className="h-3 w-3" /> Remover fundo
              </Label>
              <Switch
                id="remove-background"
                checked={removeBg}
                aria-disabled={isSegmenterLoading || undefined}
                onCheckedChange={handleRemoveBgChange}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              />
            </div>

            {/* Sempre montada: o leitor de tela só anuncia mudanças numa região que já existia */}
            <div role="status" aria-live="polite" className="!mt-0">
              {removeBg && isSegmenterLoading && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
                  Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)
                </p>
              )}
              {isBackgroundReady && isPreviewPending && <span className="sr-only">Calculando prévia…</span>}
            </div>

            {isBackgroundReady && (
              <div className="flex items-start gap-4">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60"
                  style={CHECKERBOARD_STYLE}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Prévia sem fundo" className="h-full w-full object-cover" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Label id="background-mode-label" className="text-xs">
                    Atrás da pessoa
                  </Label>
                  <div role="group" aria-labelledby="background-mode-label" className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={backgroundMode === 'transparent' ? 'default' : 'outline'}
                      aria-pressed={backgroundMode === 'transparent'}
                      onClick={() => setBackgroundMode('transparent')}
                    >
                      Transparente
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={backgroundMode === 'color' ? 'default' : 'outline'}
                      aria-pressed={backgroundMode === 'color'}
                      onClick={() => setBackgroundMode('color')}
                    >
                      Cor
                    </Button>
                  </div>

                  {backgroundMode === 'color' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Cor atrás da pessoa"
                        value={normalizeHex(fillColor) ?? '#ffffff'}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                      />
                      {shortcuts.map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          title={item.label}
                          aria-label={`${item.label} (${item.color})`}
                          onClick={() => setFillColor(item.color!)}
                          className="h-7 w-7 rounded-full border border-border/60"
                          style={{ backgroundColor: item.color! }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isSegmenterLoading}>
              {isSaving ? 'Salvando...' : 'Aplicar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
